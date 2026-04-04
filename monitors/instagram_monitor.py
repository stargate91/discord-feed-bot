import feedparser
import discord
import re
import asyncio
from core.base_monitor import BaseMonitor
from logger import log

class InstagramMonitor(BaseMonitor):
    def __init__(self, bot, config, db, language_data):
        super().__init__(bot, config, db)
        # For Instagram, since there's no single standard bridge, we'll take the full RSS URL
        self.feed_url = config.get("rss_url")
        self.username = config.get("username", "Unknown")
        self.lang = language_data
        self.is_first_run = True

    async def check_for_updates(self):
        """Fetch Instagram via provided RSS feed and look for new posts."""
        if not self.feed_url:
            log.warning(f"No RSS URL for Instagram monitor: {self.name}")
            return

        # Fetch the feed as a blocking operation in an executor
        try:
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
        except Exception as e:
            log.error(f"Failed to fetch Instagram feed for {self.name}: {e}")
            return
        
        if not hasattr(feed, 'entries') or not feed.entries:
            log.debug(f"No feed entries found for Instagram monitor {self.name} at {self.feed_url}")
            return

        # Process entries in reverse chronological order (oldest first)
        new_entries = []
        for entry in reversed(feed.entries):
            # Use link or id as a unique identifier
            post_id = entry.get("id") or entry.get("link")
            if not post_id:
                continue

            if not await self.db.is_published(post_id, "instagram"):
                if self.is_first_run:
                    # On first run, we just mark existing posts as published
                    log.debug(f"Seeding database with existing Instagram post: {post_id}")
                    await self.db.mark_as_published(post_id, "instagram", self.feed_url)
                else:
                    new_entries.append(entry)
                    log.info(f"New Instagram post detected: {entry.get('title', 'Unknown')} ({post_id})")

        # Send updates for new entries
        for entry in new_entries:
            post_id = entry.get("id") or entry.get("link")
            post_link = entry.get("link")
            post_title = entry.get("title", f"New Instagram post from {self.username}")
            # Some RSS bridges provide author, some don't
            author_name = entry.get("author") or self.username
            
            embed = discord.Embed(
                title=post_title[:256],
                url=post_link,
                color=0xE1306C # Instagram Pink/Purple
            )
            embed.set_author(name=author_name)
            
            # Thumbnail handling
            if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                embed.set_image(url=entry.media_thumbnail[0]["url"])
            elif hasattr(entry, 'media_content') and entry.media_content:
                embed.set_image(url=entry.media_content[0]["url"])
            elif 'description' in entry:
                # Attempt to find an image in description
                img_match = re.search(r'<img [^>]*src="([^"]+)"', entry.description)
                if img_match:
                    embed.set_image(url=img_match.group(1))

            alert_text = self.lang.get("new_instagram_alert", "Új Instagram poszt érkezett!")
            ping = f"{self.ping_role} " if self.ping_role else ""

            # Create interactive button
            view = discord.ui.View()
            btn_label = self.lang.get("btn_view_instagram", "Watch on Instagram")
            view.add_item(discord.ui.Button(label=btn_label, url=post_link, style=discord.ButtonStyle.link))

            await self.send_update(content=f"{ping}{alert_text}\n{post_link}", embed=embed, view=view)
            await self.db.mark_as_published(post_id, "instagram", self.feed_url)

        # After the first successful check, mark as not first run
        if self.is_first_run:
            log.info(f"Initial seed completed for Instagram {self.name}. Monitoring active.")
            self.is_first_run = False
