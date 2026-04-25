import feedparser
import discord
import aiohttp
import re
from core.base_monitor import BaseMonitor
from logger import log

import database as db

class YouTubeMonitor(BaseMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.channel_id = config.get("channel_id")
        self.feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={self.channel_id}"
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
        """Resolves YouTube channel ID using API (preferred) or scraping (fallback)."""
        if not input_str: return None
        
        input_str = input_str.strip()
        if input_str.startswith("UC") and len(input_str) == 24:
            return input_str
            
        api_key = os.getenv("YOUTUBE_API_KEY")
        
        # --- Attempt 1: Official YouTube API (Highly Reliable) ---
        if api_key:
            try:
                log.info(f"[YouTubeAPI] Resolving '{input_str}' via official API...")
                handle = input_str if input_str.startswith("@") else f"@{input_str}"
                
                # We use search endpoint to find the channel by handle/name
                api_url = "https://www.googleapis.com/youtube/v3/search"
                params = {
                    "part": "snippet",
                    "q": handle,
                    "type": "channel",
                    "maxResults": 1,
                    "key": api_key
                }
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(api_url, params=params, timeout=10) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data.get("items"):
                                ucid = data["items"][0]["id"]["channelId"]
                                log.info(f"[YouTubeAPI] Successfully resolved '{input_str}' to '{ucid}'")
                                return ucid
                        else:
                            log.warning(f"[YouTubeAPI] API returned status {response.status}")
            except Exception as e:
                log.error(f"[YouTubeAPI] Error during resolution: {e}")

        # --- Attempt 2: Scraping (Fallback) ---
        url = input_str
        if not url.startswith("http"):
            if input_str.startswith("@"):
                url = f"https://www.youtube.com/{input_str}"
            else:
                url = f"https://www.youtube.com/@{input_str}"
        
        log.info(f"[YouTubeScrape] Falling back to scraping for '{url}'...")
        # We'll try with and without the consent cookie
        attempts = [
            {"CONSENT": "YES+cb.20210328-17-p0.en+FX+417"},
            {} # No cookie fallback
        ]
        
        for cookies in attempts:
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9",
                }
                if cookies: headers["Cookie"] = cookies["CONSENT"]
                
                async with aiohttp.ClientSession(headers=headers) as session:
                    async with session.get(url, timeout=15, allow_redirects=True) as response:
                        if response.status != 200: continue
                            
                        html = await response.text()
                        if not html: continue
                        
                        # Pattern 1: RSS/Canonical/Meta (Common ones)
                        patterns = [
                            r'channel_id=(UC[a-zA-Z0-9_-]{22})',
                            r'itemprop="channelId" content="(UC[a-zA-Z0-9_-]{22})"',
                            r'youtube\.com/channel/(UC[a-zA-Z0-9_-]{22})',
                            r'"browseId":"(UC[a-zA-Z0-9_-]{22})"',
                            r'"externalId":"(UC[a-zA-Z0-9_-]{22})"',
                            r'content="https://www\.youtube\.com/@.*?/channel/(UC[a-zA-Z0-9_-]{22})"',
                            r'href="https://www\.youtube\.com/channel/(UC[a-zA-Z0-9_-]{22})"',
                            r'meta property="og:url" content="https://www\.youtube\.com/channel/(UC[a-zA-Z0-9_-]{22})"'
                        ]
                        
                        for p in patterns:
                            match = re.search(p, html)
                            if match: 
                                log.info(f"Resolved YouTube ID {match.group(1)} via pattern match.")
                                return match.group(1)
                        
                        # Pattern 2: Broad search for ANY UCID-like string (UC + 22 chars)
                        uc_matches = re.findall(r'UC[a-zA-Z0-9_-]{22}', html)
                        if uc_matches:
                            from collections import Counter
                            most_common = Counter(uc_matches).most_common(1)
                            if most_common: 
                                log.info(f"Resolved YouTube ID {most_common[0][0]} via broad frequency search.")
                                return most_common[0][0]

            except Exception as e:
                log.error(f"Error resolving YouTube channel ID attempt: {e}")
                
        return None

    def get_shared_key(self):
        return f"youtube:{self.channel_id}"

    async def fetch_new_items(self):
        """Fetch YouTube RSS feed and return items. Filtering is handled by the manager."""
        if not await self._ensure_channel_id():
            log.warning(f"No valid channel ID for YouTube monitor: {self.name}")
            return []

        shared_key = self.get_shared_key()
        feed = self.bot.monitor_manager.get_shared_data(shared_key)
        
        if not feed:
            import asyncio
            loop = asyncio.get_event_loop()
            try:
                feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
                if hasattr(feed, 'entries') and feed.entries:
                    self.bot.monitor_manager.set_shared_data(shared_key, feed)
            except Exception as e:
                log.error(f"Failed to fetch YouTube feed for {self.name}: {e}")
                return []
        

        # Return all entries. MonitorManager will filter via is_published per-guild.
        return list(reversed(feed.entries))

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
                await db.mark_as_published(
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
