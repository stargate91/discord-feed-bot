import feedparser
import discord
import aiohttp
import re
import os
from core.base_monitor import BaseMonitor
from logger import log
from core.ui_layouts import generate_youtube_layout
import calendar
from datetime import datetime

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
            log.debug(f"[YouTube] '{self.name}' already has a valid UCID: {self.channel_id}")
            return True
            
        if self.is_resolving: return False
        self.is_resolving = True
        
        log.info(f"Attempting to resolve YouTube Channel ID for: {self.channel_id}")
        resolved_data = await self.resolve_channel_id(self.channel_id)
        
        if resolved_data:
            ucid, title = resolved_data
            log.info(f"Successfully resolved '{self.channel_id}' to '{ucid}' (Title: {title})")
            
            if title == ucid or not title:
                count = sum(1 for m in self.bot.monitor_manager.monitors if m.guild_id == self.guild_id and m.platform == "youtube")
                title = f"YouTube #{count + 1}"

            should_update_id = not self.channel_id.startswith("UC") or len(self.channel_id) != 24
            
            if self.name.startswith("@") or self.name.startswith("UC") or self.name == self.channel_id or should_update_id:
                try:
                    if self.name != title:
                        await db.update_monitor_name(self.id, title)
                        self.name = title
                        log.info(f"Updated monitor name to: {title}")
                    
                    await db.update_monitor_channel_id(self.id, ucid)
                    log.info(f"Updated monitor channel_id in DB to: {ucid}")
                except Exception as e:
                    log.error(f"Failed to update monitor in DB: {e}")

            self.channel_id = ucid
            self.feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={self.channel_id}"
            self.is_resolving = False
            return True
        
        log.warning(f"Could not resolve YouTube Channel ID for: {self.channel_id}")
        self.is_resolving = False
        return False

    @staticmethod
    async def resolve_channel_id(input_str):
        """Resolves YouTube channel ID using API (preferred) or scraping (fallback). Returns (ucid, title) or None."""
        if not input_str: return None
        
        input_str = input_str.strip()
        if input_str.startswith("UC") and len(input_str) == 24:
            return (input_str, input_str)
            
        api_key = os.getenv("YOUTUBE_API_KEY")
        
        if api_key:
            try:
                handle = input_str if input_str.startswith("@") else f"@{input_str}"
                log.info(f"[YouTubeAPI] Resolving '{handle}' (Input: {input_str})")
                
                async with aiohttp.ClientSession() as session:
                    params = {
                        "part": "snippet",
                        "forHandle": handle,
                        "key": api_key
                    }
                    async with session.get("https://www.googleapis.com/youtube/v3/channels", params=params, timeout=10) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data.get("items"):
                                ucid = data["items"][0]["id"]
                                title = data["items"][0]["snippet"]["title"]
                                log.info(f"[YouTubeAPI] Match! '{handle}' -> '{ucid}' ({title})")
                                return (ucid, title)

                    search_query = input_str.replace("@", "")
                    log.info(f"[YouTubeAPI] Falling back to Search for: '{search_query}'")
                    params = {
                        "part": "snippet",
                        "q": search_query,
                        "type": "channel",
                        "maxResults": 1,
                        "key": api_key
                    }
                    async with session.get("https://www.googleapis.com/youtube/v3/search", params=params, timeout=10) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data.get("items"):
                                ucid = data["items"][0]["id"]["channelId"]
                                title = data["items"][0]["snippet"]["title"]
                                log.info(f"[YouTubeAPI] Search Match! '{search_query}' -> '{ucid}' ({title})")
                                return (ucid, title)
            except Exception as e:
                log.error(f"[YouTubeAPI] Resolution Error: {e}")
        else:
            log.error("[YouTubeAPI] CRITICAL: YOUTUBE_API_KEY is missing in Bot environment!")
        return None

    def get_shared_key(self):
        return f"youtube:{self.channel_id}"

    async def fetch_new_items(self, force_fresh=False):
        """Fetch YouTube videos. Uses RSS feed with API fallback for reliability."""
        if not await self._ensure_channel_id():
            return []

        shared_key = self.get_shared_key()
        items = None if force_fresh else self.bot.monitor_manager.get_shared_data(shared_key)
        
        if items is None:
            # 1. Try RSS Feed first
            import asyncio
            loop = asyncio.get_event_loop()
            try:
                log.info(f"[YouTube] Fetching RSS feed for '{self.name}': {self.feed_url}")
                feed = await loop.run_in_executor(None, lambda: feedparser.parse(self.feed_url))
                if hasattr(feed, 'entries') and feed.entries:
                    items = []
                    for entry in feed.entries:
                        # Extract published timestamp
                        pub_ts = None
                        if hasattr(entry, 'published_parsed') and entry.published_parsed:
                            pub_ts = calendar.timegm(entry.published_parsed)
                            
                        items.append({
                            "yt_videoid": entry.get("yt_videoid") or entry.get("id", "").split(":")[-1],
                            "id": entry.get("id"),
                            "title": entry.get("title"),
                            "author": entry.get("author") or entry.get("author_detail", {}).get("name"),
                            "link": entry.get("link"),
                            "published_ts": pub_ts,
                            "media_thumbnail": entry.get("media_thumbnail")
                        })
                    log.info(f"[YouTube] Successfully fetched {len(items)} items via RSS for '{self.name}'")
            except Exception as e:
                log.warning(f"[YouTube] RSS fetch failed for {self.name}: {e}")

            # 2. API Fallback
            if not items:
                api_key = os.getenv("YOUTUBE_API_KEY")
                if api_key:
                    try:
                        log.info(f"[YouTube] RSS failed/empty. Falling back to API for '{self.name}'...")
                        params = {
                            "part": "snippet",
                            "channelId": self.channel_id,
                            "order": "date",
                            "type": "video",
                            "maxResults": 20,
                            "key": api_key
                        }
                        async with aiohttp.ClientSession() as session:
                            async with session.get("https://www.googleapis.com/youtube/v3/search", params=params, timeout=10) as response:
                                if response.status == 200:
                                    data = await response.json()
                                    raw_items = data.get("items", [])
                                    items = []
                                    for item in raw_items:
                                        video_id = item["id"]["videoId"]
                                        # Parse publishedAt to Unix TS
                                        # "2023-10-27T15:00:10Z"
                                        pub_date_str = item["snippet"]["publishedAt"]
                                        try:
                                            # Simple parsing for Z-format
                                            dt = datetime.strptime(pub_date_str, "%Y-%m-%dT%H:%M:%SZ")
                                            pub_ts = int(dt.timestamp())
                                        except:
                                            pub_ts = int(datetime.now().timestamp())

                                        items.append({
                                            "yt_videoid": video_id,
                                            "id": f"yt:video:{video_id}",
                                            "title": item["snippet"]["title"],
                                            "author": item["snippet"]["channelTitle"],
                                            "link": f"https://www.youtube.com/watch?v={video_id}",
                                            "published_ts": pub_ts,
                                            "media_thumbnail": [{"url": item["snippet"]["thumbnails"]["high"]["url"]}]
                                        })
                                    log.info(f"[YouTube] Successfully fetched {len(items)} items via API for '{self.name}'")
                    except Exception as e:
                        log.error(f"[YouTube] API fallback error for {self.name}: {e}")

            if items:
                self.bot.monitor_manager.set_shared_data(shared_key, items)
            else:
                return []

        return list(reversed(items))

    async def _resolve_thumbnail(self, video_id, fallback_thumbnail):
        maxres_url = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
        try:
            timeout = aiohttp.ClientTimeout(total=5)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.head(maxres_url) as resp:
                    if resp.status == 200:
                        return maxres_url
        except Exception:
            pass
        return fallback_thumbnail

    async def process_item(self, entry):
        video_id = self.get_item_id(entry)
        author_name = entry.get("author") or self.name
        short_link = f"https://youtu.be/{video_id}"
        entry_title = entry.get("title", "Unknown Video")
        published_ts = entry.get("published_ts")
        
        fallback_thumb = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        if entry.get('media_thumbnail'):
            fallback_thumb = entry['media_thumbnail'][0]["url"]
            
        thumbnail = await self._resolve_thumbnail(video_id, fallback_thumb)
        alert_text = self.get_alert_message({"name": author_name, "title": entry_title, "url": short_link})
        
        if self.config.get("use_native_player", False):
            await self.send_update(content=f"{alert_text}\n{short_link}", view=None)
        else:
            content, layout = generate_youtube_layout(
                bot=self.bot, guild_id=self.guild_id, alert_text=alert_text,
                title=entry_title, url=short_link, image_url=thumbnail,
                author=author_name, published_ts=published_ts,
                accent_color=self.get_color(0xff0000)
            )
            await self.send_update(content=content, view=layout)

    def get_item_id(self, entry):
        return entry.get("yt_videoid") or entry.get("id", "").split(":")[-1]

    async def mark_items_published(self, items):
        for entry in items:
            video_id = self.get_item_id(entry)
            if video_id:
                thumbnail = f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
                title = entry.get("title", "Unknown Video")
                author = entry.get("author") or self.name
                await db.mark_as_published(video_id, "youtube", self.feed_url, guild_id=self.guild_id, title=title, thumbnail_url=thumbnail, author_name=author)

    async def get_latest_item(self):
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        """Fetch latest items with API fallback."""
        items = await self.fetch_new_items(force_fresh=True)
        if not items: return []
        
        reversed_items = list(reversed(items))
        entries = reversed_items[:count]
        
        results = []
        for entry in entries:
            results.append(await self._format_entry(entry))
        return results

    async def _format_entry(self, entry):
        video_id = self.get_item_id(entry)
        author_name = entry.get("author") or self.name
        short_link = f"https://youtu.be/{video_id}"
        entry_title = entry.get("title", "Unknown Video")
        published_ts = entry.get("published_ts")
        
        fallback_thumb = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        if entry.get('media_thumbnail'):
            fallback_thumb = entry['media_thumbnail'][0]["url"]
            
        thumbnail = await self._resolve_thumbnail(video_id, fallback_thumb)
        alert_text = self.get_alert_message({"name": author_name, "title": entry_title, "url": short_link})
        
        if self.config.get("use_native_player", False):
            return {"content": f"{alert_text}\n{short_link}", "view": None}
        else:
            content, layout = generate_youtube_layout(
                bot=self.bot, guild_id=self.guild_id, alert_text=alert_text,
                title=entry_title, url=short_link, image_url=thumbnail,
                author=author_name, published_ts=published_ts,
                accent_color=self.get_color(0xff0000)
            )
            return {"content": content, "view": layout}
