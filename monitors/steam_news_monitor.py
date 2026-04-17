import aiohttp
import discord
from core.base_monitor import BaseMonitor
from logger import log
import database

class SteamNewsMonitor(BaseMonitor):
    """Monitor for Steam game news and updates."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.appid = config.get("appid")
        self.patch_only = bool(config.get("steam_patch_only", False))
        self.api_url = f"https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid={self.appid}&count=5"
        self.is_first_run = True

    def get_shared_key(self):
        return f"steam_news:{self.appid}"

    async def check_for_updates(self):
        """Fetch Steam News and look for new posts."""
        if not self.appid:
            log.warning(f"No Steam AppID for monitor: {self.name}")
            return

        # Check for shared data
        feed = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if not feed:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.api_url) as response:
                        if response.status != 200:
                            log.error(f"Failed to fetch Steam News for {self.name}: {response.status}")
                            return
                        data = await response.json()
                        feed = data.get("appnews", {}).get("newsitems", [])
                        if feed:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Error fetching Steam news for {self.name}: {e}")
                return

        if not feed:
            return

        new_entries = []
        for item in reversed(feed):
            gid = item.get("gid")
            if not gid: continue

            # Filter if Patch Only is enabled
            if self.patch_only:
                title = item.get("title", "").lower()
                feed_name = item.get("feedname", "").lower()
                # Heuristic: Official announcements or keywords in title
                is_official = feed_name == "steam_community_announcements"
                has_keywords = any(kw in title for kw in ["patch", "update", "javítás", "frissítés"])
                if not (is_official or has_keywords):
                    continue

            if not await database.is_published(gid, "steam_news"):
                if self.is_first_run:
                    await database.mark_as_published(gid, "steam_news", self.api_url)
                else:
                    new_entries.append(item)
                    log.info(f"New Steam News detected: {item.get('title')} ({gid})")

        for item in new_entries:
            gid = item.get("gid")
            title = item.get("title", "Steam Update")
            url = item.get("url")
            author = item.get("author", "Steam")
            raw_contents = item.get("contents", "")
            
            # Clean content and extract image
            from core.utils import clean_html, extract_image_url
            description = clean_html(raw_contents)
            image_url = extract_image_url(raw_contents)
            
            # Formulate message using template hierarchy
            alert_text = self.get_alert_message({
                "name": self.name,
                "title": title,
                "url": url,
                "author": author
            })
            
            # Steam embeds often don't have images in the API response easily, but we can make a nice card
            embed = discord.Embed(
                title=title[:256],
                url=url,
                description=description[:300] + "..." if len(description) > 300 else description,
                color=self.get_color(0x1b2838) # Steam Dark Blue
            )
            embed.set_author(name=author)
            embed.set_footer(text="Steam News")
            
            if image_url:
                embed.set_image(url=image_url)
            
            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_read_more", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link))
            
            await self.send_update(content=f"{alert_text}\n{url}", embed=embed, view=view)
            await database.mark_as_published(gid, "steam_news", self.api_url)

        if self.is_first_run:
            log.info(f"Initial seed completed for Steam News {self.name}.")
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent item."""
        if not self.appid: return None
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url) as response:
                    if response.status != 200: return None
                    data = await response.json()
                    feed = data.get("appnews", {}).get("newsitems", [])
                    if not feed: return None
                    
                    item = feed[0]
                    title = item.get("title", "Steam Update")
                    url = item.get("url")
                    raw_contents = item.get("contents", "")
                    
                    from core.utils import clean_html, extract_image_url
                    description = clean_html(raw_contents)
                    image_url = extract_image_url(raw_contents)
                    
                    alert_text = self.get_alert_message({"name": self.name, "title": title, "url": url})
                    
                    embed = discord.Embed(
                        title=title[:256],
                        url=url,
                        description=description[:300] + "..." if len(description) > 300 else description,
                        color=self.get_color(0x1b2838)
                    )
                    
                    if image_url:
                        embed.set_image(url=image_url)
                    
                    view = discord.ui.View()
                    btn_label = self.bot.get_feedback("btn_read_more", guild_id=self.guild_id)
                    view.add_item(discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link))
                    
                    return {"content": f"{alert_text}\n{url}", "embed": embed, "view": view}
        except:
            return None
