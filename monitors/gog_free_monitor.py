import aiohttp
import discord
from datetime import datetime
from core.base_monitor import BaseMonitor
from logger import log
import database

class GOGFreeMonitor(BaseMonitor):
    """Monitor for free GOG game giveaways via GamerPower API."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.api_url = "https://www.gamerpower.com/api/giveaways?platform=gog&sort-by=date"
        self.is_first_run = True

    def get_shared_key(self):
        return "gog_free_giveaways"

    async def check_for_updates(self):
        """Fetch GamerPower API and look for new GOG giveaways."""
        
        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            data = shared_data
        else:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.api_url) as response:
                        if response.status not in (200, 201):
                            log.error(f"Failed to fetch GamerPower API for GOG: {response.status}")
                            return
                        data = await response.json()
                        if data:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), data)
            except Exception as e:
                log.error(f"Error fetching GOG free games data: {e}")
                return
        
        if isinstance(data, dict) and data.get("status") == 0:
            # Expected empty response from GamerPower when no giveaways exist
            return

        if not isinstance(data, list):
            log.debug(f"Unexpected GamerPower API response for GOG")
            return

        new_entries = []
        for game in reversed(data):
            giveaway_id = str(game.get("id"))
            
            if not await database.is_published(giveaway_id, "gog_free"):
                if self.is_first_run:
                    log.debug(f"Seeding database with GOG giveaway: {game.get('title')}")
                    await database.mark_as_published(giveaway_id, "gog_free", self.api_url)
                else:
                    new_entries.append(game)
                    log.info(f"New GOG giveaway detected: {game.get('title')}")

        for game in new_entries:
            giveaway_id = str(game.get("id"))
            title = game.get("title", "Unknown Game")
            game_url = game.get("open_giveaway_url") or game.get("gamerpower_url", "")
            
            # Link logic: Avoid Steam links in GOG monitor
            is_steam_link = "steampowered.com" in game_url.lower() or "steamcommunity.com" in game_url.lower()
            final_url = game.get("gamerpower_url", game_url) if is_steam_link else game_url

            image_url = game.get("image") or game.get("thumbnail")
            worth = game.get("worth", "N/A")
            giveaway_type = game.get("type", "Game")
            end_date = game.get("end_date", "N/A")
            expiry_ts = None
            if end_date and end_date != "N/A":
                try:
                    dt = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S")
                    expiry_ts = int(dt.timestamp())
                except:
                    pass

            embed = discord.Embed(
                title=title,
                url=final_url,
                color=self.get_color(0x86328A)  # GOG Purple
            )
            if image_url:
                embed.set_image(url=image_url)
                
            embed.set_thumbnail(url="https://cdn.discordapp.com/emojis/1490131412043431976.png")
            
            if worth and worth != "N/A":
                embed.add_field(name=self.bot.get_feedback('field_worth', guild_id=self.guild_id), value=worth, inline=True)
            embed.add_field(name=self.bot.get_feedback('field_type', guild_id=self.guild_id), value=giveaway_type, inline=True)
            if expiry_ts:
                embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=f"<t:{expiry_ts}:R>", inline=True)
            elif end_date and end_date != "N/A":
                embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=end_date, inline=True)
            embed.set_footer(text="GOG.com • GamerPower")

            # Format custom alert message
            alert_text = self.get_alert_message({
                "name": "GOG",
                "title": title,
                "url": final_url
            })
            
            # Create interactive button
            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_gog", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=final_url, style=discord.ButtonStyle.link))
            
            await self.send_update(content=f"{alert_text}\n{final_url}", embed=embed, view=view)
            await database.mark_as_published(giveaway_id, "gog_free", self.api_url)

    async def get_latest_item(self):
        """Fetch the most recent GOG giveaway from GamerPower."""
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
        title = game.get("title", "Unknown Game")
        game_url = game.get("open_giveaway_url") or game.get("gamerpower_url", "")
        
        # Link logic: Avoid Steam links in GOG monitor
        is_steam_link = "steampowered.com" in game_url.lower() or "steamcommunity.com" in game_url.lower()
        final_url = game.get("gamerpower_url", game_url) if is_steam_link else game_url
        
        image_url = game.get("image") or game.get("thumbnail")
        worth = game.get("worth", "N/A")
        giveaway_type = game.get("type", "Game")
        end_date = game.get("end_date", "N/A")
        expiry_ts = None
        if end_date and end_date != "N/A":
            try:
                dt = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S")
                expiry_ts = int(dt.timestamp())
            except:
                pass

        embed = discord.Embed(
            title=title,
            url=final_url,
            color=self.get_color(0x86328A) 
        )
        if image_url:
            embed.set_image(url=image_url)
            
        embed.set_thumbnail(url="https://cdn.discordapp.com/emojis/1490131412043431976.png")
        
        if worth and worth != "N/A":
            embed.add_field(name=self.bot.get_feedback('field_worth', guild_id=self.guild_id), value=worth, inline=True)
        embed.add_field(name=self.bot.get_feedback('field_type', guild_id=self.guild_id), value=giveaway_type, inline=True)
        if expiry_ts:
            embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=f"<t:{expiry_ts}:R>", inline=True)
        elif end_date and end_date != "N/A":
            embed.add_field(name=self.bot.get_feedback('field_expiry', guild_id=self.guild_id), value=end_date, inline=True)
        embed.set_footer(text="GOG.com • GamerPower")

        alert_text = self.bot.get_feedback("new_gog_free_alert", guild_id=self.guild_id)
        ping = f"{self.ping_role} " if self.ping_role else ""
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_gog", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=final_url, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{ping}{alert_text}\n{final_url}",
            "embed": embed,
            "view": view
        }
