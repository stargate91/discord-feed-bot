import feedparser
import discord
import re
import asyncio
from core.base_monitor import BaseMonitor
from logger import log
import calendar

# Standard User-Agent to avoid being blocked by WordPress/Cloudflare
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

import database

class RSSMonitor(BaseMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.feed_url = config.get("rss_url")
        self.is_first_run = True

    def get_shared_key(self):
        return f"rss:{self.feed_url}"

    async def fetch_new_items(self):
        """Fetch a generic RSS feed and look for new entries."""
        if not self.feed_url:
            log.warning(f"No RSS URL for monitor: {self.name}")
            return []

        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            feed = shared_data
        else:
            try:
                loop = asyncio.get_event_loop()
                feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url, agent=USER_AGENT))
                if hasattr(feed, 'entries'):
                    self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Failed to fetch RSS feed for {self.name}: {e}")
                return []
        
        if not feed or not hasattr(feed, 'entries'):
            return []

        new_entries = []
        for entry in reversed(feed.entries):
            entry_id = entry.get("id") or entry.get("link")
            if not entry_id:
                continue

            if not await database.is_published(entry_id, "rss", self.guild_id):
                if self.is_first_run:
                    log.debug(f"Seeding database with existing RSS entry: {entry_id}")
                    await database.mark_as_published(entry_id, "rss", self.feed_url, guild_id=self.guild_id, title=entry.get("title"))
                else:
                    new_entries.append(entry)
                    log.info(f"New RSS entry detected: {entry.get('title', 'Unknown')} ({entry_id})")

        if self.is_first_run:
            log.info(f"Initial seed completed for RSS {self.name}. Monitoring active.")
            self.is_first_run = False
            
        return new_entries

    async def process_item(self, entry):
        entry_link = entry.get("link")
        entry_title = entry.get("title", self.bot.get_feedback("monitor_rss_fallback_title", guild_id=self.guild_id))
        author_name = entry.get("author") or self.name
        
        embed = discord.Embed(
            title=entry_title[:256],
            url=entry_link,
            color=self.get_color(0x3d3f45)
        )
        embed.set_author(name=author_name)
        
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            ts = calendar.timegm(entry.published_parsed)
            embed.add_field(name=self.bot.get_feedback("field_published_at", guild_id=self.guild_id), value=f"<t:{ts}:f> (<t:{ts}:R>)", inline=False)
        
        img_url = None
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            img_url = entry.media_thumbnail[0]["url"]
        elif hasattr(entry, 'media_content') and entry.media_content:
            img_url = entry.media_content[0]["url"]
        else:
            if hasattr(entry, 'description') and entry.description:
                img_match = re.search(r'<img [^>]*src="([^"]+)"', entry.description)
                if img_match:
                    img_url = img_match.group(1)
            
            if not img_url and hasattr(entry, 'content') and entry.content:
                img_match = re.search(r'<img [^>]*src="([^"]+)"', entry.content[0].get('value', ''))
                if img_match:
                    img_url = img_match.group(1)

        if img_url:
            embed.set_image(url=img_url)

        alert_text = self.get_alert_message({
            "name": author_name,
            "title": entry_title,
            "url": entry_link,
            "author": author_name
        })

        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_read_more", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=entry_link, style=discord.ButtonStyle.link))

        await self.send_update(content=f"{alert_text}\n{entry_link}", embed=embed, view=view)

    async def mark_items_published(self, items):
        for entry in items:
            entry_id = entry.get("id") or entry.get("link")
            if entry_id:
                title = entry.get("title", "New RSS Update")
                author = entry.get("author") or entry.get("author_detail", {}).get("name")
                await database.mark_as_published(
                    entry_id, "rss", self.feed_url, 
                    guild_id=self.guild_id,
                    title=title,
                    author_name=author
                )

    async def get_latest_item(self):
        """Fetch the most recent RSS entry from the feed."""
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        """Fetch the N most recent RSS entries from the feed in chronological order."""
        if not self.feed_url:
            return []

        try:
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url, agent=USER_AGENT))
        except Exception as e:
            log.error(f"Manual check failed for RSS {self.name}: {e}")
            return []
            
        if not hasattr(feed, 'entries') or not feed.entries:
            return []

        # Get the top N entries (newest first in feed)
        entries = feed.entries[:count]
        
        # Reverse them for chronological order (Oldest -> Newest)
        entries.reverse()
        
        results = []
        for entry in entries:
            results.append(self._format_entry(entry))
        return results

    def _format_entry(self, entry):
        """Helper to format a feed entry into standard output mapping."""
        entry_link = entry.get("link")
        entry_title = entry.get("title", self.bot.get_feedback("monitor_rss_fallback_title", guild_id=self.guild_id))
        author_name = entry.get("author") or self.name
        
        embed = discord.Embed(
            title=entry_title[:256],
            url=entry_link,
            color=self.get_color(0x3d3f45)
        )
        embed.set_author(name=author_name)
        
        img_url = None
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            img_url = entry.media_thumbnail[0]["url"]
        elif hasattr(entry, 'media_content') and entry.media_content:
            img_url = entry.media_content[0]["url"]
        else:
            if hasattr(entry, 'description') and entry.description:
                img_match = re.search(r'<img [^>]*src="([^"]+)"', entry.description)
                if img_match:
                    img_url = img_match.group(1)
            
            if not img_url and hasattr(entry, 'content') and entry.content:
                img_match = re.search(r'<img [^>]*src="([^"]+)"', entry.content[0].get('value', ''))
                if img_match:
                    img_url = img_match.group(1)

        if img_url:
            embed.set_image(url=img_url)

        alert_text = self.get_alert_message({
            "name": author_name,
            "title": entry_title,
            "url": entry_link,
            "author": author_name
        })
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_read_more", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=entry_link, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{alert_text}\n{entry_link}",
            "embed": embed,
            "view": view
        }
