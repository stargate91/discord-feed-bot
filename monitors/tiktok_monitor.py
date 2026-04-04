import feedparser
import discord
import re
import asyncio
from core.base_monitor import BaseMonitor
from logger import log

class TikTokMonitor(BaseMonitor):
    def __init__(self, bot, config, db, language_data):
        super().__init__(bot, config, db)
        self.username = config.get("username", "").replace("@", "")
        self.instance_url = config.get("instance_url", "https://proxitok.pabloferreiro.es").rstrip("/")
        self.feed_url = f"{self.instance_url}/api/rss/@{self.username}"
        self.lang = language_data
        self.is_first_run = True

    async def check_for_updates(self):
        """Fetch TikTok via ProxiTok RSS and look for new videos."""
        if not self.username:
            log.warning(f"No username for TikTok monitor: {self.name}")
            return

        # Fetch the feed as a blocking operation in an executor
        try:
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
        except Exception as e:
            log.error(f"Failed to fetch TikTok feed for {self.name}: {e}")
            return
        
        if not hasattr(feed, 'entries') or not feed.entries:
            log.debug(f"No feed entries found for TikTok monitor {self.name} at {self.feed_url}")
            return

        # Process entries in reverse chronological order (oldest first)
        new_entries = []
        for entry in reversed(feed.entries):
            # Use link or id as a unique identifier
            video_id = entry.get("id") or entry.get("link")
            if not video_id:
                continue

            if not await self.db.is_published(video_id, "tiktok"):
                if self.is_first_run:
                    # On first run, we just mark existing videos as published
                    log.debug(f"Seeding database with existing TikTok: {video_id}")
                    await self.db.mark_as_published(video_id, "tiktok", self.feed_url)
                else:
                    new_entries.append(entry)
                    log.info(f"New TikTok detected: {entry.get('title', 'Unknown')} ({video_id})")

        # Send updates for new entries
        for entry in new_entries:
            video_id = entry.get("id") or entry.get("link")
            video_link = entry.get("link")
            video_title = entry.get("title", f"New TikTok from @{self.username}")
            author_name = entry.get("author", f"@{self.username}")
            
            embed = discord.Embed(
                title=video_title[:256], # Discord title limit
                url=video_link,
                color=0xEE1D52 # TikTok Pink/Red
            )
            embed.set_author(name=author_name)
            
            # Thumbnail handling (ProxiTok often includes media content or descriptions with images)
            if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                embed.set_image(url=entry.media_thumbnail[0]["url"])
            elif 'description' in entry:
                # Attempt to find an image in description if possible (ProxiTok sometimes does this)
                img_match = re.search(r'<img src="([^"]+)"', entry.description)
                if img_match:
                    embed.set_image(url=img_match.group(1))

            alert_text = self.lang.get("new_tiktok_alert", "Új TikTok érkezett!")
            ping = f"{self.ping_role} " if self.ping_role else ""

            # Create interactive button
            view = discord.ui.View()
            btn_label = self.lang.get("btn_view_tiktok", "Watch on TikTok")
            view.add_item(discord.ui.Button(label=btn_label, url=video_link, style=discord.ButtonStyle.link))

            await self.send_update(content=f"{ping}{alert_text}\n{video_link}", embed=embed, view=view)
            await self.db.mark_as_published(video_id, "tiktok", self.feed_url)

        # After the first successful check, mark as not first run
        if self.is_first_run:
            log.info(f"Initial seed completed for TikTok {self.name}. Monitoring active.")
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent TikTok from the feed."""
        if not self.username:
            return None

        import asyncio
        import re
        try:
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
        except:
            return None
            
        if not hasattr(feed, 'entries') or not feed.entries:
            return None

        # ProxiTok RSS usually has most recent first
        entry = feed.entries[0]
        video_link = entry.get("link")
        video_title = entry.get("title", f"New TikTok from @{self.username}")
        author_name = entry.get("author", f"@{self.username}")
        
        embed = discord.Embed(
            title=video_title[:256],
            url=video_link,
            color=0xEE1D52 
        )
        embed.set_author(name=author_name)
        
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            embed.set_image(url=entry.media_thumbnail[0]["url"])
        elif 'description' in entry:
            img_match = re.search(r'<img src="([^"]+)"', entry.description)
            if img_match:
                embed.set_image(url=img_match.group(1))

        alert_text = self.lang.get("new_tiktok_alert", "Új TikTok érkezett!")
        ping = f"{self.ping_role} " if self.ping_role else ""
        
        view = discord.ui.View()
        btn_label = self.lang.get("btn_view_tiktok", "Watch on TikTok")
        view.add_item(discord.ui.Button(label=btn_label, url=video_link, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{ping}{alert_text}\n{video_link}",
            "embed": embed,
            "view": view
        }
