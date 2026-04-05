import asyncio
import discord
import json
import os
from discord.ext import commands
from discord import app_commands
from logger import log, setup_logging
from config_loader import load_config
from database import Database
from core.monitor_manager import MonitorManager
from monitors.youtube_monitor import YouTubeMonitor
from monitors.tiktok_monitor import TikTokMonitor
from monitors.instagram_monitor import InstagramMonitor
from monitors.rss_monitor import RSSMonitor
from monitors.epic_games_monitor import EpicGamesMonitor
from monitors.steam_free_monitor import SteamFreeMonitor
from monitors.gog_free_monitor import GOGFreeMonitor
from monitors.reddit_monitor import RedditMonitor
from monitors.twitter_monitor import TwitterMonitor
from monitors.stream_monitor import StreamMonitor

class FeedBot(commands.Bot):
    def __init__(self, config, db):
        # Intents needed for basic bot functionality
        intents = discord.Intents.default()
        intents.message_content = True
        
        prefix = config.get("command_prefix", "!")
        super().__init__(command_prefix=prefix, intents=intents)
        self.config = config
        self.db = db
        self.monitor_manager = None
        self.language_data = {}

    async def setup_hook(self):
        """Perform initialization tasks before the bot connects."""
        # Load localization
        lang_code = self.config.get("language", "hu")
        lang_file = f"locales/{lang_code}.json"
        
        if os.path.exists(lang_file):
            try:
                with open(lang_file, "r", encoding="utf-8") as f:
                    self.language_data = json.load(f)
                log.info(f"Loaded language: {lang_code}")
            except Exception as e:
                log.error(f"Failed to load language file {lang_file}: {e}")
        
        # Initialize Monitor Manager
        self.monitor_manager = MonitorManager(self, self.config, self.db)
        
        # Load monitors from config
        monitors_config = self.config.get("monitors", [])
        for m_config in monitors_config:
            monitor = self.create_monitor_instance(m_config)
            if monitor:
                self.monitor_manager.add_monitor(monitor)
            else:
                log.warning(f"Unknown monitor type in config: {m_config.get('type')}")

        # Start the background loop as a task
        self.loop.create_task(self.monitor_manager.start_loop())
        self.loop.create_task(self.status_task())

    async def status_task(self):
        """Periodically update the bot's rich presence with a dynamic persona."""
        import random
        await self.wait_until_ready()
        
        while not self.is_closed():
            monitor_count = len(self.monitor_manager.monitors) if self.monitor_manager else 0
            
            # Get dynamic statuses or fallback to static
            statuses = self.language_data.get("dynamic_status", [self.language_data.get("watching_feeds", "Watching {count} feed(s)")])
            
            # Select random status
            status_text = random.choice(statuses).replace("{count}", str(monitor_count))
            
            activity = discord.Activity(
                type=discord.ActivityType.watching,
                name=status_text
            )
            await self.change_presence(activity=activity, status=discord.Status.online)
            
            # Rotate based on config (default to 60 seconds)
            interval = self.config.get("presence_interval_seconds", 60)
            await asyncio.sleep(interval)

    async def on_ready(self):
        log.info(f"--- FEED BOT ONLINE ---")
        log.info(f"Identity: {self.user} (ID: {self.user.id})")
        log.info(f"Prefix: {self.command_prefix}")
        log.info(f"------------------------")

        # Initial Rich Presence is handled by status_task
        log.info("Dynamic Rich Presence rotating task started.")

    async def on_message(self, message):
        """Process commands and filter logs."""
        if message.author.bot:
            return
        
        # Restrict prefix commands to specified admin channel
        if message.content.startswith(self.command_prefix):
            admin_channel_id = self.config.get("admin_channel_id")
            if admin_channel_id and message.channel.id != admin_channel_id:
                # Silently ignore
                return
        
        await self.process_commands(message)

    def get_feedback(self, key, **kwargs):
        """Helper to get localized feedback."""
        text = self.language_data.get(key, key)
        for k, v in kwargs.items():
            text = text.replace(f"{{{k}}}", str(v))
        return text

    def create_monitor_instance(self, m_config):
        """Helper to create a monitor instance from config."""
        m_type = m_config.get("type")
        if m_type == "youtube":
            return YouTubeMonitor(self, m_config, self.db, self.language_data)
        elif m_type == "tiktok":
            return TikTokMonitor(self, m_config, self.db, self.language_data)
        elif m_type == "instagram":
            return InstagramMonitor(self, m_config, self.db, self.language_data)
        elif m_type == "rss":
            return RSSMonitor(self, m_config, self.db, self.language_data)
        elif m_type == "epic_games":
            return EpicGamesMonitor(self, m_config, self.db, self.language_data)
        elif m_type == "steam_free":
            return SteamFreeMonitor(self, m_config, self.db, self.language_data)
        elif m_type == "gog_free":
            return GOGFreeMonitor(self, m_config, self.db, self.language_data)
        elif m_type == "reddit":
            return RedditMonitor(self, m_config, self.db, self.language_data)
        elif m_type == "twitter":
            return TwitterMonitor(self, m_config, self.db, self.language_data)
        elif m_type == "stream":
            return StreamMonitor(self, m_config, self.db, self.language_data)
        return None

