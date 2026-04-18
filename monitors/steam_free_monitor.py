import aiohttp
import discord
from datetime import datetime
from core.base_monitor import BaseMonitor
from logger import log
from core.emojis import THUMBNAIL_STEAM

import database

class SteamFreeMonitor(BaseMonitor):
    """Monitor for free Steam game giveaways via GamerPower API."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.include_dlc = config.get("include_dlc", False)
        self.api_url = "https://www.gamerpower.com/api/giveaways?platform=steam&sort-by=date"
        self.is_first_run = True

    def get_shared_key(self):
        return "steam_free_giveaways"

    async def check_for_updates(self):
        """Fetch GamerPower API and look for new Steam giveaways."""
        
        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            data = shared_data
        else:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.api_url) as response:
                        if response.status not in (200, 201):
                            log.error(f"Failed to fetch GamerPower API: {response.status}")
                            return
                        data = await response.json()
                        if data:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), data)
            except Exception as e:
                log.error(f"Error fetching Steam free games data: {e}")
                return
        
        if not isinstance(data, list):
            log.debug(f"Unexpected GamerPower API response for {self.name}")
            return

        new_entries = []
        for game in reversed(data):
            giveaway_id = str(game.get("id"))
            giveaway_type = game.get("type", "").lower()

            if not self.include_dlc and giveaway_type == "dlc":
                continue

            if not await database.is_published(giveaway_id, "steam_free"):
                if self.is_first_run:
                    log.debug(f"Seeding database with Steam giveaway: {game.get('title')}")
                    await database.mark_as_published(giveaway_id, "steam_free", self.api_url)
                else:
                    new_entries.append(game)
                    log.info(f"New Steam giveaway detected: {game.get('title')}")

        for game in new_entries:
            giveaway_id = str(game.get("id"))
            title = game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
            description = game.get("description", "")
            game_url = game.get("open_giveaway_url") or game.get("gamerpower_url", "")
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
                url=game_url,
                color=self.get_color(0x1B2838)  # Steam Dark Blue
            )
            if image_url:
                embed.set_image(url=image_url)
            
            embed.set_thumbnail(url=THUMBNAIL_STEAM)
            if worth and worth != na_text:
                embed.add_field(name=self.bot.get_feedback('field_worth', guild_id=self.guild_id), value=worth, inline=True)
            embed.add_field(name=self.bot.get_feedback('field_type', guild_id=self.guild_id), value=giveaway_type, inline=True)
            if expiry_ts:
                embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=f"<t:{expiry_ts}:R>", inline=True)
            elif end_date and end_date != na_text:
                embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=end_date, inline=True)
            
            embed.set_footer(text=f"{self.bot.get_feedback('footer_steam_news', guild_id=self.guild_id).split(' ')[0]} • GamerPower")
            
            # Format custom alert message
            alert_text = self.get_alert_message({
                "name": "Steam",
                "title": title,
                "url": game_url
            })
            
            # Create interactive button
            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_steam", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link))
            
            await self.send_update(content=f"{alert_text}\n{game_url}", embed=embed, view=view)
            await database.mark_as_published(giveaway_id, "steam_free", self.api_url)

    async def get_latest_item(self):
        """Fetch the most recent Steam giveaway from GamerPower."""
        import aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url) as response:
                    if response.status not in (200, 201):
                        return None
                    data = await response.json()
        except:
            return None

        if isinstance(data, dict) and data.get("status") == 0:
            return {"empty": True}

        if not isinstance(data, list) or not data:
            return {"empty": True}

        game = data[0]
        na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
        title = game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
        description = game.get("description", "")
        game_url = game.get("open_giveaway_url") or game.get("gamerpower_url", "")
        image_url = game.get("image") or game.get("thumbnail")
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
            url=game_url,
            color=self.get_color(0x1B2838) 
        )
        if image_url:
            embed.set_image(url=image_url)
            
        embed.set_thumbnail(url=THUMBNAIL_STEAM)
        if worth and worth != na_text:
            embed.add_field(name=self.bot.get_feedback('field_worth', guild_id=self.guild_id), value=worth, inline=True)
        embed.add_field(name=self.bot.get_feedback('field_type', guild_id=self.guild_id), value=giveaway_type, inline=True)
        if expiry_ts:
            embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=f"<t:{expiry_ts}:R>", inline=True)
        elif end_date and end_date != na_text:
            embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=end_date, inline=True)
        embed.set_footer(text=f"{self.bot.get_feedback('footer_steam_news', guild_id=self.guild_id).split(' ')[0]} • GamerPower")

        alert_text = self.get_alert_message({
            "name": "Steam",
            "title": title,
            "url": game_url
        })
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_steam", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{alert_text}\n{game_url}",
            "embed": embed,
            "view": view
        }
