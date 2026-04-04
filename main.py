import asyncio
import discord
import json
import os
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

class FeedBot(discord.Client):
    def __init__(self, config, db):
        # Intents needed for basic bot functionality
        intents = discord.Intents.default()
        intents.message_content = True
        
        super().__init__(intents=intents)
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
                # Create and register YouTube monitor
                monitor = YouTubeMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "tiktok":
                # Create and register TikTok monitor
                monitor = TikTokMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "instagram":
                # Create and register Instagram monitor
                monitor = InstagramMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "rss":
                # Create and register Generic RSS monitor
                monitor = RSSMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "epic_games":
                # Create and register Epic Games monitor
                monitor = EpicGamesMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "steam_free":
                # Create and register Steam Free Games monitor
                monitor = SteamFreeMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            elif m_type == "gog_free":
                # Create and register GOG Free Games monitor
                monitor = GOGFreeMonitor(self, m_config, self.db, self.language_data)
                self.monitor_manager.add_monitor(monitor)
            else:
                log.warning(f"Unknown monitor type in config: {m_type}")

        # Start the background loop as a task
        self.loop.create_task(self.monitor_manager.start_loop())

    async def on_ready(self):
        log.info(f"--- FEED BOT ONLINE ---")
        log.info(f"Identity: {self.user} (ID: {self.user.id})")
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

async def main():
    # Setup logging first
    setup_logging()
    
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
            await bot.start(token)
            
    except KeyboardInterrupt:
        log.info("Shutdown requested via KeyboardInterrupt.")
    except Exception as e:
        log.critical(f"Critical error during startup: {e}", exc_info=True)
    finally:
        await db.close()
        log.info("Feed Bot closed.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
