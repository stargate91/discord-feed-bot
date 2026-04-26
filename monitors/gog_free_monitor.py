import aiohttp
import discord
from datetime import datetime
from core.base_monitor import BaseMonitor
from logger import log
from core.emojis import THUMBNAIL_GOG
# Standard User-Agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
import database as db
from core.ui_layouts import generate_free_game_layout

class GOGFreeMonitor(BaseMonitor):
    """Monitor for free GOG game giveaways via GamerPower API."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.api_url = "https://www.gamerpower.com/api/giveaways?platform=gog&sort-by=date"

    def get_shared_key(self):
        return "gog_free_giveaways"

    async def fetch_new_items(self):
        """Fetch GamerPower API and look for new GOG giveaways."""
        
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            data = shared_data
        else:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.api_url, headers={"User-Agent": USER_AGENT}) as response:
                        if response.status not in (200, 201):
                            log.error(f"Failed to fetch GamerPower API for GOG: {response.status}")
                            return []
                        data = await response.json()
                        if data:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), data)
            except Exception as e:
                log.error(f"Error fetching GOG free games data: {e}")
                return []
        
        if isinstance(data, dict) and data.get("status") == 0:
            return []

        if not isinstance(data, list):
            return []

        new_entries = []
        for game in reversed(data):
            giveaway_id = str(game.get("id"))
            title = game.get("title", "Unknown")
            
            if not await db.is_published(giveaway_id, "gog_free", self.guild_id):
                new_entries.append(game)
                log.info(f"New GOG giveaway detected: {game.get('title')}")
            
        return new_entries

    async def process_item(self, game):
        giveaway_id = str(game.get("id"))
        title = game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
        title = title.replace("(GOG)", "").replace("Giveaway", "").strip()
        title = f"<:gog:1490131412043431976> {title}"
        game_url = game.get("open_giveaway_url") or game.get("gamerpower_url", "")
        
        is_steam_link = "steampowered.com" in game_url.lower() or "steamcommunity.com" in game_url.lower()
        final_url = game.get("gamerpower_url", game_url) if is_steam_link else game_url

        image_url = game.get("image") or game.get("thumbnail")
        na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
        worth = game.get("worth", na_text)
        giveaway_type = game.get("type", "Game")
        end_date = game.get("end_date", na_text)
        expiry_ts = None
        if end_date and end_date != na_text:
            try:
                dt = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S")
                expiry_ts = int(dt.timestamp())
            except:
                pass

        alert_text = self.get_alert_message({
            "name": "GOG",
            "title": title,
            "url": final_url
        })
        
        content, layout = generate_free_game_layout(
            bot=self.bot,
            guild_id=self.guild_id,
            alert_text=alert_text,
            title=title,
            game_url=final_url,
            image_url=image_url,
            worth=worth,
            giveaway_type=giveaway_type,
            expiry_ts=expiry_ts,
            accent_color=self.get_color(0x3d3f45)
        )
        
        await self.send_update(content=content, view=layout)

    def get_item_id(self, game):
        return str(game.get("id"))

    async def mark_items_published(self, items):
        for game in items:
            giveaway_id = self.get_item_id(game)
            if giveaway_id != "None":
                await db.mark_as_published(giveaway_id, "gog_free", self.api_url, guild_id=self.guild_id)

    async def get_latest_item(self):
        """Wrapper for get_latest_items(1)"""
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        """Fetch the N most recent GOG giveaways from GamerPower."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url, headers={"User-Agent": USER_AGENT}) as response:
                    if response.status not in (200, 201):
                        return []
                    data = await response.json()
        except:
            return []

        if isinstance(data, dict) and data.get("status") == 0:
            return [{"empty": True}]

        if not isinstance(data, list) or not data:
            return [{"empty": True}]

        # Get newest 'count' items from API
        latest_data = data[:count]
        
        results = []
        # Reverse the slice to process Oldest -> Newest (sequential reposting)
        for game in reversed(latest_data):
            na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
            title = game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
            title = title.replace("(GOG)", "").replace("Giveaway", "").strip()
            title = f"<:gog:1490131412043431976> {title}"
            game_url = game.get("open_giveaway_url") or game.get("gamerpower_url", "")
            
            # Avoid Steam links in GOG monitor
            is_steam_link = "steampowered.com" in game_url.lower() or "steamcommunity.com" in game_url.lower()
            final_url = game.get("gamerpower_url", game_url) if is_steam_link else game_url

            image_url = game.get("image") or game.get("thumbnail")
            worth = game.get("worth", na_text)
            giveaway_type = game.get("type", "Game")
            end_date = game.get("end_date", na_text)
            expiry_ts = None
            if end_date and end_date != na_text:
                try:
                    dt = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S")
                    expiry_ts = int(dt.timestamp())
                except: pass

            alert_text = self.get_alert_message({"name": "GOG", "title": title, "url": final_url})
            
            content, layout = generate_free_game_layout(
                bot=self.bot,
                guild_id=self.guild_id,
                alert_text=alert_text,
                title=title,
                game_url=final_url,
                image_url=image_url,
                worth=worth,
                giveaway_type=giveaway_type,
                expiry_ts=expiry_ts,
                accent_color=self.get_color(0x3d3f45)
            )
            
            results.append({"content": content, "view": layout})
            
        return results
