import feedparser
import discord
import aiohttp
import re
import os
from core.base_monitor import BaseMonitor
from logger import log
from core.ui_layouts import generate_youtube_layout
import calendar
import textwrap

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
        resolved_data = await self.resolve_channel_id(self.channel_id)
        
        if resolved_data:
            ucid, title = resolved_data
            log.info(f"Successfully resolved '{self.channel_id}' to '{ucid}' (Title: {title})")
            
            # If resolution returned the ID itself as the title (e.g. UCID fallback or scrape failure)
            # we use a numbered fallback: YouTube #1, YouTube #2, etc.
            if title == ucid or not title:
                count = sum(1 for m in self.bot.monitor_manager.monitors if m.guild_id == self.guild_id and m.platform == "youtube")
                title = f"YouTube #{count + 1}"

            # Update the monitor name in DB if it was just a handle/nametag or a generic ID
            if self.name.startswith("@") or self.name.startswith("UC") or self.name == self.channel_id:
                try:
                    await db.update_monitor_name(self.id, title)
                    self.name = title
                    log.info(f"Updated monitor name to: {title}")
                except Exception as e:
                    log.error(f"Failed to update monitor name in DB: {e}")

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
        
        # --- Official YouTube API (Highly Reliable) ---
        if api_key:
            try:
                handle = input_str if input_str.startswith("@") else f"@{input_str}"
                log.info(f"[YouTubeAPI] Resolving '{handle}' via official API...")
                
                async with aiohttp.ClientSession() as session:
                    # A: Try forHandle first (most accurate for @handles)
                    handle_clean = handle.replace("@", "")
                    api_url = "https://www.googleapis.com/youtube/v3/channels"
                    params = {
                        "part": "snippet",
                        "forHandle": handle_clean,
                        "key": api_key
                    }
                    async with session.get(api_url, params=params, timeout=10) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data.get("items"):
                                ucid = data["items"][0]["id"]
                                title = data["items"][0]["snippet"]["title"]
                                log.info(f"[YouTubeAPI] Resolved via forHandle: '{handle}' -> '{ucid}' ({title})")
                                return (ucid, title)

                    # B: Fallback to Search API (if forHandle fails or not a direct handle)
                    log.info(f"[YouTubeAPI] forHandle failed, falling back to Search API for '{handle}'...")
                    search_url = "https://www.googleapis.com/youtube/v3/search"
                    params = {
                        "part": "snippet",
                        "q": handle,
                        "type": "channel",
                        "maxResults": 1,
                        "key": api_key
                    }
                    async with session.get(search_url, params=params, timeout=10) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data.get("items"):
                                ucid = data["items"][0]["id"]["channelId"]
                                title = data["items"][0]["snippet"]["title"]
                                log.info(f"[YouTubeAPI] Resolved via Search: '{handle}' -> '{ucid}' ({title})")
                                return (ucid, title)
                        else:
                            log.warning(f"[YouTubeAPI] API returned status {response.status}")
            except Exception as e:
                log.error(f"[YouTubeAPI] Error during resolution: {e}")

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

    async def _resolve_thumbnail_and_title(self, video_id, entry_title, fallback_thumbnail):
        maxres_url = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.head(maxres_url, timeout=3) as resp:
                    if resp.status == 200:
                        # Maxres exists! No wrapping needed.
                        return maxres_url, entry_title
        except Exception:
            pass
            
        # Fallback to hqdefault/media_thumbnail and wrap title intelligently
        wrapped_title = "\n".join(textwrap.wrap(entry_title, width=58))
        return fallback_thumbnail, wrapped_title

    async def process_item(self, entry):
        video_id = self.get_item_id(entry)
        author_name = entry.get("author") or entry.get("author_detail", {}).get("name") or self.name
        short_link = f"https://youtu.be/{video_id}"
        entry_title = entry.get("title", self.bot.get_feedback("monitor_youtube_fallback_title", guild_id=self.guild_id))
        entry_title = "\n".join(textwrap.wrap(entry_title, width=58))
        
        published_ts = None
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            published_ts = calendar.timegm(entry.published_parsed)
            
        fallback_thumb = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            fallback_thumb = entry.media_thumbnail[0]["url"]
            
        thumbnail, entry_title = await self._resolve_thumbnail_and_title(video_id, entry_title, fallback_thumb)
        
        alert_text = self.get_alert_message({
            "name": author_name,
            "title": entry_title,
            "url": short_link
        })
        
        use_native = self.config.get("use_native_player", False)
        
        if use_native:
            # Native layout: Send the raw URL unbracketed so Discord creates the player. No layout view.
            await self.send_update(content=f"{alert_text}\n{short_link}", view=None)
        else:
            content, layout = generate_youtube_layout(
                bot=self.bot,
                guild_id=self.guild_id,
                alert_text=alert_text,
                title=entry_title,
                url=short_link,
                image_url=thumbnail,
                author=author_name,
                published_ts=published_ts,
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
                if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                    thumbnail = entry.media_thumbnail[0]["url"]
                    
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
            results.append(await self._format_entry(entry))
        return results

    async def _format_entry(self, entry):
        """Helper to format a YouTube feed entry into standard output mapping."""
        # Extract video ID
        video_id = entry.get("yt_videoid") or entry.get("id", "").split(":")[-1]
        
        # Get channel name and format short link
        author_name = entry.get("author") or entry.get("author_detail", {}).get("name") or self.name
        short_link = f"https://youtu.be/{video_id}"
        entry_title = entry.get("title", self.bot.get_feedback("monitor_youtube_fallback_title", guild_id=self.guild_id))
        entry_title = "\n".join(textwrap.wrap(entry_title, width=58))
        
        published_ts = None
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            published_ts = calendar.timegm(entry.published_parsed)
            
        fallback_thumb = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            fallback_thumb = entry.media_thumbnail[0]["url"]
            
        thumbnail, entry_title = await self._resolve_thumbnail_and_title(video_id, entry_title, fallback_thumb)
        
        # Format localized alert message
        alert_text = self.get_alert_message({
            "name": author_name,
            "title": entry_title,
            "url": short_link
        })
        
        use_native = self.config.get("use_native_player", False)
        
        if use_native:
            return {
                "content": f"{alert_text}\n{short_link}",
                "view": None
            }
        else:
            content, layout = generate_youtube_layout(
                bot=self.bot,
                guild_id=self.guild_id,
                alert_text=alert_text,
                title=entry_title,
                url=short_link,
                image_url=thumbnail,
                author=author_name,
                published_ts=published_ts,
                accent_color=self.get_color(0xff0000)
            )
            
            return {
                "content": content,
                "view": layout
            }
