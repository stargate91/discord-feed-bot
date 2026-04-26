import aiohttp
import discord
from core.base_monitor import BaseMonitor
from logger import log
import database as db
from core.ui_layouts import generate_steam_news_layout

# Standard User-Agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

class SteamNewsMonitor(BaseMonitor):
    """Monitor for Steam game news and updates."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        raw_id = config.get("appid") or config.get("app_id")
        self.appid = raw_id
        
        # Handle full URL input (e.g., https://store.steampowered.com/app/570/Dota_2/)
        if isinstance(raw_id, str) and "steampowered.com/app/" in raw_id:
            try:
                # Extract the number after /app/
                parts = raw_id.split("/app/")[1].split("/")
                self.appid = parts[0]
                log.info(f"[SteamNews] Extracted AppID {self.appid} from URL: {raw_id}")
            except Exception as e:
                log.error(f"[SteamNews] Failed to extract AppID from URL {raw_id}: {e}")

        # Increased count to 20 to ensure we catch official updates even if mixed with spam
        self.api_url = f"https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid={self.appid}&count=20&maxlength=400"

    def get_shared_key(self):
        return f"steam_news:{self.appid}"

    async def _resolve_appid(self):
        """Try to resolve the appid if it's a name or URL."""
        if not self.appid:
            return

        # If it's already a number, we are good
        if str(self.appid).isdigit():
            return

        # Check Cache
        cached_id = await db.get_steam_cached_id(str(self.appid))
        if cached_id:
            self.appid = cached_id
            return

        # Search via Steam API
        log.info(f"[SteamNews] Resolving AppID for: {self.appid}")
        search_url = f"https://store.steampowered.com/api/storesearch/?term={self.appid}&l=english&cc=US"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, headers={"User-Agent": USER_AGENT}) as response:
                    if response.status == 200:
                        data = await response.json()
                        items = data.get("items", [])
                        if items:
                            best_match = items[0]
                            found_id = str(best_match.get("id"))
                            found_name = best_match.get("name")
                            
                            log.info(f"[SteamNews] Resolved '{self.appid}' to AppID {found_id} ({found_name})")
                            
                            # Cache it
                            await db.cache_steam_id(str(self.appid), found_id, found_name)
                            
                            self.appid = found_id
                        else:
                            log.warning(f"[SteamNews] No Steam apps found matching: {self.appid}")
        except Exception as e:
            log.error(f"[SteamNews] Error resolving AppID for {self.appid}: {e}")

    async def fetch_new_items(self):
        """Fetch Steam News and look for new posts."""
        await self._resolve_appid()
        
        if not self.appid or not str(self.appid).isdigit():
            log.warning(f"No valid Steam AppID for monitor: {self.name} (Value: {self.appid})")
            return []

        # Check for shared data
        feed = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if not feed:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.api_url, headers={"User-Agent": USER_AGENT}) as response:
                        if response.status != 200:
                            log.error(f"Failed to fetch Steam News for {self.name}: {response.status}")
                            return []
                        data = await response.json()
                        feed = data.get("appnews", {}).get("newsitems", [])
                        if feed:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Error fetching Steam news for {self.name}: {e}")
                return []

        if not feed:
            return []

        all_candidates = []
        for item in feed:
            gid = item.get("gid")
            feed_type = item.get("feed_type")
            
            # Filter: only process official updates/announcements (feed_type == 1)
            if not gid or feed_type != 1: 
                continue

            all_candidates.append(item)

        return list(reversed(all_candidates))

    async def process_item(self, item):
        output = self._format_news_item(item)
        await self.send_update(content=output["content"], view=output["view"])

    def get_item_id(self, item):
        return item.get("gid")

    async def mark_items_published(self, items):
        for item in items:
            gid = self.get_item_id(item)
            if gid:
                await db.mark_as_published(gid, "steam_news", self.api_url, guild_id=self.guild_id)

    async def get_latest_item(self):
        """Wrapper for get_latest_items(1)"""
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        """Fetch the N most recent official news items from the Steam feed."""
        await self._resolve_appid()
        if not self.appid or not str(self.appid).isdigit():
            return []
            
        try:
            # Fetch up to 20 items to have a good pool of official news
            url = f"https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid={self.appid}&count=20&maxlength=400"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers={"User-Agent": USER_AGENT}) as response:
                    if response.status != 200: return []
                    data = await response.json()
                    feed = data.get("appnews", {}).get("newsitems", [])
                    if not feed: return []
                    
                    official_items = [item for item in feed if item.get("feed_type") == 1]
                    
                    # Limit to requested count
                    official_items = official_items[:count]
                    
                    # Reverse to get Oldest -> Newest (sequential reposting)
                    results = []
                    for item in reversed(official_items):
                        results.append(self._format_news_item(item))
                    return results
        except Exception as e:
            log.error(f"Manual check failed for Steam News {self.name}: {e}")
            return []

    def _format_news_item(self, item):
        """Helper to format a raw Steam News item into a standardized output dict using V2 Layout."""
        title = item.get("title", self.bot.get_feedback("monitor_steam_news_fallback_title", guild_id=self.guild_id))
        url = item.get("url", "").strip()
        is_valid_url = isinstance(url, str) and url.startswith("http")
        
        author = item.get("author", "Steam")
        raw_contents = item.get("contents", "")
        
        from core.utils import clean_html, extract_image_url
        description = clean_html(raw_contents)
        image_url = extract_image_url(raw_contents)
        
        # Fallback to official Steam game header if no image in the news post
        used_fallback = False
        if not image_url:
            image_url = f"https://cdn.akamai.steamstatic.com/steam/apps/{self.appid}/header.jpg"
            used_fallback = True
        
        # Formulate message
        alert_text = self.get_alert_message({
            "name": self.name, 
            "title": title, 
            "url": url if is_valid_url else "", 
            "author": author
        })
        
        # Truncate description for the layout
        truncated_desc = description[:300] + "..." if len(description) > 300 else description
        
        if used_fallback:
            import textwrap
            wrapped_lines = []
            for line in truncated_desc.split('\n'):
                if line.strip():
                    wrapped_lines.extend(textwrap.wrap(line, width=75, break_long_words=False))
                else:
                    wrapped_lines.append("")
            final_desc = "\n".join(wrapped_lines)
            final_title = "\n".join(textwrap.wrap(title, width=55, break_long_words=False))
        else:
            final_desc = truncated_desc
            final_title = title[:256]
        
        content, layout = generate_steam_news_layout(
            bot=self.bot,
            guild_id=self.guild_id,
            alert_text=alert_text,
            title=final_title,
            url=url if is_valid_url else "",
            description=final_desc,
            image_url=image_url,
            author=author,
            published_ts=item.get("date"),
            accent_color=self.get_color(0x3d3f45)
        )
        
        return {
            "content": content,
            "view": layout
        }
