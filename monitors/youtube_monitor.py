import feedparser
import discord
import aiohttp
import re
from core.base_monitor import BaseMonitor
from logger import log

import database

class YouTubeMonitor(BaseMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.channel_id = config.get("channel_id")
        self.feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={self.channel_id}"
        self.is_first_run = True
        self.is_resolving = False

    async def _ensure_channel_id(self):
        """Helper to ensure we have a valid UCID, resolving handles/names if necessary."""
        if self.channel_id and self.channel_id.startswith("UC") and len(self.channel_id) == 24:
            return True
            
        if self.is_resolving: return False
        self.is_resolving = True
        
        log.info(f"Attempting to resolve YouTube Channel ID for: {self.channel_id}")
        resolved = await self.resolve_channel_id(self.channel_id)
        
        if resolved:
            log.info(f"Successfully resolved '{self.channel_id}' to '{resolved}'")
            self.channel_id = resolved
            self.feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={self.channel_id}"
            self.is_resolving = False
            return True
        
        log.warning(f"Could not resolve YouTube Channel ID for: {self.channel_id}")
        self.is_resolving = False
        return False

    @staticmethod
    async def resolve_channel_id(input_str):
        """Scrapes the YouTube channel page to find the underlying UCID."""
        if not input_str: return None
        
        # If it's already a UC id, just return it
        input_str = input_str.strip()
        if input_str.startswith("UC") and len(input_str) == 24:
            return input_str
            
        url = input_str
        if not url.startswith("http"):
            if input_str.startswith("@"):
                url = f"https://www.youtube.com/{input_str}"
            else:
                url = f"https://www.youtube.com/@{input_str}"
        
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+417" # Try to bypass EU consent
            }
            async with aiohttp.ClientSession(headers=headers) as session:
                async with session.get(url, timeout=15, allow_redirects=True) as response:
                    if response.status != 200:
                        log.warning(f"YouTube resolution returned status {response.status} for {url}")
                        return None
                        
                    html = await response.text()
                    
                    # Pattern 1: RSS Feed Link (Extremely reliable if present)
                    match = re.search(r'feeds/videos\.xml\?channel_id=(UC[a-zA-Z0-9_-]{22})', html)
                    if match: return match.group(1)
                    
                    # Pattern 2: Meta channelId
                    match = re.search(r'itemprop="channelId" content="(UC[a-zA-Z0-9_-]{22})"', html)
                    if match: return match.group(1)
                    
                    # Pattern 3: Canonical/OG/Twitter channel URL
                    match = re.search(r'youtube\.com/channel/(UC[a-zA-Z0-9_-]{22})', html)
                    if match: return match.group(1)
                    
                    # Pattern 4: Browse ID in JSON
                    match = re.search(r'"browseId":"(UC[a-zA-Z0-9_-]{22})"', html)
                    if match: return match.group(1)
                    
                    # Pattern 5: External ID in JSON
                    match = re.search(r'"externalId":"(UC[a-zA-Z0-9_-]{22})"', html)
                    if match: return match.group(1)

                    # Pattern 6: Broad search for any UC... ID in the HTML as a last resort
                    # (YouTube IDs are always UC followed by 22 chars)
                    uc_matches = re.findall(r'UC[a-zA-Z0-9_-]{22}', html)
                    if uc_matches:
                        # Return the most frequent one to avoid false positives from related channels
                        from collections import Counter
                        most_common = Counter(uc_matches).most_common(1)
                        if most_common:
                            return most_common[0][0]

        except Exception as e:
            log.error(f"Error resolving YouTube channel ID for {input_str}: {e}")
            
        return None

    def get_shared_key(self):
        return f"youtube:{self.channel_id}"

    async def fetch_new_items(self):
        """Fetch YouTube RSS feed and look for new videos."""
        if not await self._ensure_channel_id():
            log.warning(f"No valid channel ID for YouTube monitor: {self.name} (Input: {self.config.get('channel_id')})")
            return []

        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            feed = shared_data
        else:
            import asyncio
            loop = asyncio.get_event_loop()
            try:
                feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
                if hasattr(feed, 'entries'):
                    self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Failed to fetch YouTube feed for {self.name}: {e}")
                return []
        
        if not feed or not hasattr(feed, 'entries'):
            return []

        new_entries = []
        for entry in reversed(feed.entries):
            video_id = entry.get("yt_videoid")
            if not video_id:
                video_id = entry.get("id", "").split(":")[-1]
            if not video_id:
                continue

            if not await database.is_published(video_id, "youtube", self.guild_id):
                if self.is_first_run:
                    log.debug(f"Seeding database with existing video: {video_id}")
                    # Seed with minimal info or try to extract it
                    await database.mark_as_published(video_id, "youtube", self.feed_url, guild_id=self.guild_id, title=entry.get("title"))
                else:
                    new_entries.append(entry)
                    log.info(f"New YouTube video detected: {entry.get('title', 'Unknown')} ({video_id})")

        if self.is_first_run:
            log.info(f"Initial seed completed for {self.name}. Monitoring active for next updates.")
            self.is_first_run = False
            
        return new_entries

    async def process_item(self, entry):
        video_id = self.get_item_id(entry)
        author_name = entry.get("author") or entry.get("author_detail", {}).get("name") or self.name
        short_link = f"https://youtu.be/{video_id}"
        entry_title = entry.get("title", self.bot.get_feedback("monitor_youtube_fallback_title", guild_id=self.guild_id))
        
        alert_text = self.get_alert_message({
            "name": author_name,
            "title": entry_title,
            "url": short_link
        })
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_youtube", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=short_link, style=discord.ButtonStyle.link))
        
        await self.send_update(content=f"{alert_text}\n{short_link}", embed=None, view=view)

    def get_item_id(self, entry):
        return entry.get("yt_videoid") or entry.get("id", "").split(":")[-1]

    async def mark_items_published(self, items):
        for entry in items:
            video_id = self.get_item_id(entry)
            if video_id:
                thumbnail = f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
                title = entry.get("title", "Unknown Video")
                author = entry.get("author") or entry.get("author_detail", {}).get("name") or self.name
                await database.mark_as_published(
                    video_id, "youtube", self.feed_url, 
                    guild_id=self.guild_id,
                    title=title,
                    thumbnail_url=thumbnail,
                    author_name=author
                )

    async def get_latest_item(self):
        """Fetch the most recent YouTube video from the feed."""
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        """Fetch the N most recent YouTube videos from the feed."""
        if not await self._ensure_channel_id():
            return []

        import asyncio
        loop = asyncio.get_event_loop()
        try:
            feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
        except Exception as e:
            log.error(f"Manual check failed for YouTube {self.name}: {e}")
            return []
        
        if not hasattr(feed, 'entries') or not feed.entries:
            return []

        # Get top N entries (newest first)
        entries = feed.entries[:count]
        # Reverse for chronological order (Oldest -> Newest)
        entries.reverse()

        results = []
        for entry in entries:
            results.append(self._format_entry(entry))
        return results

    def _format_entry(self, entry):
        """Helper to format a YouTube feed entry into standard output mapping."""
        # Extract video ID
        video_id = entry.get("yt_videoid") or entry.get("id", "").split(":")[-1]
        
        # Get channel name and format short link
        author_name = entry.get("author") or entry.get("author_detail", {}).get("name") or self.name
        short_link = f"https://youtu.be/{video_id}"
        entry_title = entry.get("title", self.bot.get_feedback("monitor_youtube_fallback_title", guild_id=self.guild_id))
        
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
