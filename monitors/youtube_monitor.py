import feedparser
import discord
from core.base_monitor import BaseMonitor
from logger import log

import database

class YouTubeMonitor(BaseMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.channel_id = config.get("channel_id")
        self.feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={self.channel_id}"
        self.is_first_run = True

    def get_shared_key(self):
        return f"youtube:{self.channel_id}"

    async def check_for_updates(self):
        """Fetch YouTube RSS feed and look for new videos."""
        if not self.channel_id:
            log.warning(f"No channel ID for YouTube monitor: {self.name}")
            return

        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            feed = shared_data
        else:
            # Fetch the feed as a blocking operation in an executor
            import asyncio
            loop = asyncio.get_event_loop()
            try:
                feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
                if hasattr(feed, 'entries'):
                    self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Failed to fetch YouTube feed for {self.name}: {e}")
                return
        
        if not feed or not hasattr(feed, 'entries'):
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

            if not await database.is_published(video_id, "youtube"):
                if self.is_first_run:
                    # On first run, we just mark existing videos as published without sending alerts
                    log.debug(f"Seeding database with existing video: {video_id}")
                    await database.mark_as_published(video_id, "youtube", self.feed_url)
                else:
                    new_entries.append(entry)
                    log.info(f"New YouTube video detected: {entry.get('title', 'Unknown')} ({video_id})")

        # Send updates for new entries
        for entry in new_entries:
            video_id = entry.get("yt_videoid") or entry.get("id", "").split(":")[-1]
            author_name = entry.get("author") or entry.get("author_detail", {}).get("name") or self.name
            short_link = f"https://youtu.be/{video_id}"
            entry_title = entry.get("title", self.bot.get_feedback("monitor_youtube_fallback_title", guild_id=self.guild_id))
            
            # Format custom alert message
            alert_text = self.get_alert_message({
                "name": author_name,
                "title": entry_title,
                "url": short_link
            })
            
            # Create interactive button
            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_youtube", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=short_link, style=discord.ButtonStyle.link))
            
            await self.send_update(content=f"{alert_text}\n{short_link}", embed=None, view=view)
            await database.mark_as_published(video_id, "youtube", self.feed_url)

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
        alert_text = self.get_alert_message({
            "name": author_name,
            "title": entry_title,
            "url": short_link
        })
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_youtube", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=short_link, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{alert_text}\n{short_link}",
            "embed": None,
            "view": view
        }
