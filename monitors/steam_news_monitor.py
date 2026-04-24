import aiohttp
import discord
from core.base_monitor import BaseMonitor
from logger import log
import database

# Standard User-Agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

class SteamNewsMonitor(BaseMonitor):
    """Monitor for Steam game news and updates."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.appid = config.get("appid") or config.get("app_id")
        self.api_url = f"https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid={self.appid}&count=5"
        self.is_first_run = True

    def get_shared_key(self):
        return f"steam_news:{self.appid}"

    async def fetch_new_items(self):
        """Fetch Steam News and look for new posts."""
        if not self.appid:
            log.warning(f"No Steam AppID for monitor: {self.name}")
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

        new_entries = []
        for item in reversed(feed):
            gid = item.get("gid")
            if not gid: continue

            if not await database.is_published(gid, "steam_news", self.guild_id):
                if self.is_first_run:
                    await database.mark_as_published(gid, "steam_news", self.api_url, guild_id=self.guild_id)
                else:
                    new_entries.append(item)
                    log.info(f"New Steam News detected: {item.get('title')} ({gid})")

        if self.is_first_run:
            log.info(f"Initial seed completed for Steam News {self.name}.")
            self.is_first_run = False
            
        return new_entries

    async def process_item(self, item):
        title = item.get("title", self.bot.get_feedback("monitor_steam_news_fallback_title", guild_id=self.guild_id))
        url = item.get("url")
        author = item.get("author", "Steam")
        raw_contents = item.get("contents", "")
        
        from core.utils import clean_html, extract_image_url
        description = clean_html(raw_contents)
        image_url = extract_image_url(raw_contents)
        
        alert_text = self.get_alert_message({
            "name": self.name,
            "title": title,
            "url": url,
            "author": author
        })
        
        embed = discord.Embed(
            title=title[:256],
            url=url,
            description=description[:300] + "..." if len(description) > 300 else description,
            color=self.get_color(0x3d3f45)
        )
        embed.set_author(name=author)
        
        timestamp = item.get("date")
        if timestamp:
            embed.add_field(name=self.bot.get_feedback("field_published_at", guild_id=self.guild_id), value=f"<t:{timestamp}:f> (<t:{timestamp}:R>)", inline=False)
        
        embed.set_footer(text=self.bot.get_feedback("footer_steam_news", guild_id=self.guild_id))
        
        if image_url:
            embed.set_image(url=image_url)
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_read_more", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link))
        
        await self.send_update(content=f"{alert_text}\n{url}", embed=embed, view=view)

    def get_item_id(self, item):
        return item.get("gid")

    async def mark_items_published(self, items):
        for item in items:
            gid = self.get_item_id(item)
            if gid:
                await database.mark_as_published(gid, "steam_news", self.api_url, guild_id=self.guild_id)

    async def get_latest_item(self):
        """Wrapper for get_latest_items(1)"""
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        """Fetch the N most recent news items from the Steam feed."""
        if not self.appid:
            return []
            
        try:
            # Fetch up to 'count' items from API
            url = f"https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid={self.appid}&count={count}&maxlength=400"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers={"User-Agent": USER_AGENT}) as response:
                    if response.status != 200: return []
                    data = await response.json()
                    feed = data.get("appnews", {}).get("newsitems", [])
                    if not feed: return []
                    
                    # Reverse to get Oldest -> Newest (sequential reposting)
                    results = []
                    for item in reversed(feed):
                        results.append(self._format_news_item(item))
                    return results
        except Exception as e:
            log.error(f"Manual check failed for Steam News {self.name}: {e}")
            return []

    def _format_news_item(self, item):
        """Helper to format a raw Steam News item into a standardized output dict."""
        title = item.get("title", self.bot.get_feedback("monitor_steam_news_fallback_title", guild_id=self.guild_id))
        url = item.get("url")
        author = item.get("author", "Steam")
        raw_contents = item.get("contents", "")
        
        from core.utils import clean_html, extract_image_url
        description = clean_html(raw_contents)
        image_url = extract_image_url(raw_contents)
        
        # Formulate message
        alert_text = self.get_alert_message({"name": self.name, "title": title, "url": url, "author": author})
        
        embed = discord.Embed(
            title=title[:256],
            url=url,
            description=description[:300] + "..." if len(description) > 300 else description,
            color=self.get_color(0x3d3f45)
        )
        embed.set_author(name=author)
        
        # Localized timestamp
        timestamp = item.get("date")
        if timestamp:
            embed.add_field(name=self.bot.get_feedback("field_published_at", guild_id=self.guild_id), value=f"<t:{timestamp}:f> (<t:{timestamp}:R>)", inline=False)
        
        embed.set_footer(text=self.bot.get_feedback("footer_steam_news", guild_id=self.guild_id))
        
        if image_url:
            embed.set_image(url=image_url)
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_read_more", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{alert_text}\n{url}",
            "embed": embed,
            "view": view
        }

