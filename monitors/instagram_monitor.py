import feedparser
import discord
import re
import asyncio
from core.base_monitor import BaseMonitor
from logger import log
import database

class InstagramMonitor(BaseMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.username = config.get("username", "Unknown")
        self.feed_url = config.get("rss_url")
        self.is_first_run = True

    def get_shared_key(self):
        return f"instagram:{self.username}"

    async def check_for_updates(self):
        """Fetch Instagram via provided RSS feed and look for new posts."""
        if not self.feed_url:
            log.warning(f"No RSS URL for Instagram monitor: {self.name}")
            return

        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            feed = shared_data
        else:
            # Fetch the feed as a blocking operation in an executor
            try:
                loop = asyncio.get_event_loop()
                feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
                if hasattr(feed, 'entries'):
                    self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Failed to fetch Instagram feed for {self.name}: {e}")
                return
        
        if not feed or not hasattr(feed, 'entries') or not feed.entries:
            log.debug(f"No feed entries found for Instagram monitor {self.name} at {self.feed_url}")
            return

        # Process entries in reverse chronological order (oldest first)
        new_entries = []
        for entry in reversed(feed.entries):
            # Use link or id as a unique identifier
            post_id = entry.get("id") or entry.get("link")
            if not post_id:
                continue

            if not await database.is_published(post_id, "instagram"):
                if self.is_first_run:
                    # On first run, we just mark existing posts as published
                    log.debug(f"Seeding database with existing Instagram post: {post_id}")
                    await database.mark_as_published(post_id, "instagram", self.feed_url)
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
                color=self.get_color(0xE1306C) # Instagram Pink/Purple
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

            # Format alert
            alert_text = self.get_alert_message({
                "name": author_name,
                "title": post_title,
                "url": post_link
            })

            # Create interactive button
            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_instagram", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=post_link, style=discord.ButtonStyle.link))

            await self.send_update(content=f"{alert_text}\n{post_link}", embed=embed, view=view)
            await database.mark_as_published(post_id, "instagram", self.feed_url)

        # After the first successful check, mark as not first run
        if self.is_first_run:
            log.info(f"Initial seed completed for Instagram {self.name}. Monitoring active.")
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent Instagram post from the feed."""
        if not self.feed_url:
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

        entry = feed.entries[0]
        post_link = entry.get("link")
        post_title = entry.get("title", f"New Instagram post from {self.username}")
        author_name = entry.get("author") or self.username
        
        embed = discord.Embed(
            title=post_title[:256],
            url=post_link,
            color=self.get_color(0xE1306C) 
        )
        embed.set_author(name=author_name)
        
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            embed.set_image(url=entry.media_thumbnail[0]["url"])
        elif hasattr(entry, 'media_content') and entry.media_content:
            embed.set_image(url=entry.media_content[0]["url"])
        elif 'description' in entry:
            img_match = re.search(r'<img [^>]*src="([^"]+)"', entry.description)
            if img_match:
                embed.set_image(url=img_match.group(1))

        alert_text = self.bot.get_feedback("new_instagram_alert", guild_id=self.guild_id)
        ping = f"{self.ping_role} " if self.ping_role else ""
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_instagram", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=post_link, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{ping}{alert_text}\n{post_link}",
            "embed": embed,
            "view": view
        }