# --- Commands ---

def is_admin():
    async def predicate(ctx):
        # Allow owner or players with Administrator permission
        if await ctx.bot.is_owner(ctx.author):
            return True
        if ctx.author.guild_permissions.administrator:
            return True
        await ctx.send(ctx.bot.get_feedback("error_admin_only"))
        return False
    return commands.check(predicate)

@commands.command(name="sync")
@commands.guild_only()
@is_admin()
async def sync(ctx, spec: str | None = None):
    """[Admin] Sync slash commands manually (guild/global/copy)."""
    await ctx.send(ctx.bot.get_feedback("syncing_wait"))
    
    if spec == "global":
        synced = await ctx.bot.tree.sync()
        msg = ctx.bot.get_feedback("sync_success_global", count=len(synced))
        await ctx.send(msg)
    elif spec == "copy":
        ctx.bot.tree.copy_global_to(guild=ctx.guild)
        synced = await ctx.bot.tree.sync(guild=ctx.guild)
        msg = ctx.bot.get_feedback("sync_success_copy", count=len(synced))
        await ctx.send(msg)
    else:
        # Sync only to this guild (instant)
        synced = await ctx.bot.tree.sync(guild=ctx.guild)
        msg = ctx.bot.get_feedback("sync_success_guild", count=len(synced))
        await ctx.send(msg)

@commands.command(name="clear_commands")
@commands.guild_only()
@is_admin()
async def clear_commands(ctx):
    """[Admin] Emergency clear of all slash commands."""
    await ctx.send(ctx.bot.get_feedback("syncing_wait"))
    
    # Clear Global
    ctx.bot.tree.clear_commands(guild=None)
    await ctx.bot.tree.sync(guild=None)
    # Clear Guild
    ctx.bot.tree.clear_commands(guild=ctx.guild)
    await ctx.bot.tree.sync(guild=ctx.guild)
    
    await ctx.send(ctx.bot.get_feedback("clear_commands_success"))

# --- Slash Commands ---

