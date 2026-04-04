import aiosqlite
import os
from datetime import datetime
from logger import log

class Database:
    def __init__(self, db_path):
        self.db_path = db_path

    async def initialize(self):
        """Initialize the database and create tables if they don't exist."""
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute('''
                CREATE TABLE IF NOT EXISTS published_entries (
                    entry_id TEXT,
                    platform TEXT,
                    feed_url TEXT,
                    published_at DATETIME,
                    PRIMARY KEY (entry_id, platform)
                )
            ''')
            await db.commit()
            log.info(f"Database initialized at {self.db_path}")

    async def is_published(self, entry_id, platform):
        """Check if an entry has already been published."""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT 1 FROM published_entries WHERE entry_id = ? AND platform = ?",
                (entry_id, platform)
            ) as cursor:
                result = await cursor.fetchone()
                return result is not None

    async def mark_as_published(self, entry_id, platform, feed_url, published_at=None):
        """Mark an entry as published."""
        if published_at is None:
            published_at = datetime.now()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT OR IGNORE INTO published_entries (entry_id, platform, feed_url, published_at) VALUES (?, ?, ?, ?)",
                (entry_id, platform, feed_url, published_at)
            )
            await db.commit()
            log.debug(f"Marked as published: {entry_id} on {platform}")
