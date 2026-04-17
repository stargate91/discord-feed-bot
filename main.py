import asyncio
import os
import asyncpg
from dotenv import load_dotenv
from logger import log, setup_logging
from config_loader import load_config
import database
from core.bot import FeedBot

async def main():
    # Setup logging
    setup_logging()
    load_dotenv()
    
    try:
        # Load configuration
        config = load_config()
        
        # Initialize Database
        dsn = config.get("database_url")
        if not dsn:
            log.critical("DATABASE_URL is not set in .env! Cannot start bot.")
            return

        try:
            pool = await asyncpg.create_pool(dsn)
            await database.set_pool(pool)
            await database.init_db()
            log.info("Successfully connected to PostgreSQL.")
        except Exception as e:
            log.critical(f"Failed to connect to PostgreSQL: {e}")
            return
        
        token = config.get("token")
        if not token:
            log.critical("No BOT_TOKEN found! Please set it in .env or config.json.")
            return

        # Initialize Bot
        bot = FeedBot(config)
        
        # Start Bot
        async with bot:
            await bot.start(token)
            
    except KeyboardInterrupt:
        log.info("Shutdown requested via KeyboardInterrupt.")
    except Exception as e:
        log.critical(f"Critical error during startup: {e}", exc_info=True)
    finally:
        await database.close()
        log.info("Feed Bot closed.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
