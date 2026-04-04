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
            m_type = m_config.get("type")
            if m_type == "youtube":
                monitor = YouTubeMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "tiktok":
                monitor = TikTokMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "instagram":
                monitor = InstagramMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "rss":
                monitor = RSSMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "epic_games":
                monitor = EpicGamesMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "steam_free":
                monitor = SteamFreeMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "gog_free":
                monitor = GOGFreeMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            else:
                log.warning(f"Unknown monitor type in config: {m_type}")

        # Start the background loop as a task
        self.loop.create_task(self.monitor_manager.start_loop())

    async def on_ready(self):
        log.info(f"--- FEED BOT ONLINE ---")
        log.info(f"Identity: {self.user} (ID: {self.user.id})")
        log.info(f"Prefix: {self.command_prefix}")
        log.info(f"------------------------")

        # Set Rich Presence
        monitor_count = len(self.monitor_manager.monitors) if self.monitor_manager else 0
        presence_text = self.language_data.get("watching_feeds", "Watching {count} feed(s)")
        presence_text = presence_text.replace("{count}", str(monitor_count))
        activity = discord.Activity(
            type=discord.ActivityType.watching,
            name=presence_text
        )
        await self.change_presence(activity=activity, status=discord.Status.online)
        log.info(f"Rich Presence set: {presence_text}")

    async def on_message(self, message):
        """Process commands and filter logs."""
        if message.author.bot:
            return
        
        await self.process_commands(message)

    def get_feedback(self, key, **kwargs):
        """Helper to get localized feedback."""
        text = self.language_data.get(key, key)
        for k, v in kwargs.items():
            text = text.replace(f"{{{k}}}", str(v))
        return text

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
            # Send to the channel (not as a direct response to interaction, but as a normal message)
            await interaction.channel.send(
                content=data.get("content"),
                embed=data.get("embed"),
                view=data.get("view")
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
        
        # Start Bot
        async with bot:
            # We add commands manually since we are not using Cogs for these simple ones
            bot.add_command(sync)
            bot.add_command(clear_commands)
            
            # Add slash commands to the tree
            bot.tree.add_command(check)
            
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