class AddMonitorModal(discord.ui.Modal):
    def __init__(self, monitor_type, bot):
        self.bot = bot
        self.monitor_type = monitor_type
        super().__init__(title=bot.get_feedback("add_monitor_title"))

        self.name_input = discord.ui.TextInput(
            label=bot.get_feedback("add_monitor_name_label"),
            placeholder="e.g. My Favorite Channel",
            required=True
        )
        self.add_item(self.name_input)

        url_label = bot.get_feedback("add_monitor_id_label")
        self.url_input = discord.ui.TextInput(
            label=url_label,
            placeholder="UC... or https://...",
            required=True
        )
        self.add_item(self.url_input)

        self.channel_id_input = discord.ui.TextInput(
            label=bot.get_feedback("add_monitor_channel_label"),
            placeholder="123456789...",
            required=True
        )
        self.add_item(self.channel_id_input)

        self.role_id_input = discord.ui.TextInput(
            label=bot.get_feedback("add_monitor_role_label"),
            placeholder="987654321...",
            required=False
        )
        self.add_item(self.role_id_input)

    async def on_submit(self, interaction: discord.Interaction):
        try:
            m_config = {
                "type": self.monitor_type,
                "name": self.name_input.value,
                "discord_channel_id": int(self.channel_id_input.value),
                "ping_role_id": int(self.role_id_input.value) if self.role_id_input.value else 0,
                "enabled": True
            }

            # Handle type-specific keys
            if self.monitor_type == "youtube":
                m_config["channel_id"] = self.url_input.value
            elif self.monitor_type == "rss":
                m_config["rss_url"] = self.url_input.value
            elif self.monitor_type == "tiktok":
                m_config["username"] = self.url_input.value
                m_config["instance_url"] = "https://proxitok.pabloferreiro.es" # Default instance
            elif self.monitor_type == "instagram":
                m_config["username"] = self.url_input.value
                m_config["rss_url"] = f"https://rss.app/feeds/{self.url_input.value}.xml" # Placeholder pattern
            elif self.monitor_type == "epic_games":
                m_config["include_upcoming"] = True
            elif self.monitor_type == "steam_free":
                m_config["include_dlc"] = False

            # Update working config
            if "monitors" not in self.bot.config:
                self.bot.config["monitors"] = []
            self.bot.config["monitors"].append(m_config)

            # Persist to disk
            with open("config.json", "w", encoding="utf-8") as f:
                # Remove temporary token and db path before saving (to keep config.json clean)
                # But wait, config_loader puts them there. 
                # Let's save a copy without sensitive data if they came from .env
                save_config = self.bot.config.copy()
                # Assuming setup handled .env overwrites, we just save the list
                json.dump(save_config, f, indent=4, ensure_ascii=False)

            # Add to MonitorManager at runtime
            monitor = self.bot.create_monitor_instance(m_config)
            if monitor:
                self.bot.monitor_manager.add_monitor(monitor)
                log.info(f"Dynamic monitor added: {monitor.name}")

            success_msg = self.bot.get_feedback("add_monitor_success", name=self.name_input.value, type=self.monitor_type)
            await interaction.response.send_message(success_msg, ephemeral=True)

        except Exception as e:
            log.error(f"Error adding monitor via modal: {e}", exc_info=True)
            error_msg = self.bot.get_feedback("add_monitor_error")
            await interaction.response.send_message(f"{error_msg}: {e}", ephemeral=True)

class MonitorTypeSelect(discord.ui.Select):
    def __init__(self, bot):
        self.bot = bot
        options = [
            discord.SelectOption(label="YouTube", value="youtube", emoji="📺"),
            discord.SelectOption(label="RSS Feed", value="rss", emoji="🔗"),
            discord.SelectOption(label="TikTok", value="tiktok", emoji="🎵"),
            discord.SelectOption(label="Instagram", value="instagram", emoji="📸"),
            discord.SelectOption(label="Epic Games", value="epic_games", emoji="🎮"),
            discord.SelectOption(label="Steam Free", value="steam_free", emoji="♨️"),
            discord.SelectOption(label="GOG Free", value="gog_free", emoji="💜"),
            discord.SelectOption(label="Reddit", value="reddit", emoji="🟠"),
            discord.SelectOption(label="Twitter/X", value="twitter", emoji="🐦"),
            discord.SelectOption(label="Stream (Twitch/Kick)", value="stream", emoji="📡"),
        ]
        super().__init__(placeholder=bot.get_feedback("add_monitor_type_select"), options=options)

    async def callback(self, interaction: discord.Interaction):
        modal = AddMonitorModal(self.values[0], self.bot)
        await interaction.response.send_modal(modal)

class MonitorTypeView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=60)
        self.add_item(MonitorTypeSelect(bot))

