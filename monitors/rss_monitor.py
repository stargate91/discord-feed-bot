import feedparser
import discord
from core.base_monitor import BaseMonitor
from logger import log

class RSSMonitor(BaseMonitor):
    def __init__(self, bot, config, db, language_data):
        super().__init__(bot, config, db)
        self.feed_url = config.get("rss_url")
        self.lang = language_data
        self.is_first_run = True

    async def check_for_updates(self):
        """Fetch a generic RSS feed and look for new entries."""
        if not self.feed_url:
            log.warning(f"No RSS URL for monitor: {self.name}")
            return

        # Fetch the feed
        try:
            feed = feedparser.parse(self.feed_url)
        except Exception as e:
            log.error(f"Failed to fetch RSS feed for {self.name}: {e}")
            return
        
        if not hasattr(feed, 'entries') or not feed.entries:
            log.debug(f"No feed entries found for RSS monitor {self.name} at {self.feed_url}")
            return

        # Process entries in reverse chronological order (oldest first)
        new_entries = []
        for entry in reversed(feed.entries):
            # Use link or id as a unique identifier
            entry_id = entry.get("id") or entry.get("link")
            if not entry_id:
                continue

            if not await self.db.is_published(entry_id, "rss"):
                if self.is_first_run:
                    # On first run, we just mark existing entries as published
                    log.debug(f"Seeding database with existing RSS entry: {entry_id}")
                    await self.db.mark_as_published(entry_id, "rss", self.feed_url)
                else:
                    new_entries.append(entry)
                    log.info(f"New RSS entry detected: {entry.get('title', 'Unknown')} ({entry_id})")

        # Send updates for new entries
        for entry in new_entries:
            entry_id = entry.get("id") or entry.get("link")
            entry_link = entry.get("link")
            entry_title = entry.get("title", "New RSS Update")
            author_name = entry.get("author") or self.name
            
            embed = discord.Embed(
                title=entry_title[:256],
                url=entry_link,
                color=0x00FF00 # Generic Green
            )
            embed.set_author(name=author_name)
            
            # Thumbnail handling (Generic RSS handling)
            if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                embed.set_image(url=entry.media_thumbnail[0]["url"])
            elif hasattr(entry, 'media_content') and entry.media_content:
                embed.set_image(url=entry.media_content[0]["url"])
            elif 'description' in entry:
                import re
                img_match = re.search(r'<img [^>]*src="([^"]+)"', entry.description)
                if img_match:
                    embed.set_image(url=img_match.group(1))

            alert_text = self.lang.get("new_rss_alert", "Új bejegyzés érkezett!")
            ping = f"{self.ping_role} " if self.ping_role else ""
            await self.send_update(content=f"{ping}{alert_text}\n{entry_link}", embed=embed)
            await self.db.mark_as_published(entry_id, "rss", self.feed_url)

        # After the first successful check, mark as not first run
        if self.is_first_run:
            log.info(f"Initial seed completed for RSS {self.name}. Monitoring active.")
            self.is_first_run = False
