import feedparser
import discord
from core.base_monitor import BaseMonitor
from logger import log

class YouTubeMonitor(BaseMonitor):
    def __init__(self, bot, config, db, language_data):
        super().__init__(bot, config, db)
        self.channel_id = config.get("channel_id")
        self.feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={self.channel_id}"
        self.lang = language_data
        self.is_first_run = True

    async def check_for_updates(self):
        """Fetch YouTube RSS feed and look for new videos."""
        if not self.channel_id:
            log.warning(f"No channel ID for YouTube monitor: {self.name}")
            return

        # Fetch the feed as a blocking operation in an executor
        import asyncio
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
        
        if not hasattr(feed, 'entries'):
            log.debug(f"Could not fetch feed entries for {self.name}")
            return

        # Process entries in reverse chronological order (oldest first)
        new_entries = []
        for entry in reversed(feed.entries):
            # Extract video ID
            video_id = entry.get("yt_videoid")
            if not video_id:
                # Fallback extraction from id tag
                video_id = entry.get("id", "").split(":")[-1]
            
            if not video_id:
                continue

            if not await self.db.is_published(video_id, "youtube"):
                if self.is_first_run:
                    # On first run, we just mark existing videos as published without sending alerts
                    log.debug(f"Seeding database with existing video: {video_id}")
                    await self.db.mark_as_published(video_id, "youtube", self.feed_url)
                else:
                    new_entries.append(entry)
                    log.info(f"New YouTube video detected: {entry.get('title', 'Unknown')} ({video_id})")

        # Send updates for new entries
        for entry in new_entries:
            video_id = entry.get("yt_videoid") or entry.get("id", "").split(":")[-1]
            # Get channel name and format short link
            author_name = entry.get("author") or entry.get("author_detail", {}).get("name") or self.name
            short_link = f"https://youtu.be/{video_id}"
            
            # Format localized alert message
            alert_format = self.lang.get("new_video_alert_format", "**{channel}** just posted a new video!")
            alert_text = alert_format.replace("{channel}", author_name)
            
            ping = f"{self.ping_role}\n" if self.ping_role else ""
            
            # Create interactive button
            view = discord.ui.View()
            btn_label = self.lang.get("btn_view_youtube", "Watch on YouTube")
            view.add_item(discord.ui.Button(label=btn_label, url=short_link, style=discord.ButtonStyle.link))
            
            # Send update with the new formatting and short link
            await self.send_update(content=f"{ping}{alert_text}\n{short_link}", embed=None, view=view)
            await self.db.mark_as_published(video_id, "youtube", self.feed_url)

        # After the first successful check, mark as not first run
        if self.is_first_run:
            log.info(f"Initial seed completed for {self.name}. Monitoring active for next updates.")
            self.is_first_run = False
    async def get_latest_item(self):
        """Fetch the most recent YouTube video from the feed."""
        if not self.channel_id:
            return None

        import asyncio
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
        
        if not hasattr(feed, 'entries') or not feed.entries:
            return None

        # Return the most recent entry (first in RSS)
        entry = feed.entries[0]
        video_id = entry.get("yt_videoid") or entry.get("id", "").split(":")[-1]
        
        # Get channel name and format short link
        author_name = entry.get("author") or entry.get("author_detail", {}).get("name") or self.name
        short_link = f"https://youtu.be/{video_id}"
        
        # Format localized alert message
        alert_format = self.lang.get("new_video_alert_format", "**{channel}** just posted a new video!")
        alert_text = alert_format.replace("{channel}", author_name)
        
        ping = f"{self.ping_role}\n" if self.ping_role else ""
        
        view = discord.ui.View()
        btn_label = self.lang.get("btn_view_youtube", "Watch on YouTube")
        view.add_item(discord.ui.Button(label=btn_label, url=short_link, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{ping}{alert_text}\n{short_link}",
            "embed": None,
            "view": view
        }