@app_commands.command(name="add_monitor", description="Új monitor hozzáadása a rendszerhez")
@app_commands.default_permissions(administrator=True)
async def add_monitor(interaction: discord.Interaction):
    """[Admin] Megnyitja a monitor hozzáadása felületet."""
    view = MonitorTypeView(interaction.client)
    await interaction.response.send_message(
        interaction.client.get_feedback("add_monitor_type_select"), 
        view=view, 
        ephemeral=True
    )

@app_commands.command(name="check", description="Manuális ellenőrzés és legutóbbi tartalom küldése")
@app_commands.describe(monitor_name="Melyik feed-et ellenőrizze a bot?")
@app_commands.default_permissions(administrator=True)
async def check(interaction: discord.Interaction, monitor_name: str):
    """[Admin] Manuálisan lekéri és elküldi a legfrissebb bejegyzést egy feed-ből."""
    bot = interaction.client
    
    # Find monitor by name
    target_monitor = None
    if bot.monitor_manager:
        for m in bot.monitor_manager.monitors:
            if m.name == monitor_name:
                target_monitor = m
                break
    
    if not target_monitor:
        await interaction.response.send_message(
            bot.get_feedback("error_monitor_not_found"), 
            ephemeral=True
        )
        return

    await interaction.response.defer(ephemeral=True)
    
    try:
        data = await target_monitor.get_latest_item()
        if data:
            if data.get("empty"):
                await interaction.followup.send(
                    bot.get_feedback("check_no_active_offers", name=monitor_name),
                    ephemeral=True
                )
            else:
                # Send content as ephemeral followup (testing only)
                await interaction.followup.send(
                    content=data.get("content"),
                    embed=data.get("embed"),
                    view=data.get("view"),
                    ephemeral=True
                )
                await interaction.followup.send(
                    bot.get_feedback("check_success", name=monitor_name), 
                    ephemeral=True
                )
        else:
            await interaction.followup.send(
                bot.get_feedback("error_no_content", name=monitor_name), 
                ephemeral=True
            )
    except Exception as e:
        log.error(f"Error in /check command for {monitor_name}: {e}", exc_info=True)
        await interaction.followup.send(
            f"Hiba történt: {e}", 
            ephemeral=True
        )

@check.autocomplete("monitor_name")
async def monitor_autocomplete(interaction: discord.Interaction, current: str):
    bot = interaction.client
    choices = []
    if bot.monitor_manager:
        for m in bot.monitor_manager.monitors:
            if m.enabled and current.lower() in m.name.lower():
                choices.append(app_commands.Choice(name=m.name, value=m.name))
    return choices[:25]

# --- Main Logic ---

async def main():
    # Setup logging first
    setup_logging()
    
    db = None
    try:
        # Load configuration
        config = load_config()
        
        # Initialize Database
        db_path = config.get("database_path", "data/feed_bot.db")
        db = Database(db_path)
        await db.initialize()
        
        token = config.get("token")
        if not token:
            log.critical("No DISCORD_TOKEN found! Please set it in .env or config.json.")
            return

        # Initialize Bot
        bot = FeedBot(config, db)
        
        # Apply optional command suffix
        suffix = config.get("command_suffix", "")
        if suffix:
            sync.name = f"sync{suffix}"
            clear_commands.name = f"clear_commands{suffix}"
            log.info(f"Command suffix applied: {suffix}")

        # Start Bot
        async with bot:
            # We add commands manually since we are not using Cogs for these simple ones
            bot.add_command(sync)
            bot.add_command(clear_commands)
            
            # Add slash commands to the tree
            bot.tree.add_command(check)
            bot.tree.add_command(add_monitor)
            
            await bot.start(token)
            
    except KeyboardInterrupt:
        log.info("Shutdown requested via KeyboardInterrupt.")
    except Exception as e:
        log.critical(f"Critical error during startup: {e}", exc_info=True)
    finally:
        if db:
            await db.close()
        log.info("Feed Bot closed.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
