import aiohttp
import discord
from datetime import datetime
from core.base_monitor import BaseMonitor
from logger import log
from core.emojis import THUMBNAIL_GOG
# Standard User-Agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
import database

class GOGFreeMonitor(BaseMonitor):
    """Monitor for free GOG game giveaways via GamerPower API."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.api_url = "https://www.gamerpower.com/api/giveaways?platform=gog&sort-by=date"
        self.is_first_run = True

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
            
            if not await database.is_published(giveaway_id, "gog_free", self.guild_id):
                if self.is_first_run:
                    log.debug(f"Seeding database with GOG giveaway: {game.get('title')}")
                    await database.mark_as_published(giveaway_id, "gog_free", self.api_url, guild_id=self.guild_id)
                else:
                    new_entries.append(game)
                    log.info(f"New GOG giveaway detected: {game.get('title')}")

        if self.is_first_run:
            self.is_first_run = False
            
        return new_entries

    async def process_item(self, game):
        giveaway_id = str(game.get("id"))
        title = game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
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

        embed = discord.Embed(
            title=title,
            url=final_url,
            color=self.get_color(0x3d3f45)
        )
        if image_url:
            embed.set_image(url=image_url)
            
        embed.set_thumbnail(url=THUMBNAIL_GOG)
        
        if worth and worth != na_text:
            embed.add_field(name=self.bot.get_feedback('field_worth', guild_id=self.guild_id), value=worth, inline=True)
        embed.add_field(name=self.bot.get_feedback('field_type', guild_id=self.guild_id), value=giveaway_type, inline=True)
        if expiry_ts:
            embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=f"<t:{expiry_ts}:R>", inline=True)
        elif end_date and end_date != na_text:
            embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=end_date, inline=True)
        embed.set_footer(text=f"{self.bot.get_feedback('footer_gog', guild_id=self.guild_id)} • GamerPower")

        alert_text = self.get_alert_message({
            "name": "GOG",
            "title": title,
            "url": final_url
        })
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_gog", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=final_url, style=discord.ButtonStyle.link))
        
        await self.send_update(content=f"{alert_text}\n{final_url}", embed=embed, view=view)

    def get_item_id(self, game):
        return str(game.get("id"))

    async def mark_items_published(self, items):
        for game in items:
            giveaway_id = self.get_item_id(game)
            if giveaway_id != "None":
                await database.mark_as_published(giveaway_id, "gog_free", self.api_url, guild_id=self.guild_id)

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

            embed = discord.Embed(title=title, url=final_url, color=self.get_color(0x3d3f45))
            if image_url: embed.set_image(url=image_url)
            embed.set_thumbnail(url=THUMBNAIL_GOG)
            if worth and worth != na_text:
                embed.add_field(name=self.bot.get_feedback('field_worth', guild_id=self.guild_id), value=worth, inline=True)
            embed.add_field(name=self.bot.get_feedback('field_type', guild_id=self.guild_id), value=giveaway_type, inline=True)
            if expiry_ts:
                embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=f"<t:{expiry_ts}:R>", inline=True)
            elif end_date and end_date != na_text:
                embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=end_date, inline=True)
            embed.set_footer(text=f"{self.bot.get_feedback('footer_gog', guild_id=self.guild_id)} • GamerPower")

            alert_text = self.get_alert_message({"name": "GOG", "title": title, "url": final_url})
            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_gog", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=final_url, style=discord.ButtonStyle.link))
            
            results.append({"content": f"{alert_text}\n{final_url}", "embed": embed, "view": view})
            
        return results
