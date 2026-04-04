import asyncio
import discord
import json
import os
from discord.ext import commands
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

@FeedBot.command(name="sync")
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

@FeedBot.command(name="clear_commands")
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
