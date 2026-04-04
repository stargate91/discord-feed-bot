import aiohttp
import discord
from core.base_monitor import BaseMonitor
from logger import log

class SteamFreeMonitor(BaseMonitor):
    """Monitor for free Steam game giveaways via GamerPower API."""
    
    def __init__(self, bot, config, db, language_data):
        super().__init__(bot, config, db)
        self.include_dlc = config.get("include_dlc", False)
        self.api_url = "https://www.gamerpower.com/api/giveaways?platform=steam&sort-by=date"
        self.lang = language_data
        self.is_first_run = True

    async def check_for_updates(self):
        """Fetch GamerPower API and look for new Steam giveaways."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url) as response:
                    if response.status != 200:
                        log.error(f"Failed to fetch GamerPower API: {response.status}")
                        return
                    data = await response.json()
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

            # Skip DLC if not configured to include it
            if not self.include_dlc and giveaway_type == "dlc":
                continue

            if not await self.db.is_published(giveaway_id, "steam_free"):
                if self.is_first_run:
                    log.debug(f"Seeding database with Steam giveaway: {game.get('title')}")
                    await self.db.mark_as_published(giveaway_id, "steam_free", self.api_url)
                else:
                    new_entries.append(game)
                    log.info(f"New Steam giveaway detected: {game.get('title')}")

        for game in new_entries:
            giveaway_id = str(game.get("id"))
            title = game.get("title", "Unknown Game")
            description = game.get("description", "")
            game_url = game.get("open_giveaway_url") or game.get("gamerpower_url", "")
            image_url = game.get("image") or game.get("thumbnail")
            worth = game.get("worth", "N/A")
            giveaway_type = game.get("type", "Game")
            end_date = game.get("end_date", "N/A")

            embed = discord.Embed(
                title=title,
                description=description[:2048],
                url=game_url,
                color=0x1B2838  # Steam Dark Blue
            )
            if image_url:
                embed.set_image(url=image_url)
            if worth and worth != "N/A":
                embed.add_field(name=f"💰 {self.lang.get('field_worth', 'Érték')}", value=worth, inline=True)
            embed.add_field(name=f"📦 {self.lang.get('field_type', 'Típus')}", value=giveaway_type, inline=True)
            if end_date and end_date != "N/A":
                embed.add_field(name=f"⏰ {self.lang.get('field_expiry', 'Lejárat')}", value=end_date, inline=True)
            embed.set_footer(text="Steam • GamerPower")

            alert_text = self.lang.get("new_steam_free_alert", "Ingyenes Steam loot érkezett!")
            ping = f"{self.ping_role} " if self.ping_role else ""
            
            # Create interactive button
            view = discord.ui.View()
            btn_label = self.lang.get("btn_view_steam", "Watch on Steam")
            view.add_item(discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link))
            
            await self.send_update(content=f"{ping}{alert_text}\n{game_url}", embed=embed, view=view)
            await self.db.mark_as_published(giveaway_id, "steam_free", self.api_url)

        if self.is_first_run:
            log.info(f"Initial seed completed for Steam Free Games. Monitoring active.")
            self.is_first_run = False
