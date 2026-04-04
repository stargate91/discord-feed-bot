import aiohttp
import discord
from core.base_monitor import BaseMonitor
from logger import log

class GOGFreeMonitor(BaseMonitor):
    """Monitor for free GOG game giveaways via GOG catalog API and GamerPower."""
    
    def __init__(self, bot, config, db, language_data):
        super().__init__(bot, config, db)
        # GOG catalog API for currently free games
        self.gog_api_url = "https://catalog.gog.com/v1/catalog?limit=50&price=between:0,0&order=desc:trending&productType=in:game,pack"
        # GamerPower as secondary source (covers temporary giveaways)
        self.gamerpower_url = "https://www.gamerpower.com/api/giveaways?sort-by=date"
        self.lang = language_data
        self.is_first_run = True

    async def check_for_updates(self):
        """Check both GOG catalog and GamerPower for free GOG games."""
        await self._check_gog_catalog()
        await self._check_gamerpower()

        if self.is_first_run:
            log.info(f"Initial seed completed for GOG Free Games. Monitoring active.")
            self.is_first_run = False

    async def _check_gog_catalog(self):
        """Check GOG's own catalog API for free games."""
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            async with aiohttp.ClientSession() as session:
                async with session.get(self.gog_api_url, headers=headers) as response:
                    if response.status != 200:
                        log.debug(f"GOG catalog API returned {response.status}")
                        return
                    data = await response.json()
        except Exception as e:
            log.error(f"Error fetching GOG catalog: {e}")
            return

        products = data.get("products", [])
        for product in reversed(products):
            product_id = str(product.get("id", ""))
            if not product_id:
                continue

            db_id = f"gog_catalog_{product_id}"
            if not await self.db.is_published(db_id, "gog_free"):
                if self.is_first_run:
                    log.debug(f"Seeding GOG catalog: {product.get('title')}")
                    await self.db.mark_as_published(db_id, "gog_free", self.gog_api_url)
                else:
                    await self._send_gog_catalog_notification(product)
                    await self.db.mark_as_published(db_id, "gog_free", self.gog_api_url)

    async def _check_gamerpower(self):
        """Check GamerPower for GOG giveaways (temporary promotions)."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.gamerpower_url) as response:
                    if response.status != 200:
                        log.debug(f"GamerPower API returned {response.status}")
                        return
                    data = await response.json()
        except Exception as e:
            log.error(f"Error fetching GamerPower data for GOG: {e}")
            return

        if not isinstance(data, list):
            return

        for game in reversed(data):
            platforms = game.get("platforms", "").lower()
            if "gog" not in platforms:
                continue

            giveaway_id = str(game.get("id"))
            db_id = f"gamerpower_gog_{giveaway_id}"

            if not await self.db.is_published(db_id, "gog_free"):
                if self.is_first_run:
                    log.debug(f"Seeding GamerPower GOG: {game.get('title')}")
                    await self.db.mark_as_published(db_id, "gog_free", self.gamerpower_url)
                else:
                    await self._send_gamerpower_notification(game)
                    await self.db.mark_as_published(db_id, "gog_free", self.gamerpower_url)

    async def _send_gog_catalog_notification(self, product):
        """Send notification for a free game found in GOG's catalog."""
        title = product.get("title", "Unknown Game")
        slug = product.get("slug", "")
        game_url = f"https://www.gog.com/en/game/{slug}" if slug else "https://www.gog.com"

        # Image
        cover_url = None
        if product.get("coverHorizontal"):
            cover_url = f"https:{product['coverHorizontal']}" if product['coverHorizontal'].startswith("//") else product['coverHorizontal']

        embed = discord.Embed(
            title=title,
            url=game_url,
            color=0x86328A  # GOG Purple
        )
        if cover_url:
            embed.set_image(url=cover_url)
        embed.set_footer(text="GOG.com")

        alert_text = self.lang.get("new_gog_free_alert", "Ingyenes GOG játék érkezett!")
        ping = f"{self.ping_role} " if self.ping_role else ""
        
        # Create interactive button
        view = discord.ui.View()
        btn_label = self.lang.get("btn_view_gog", "Watch on GOG")
        view.add_item(discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link))
        
        await self.send_update(content=f"{ping}{alert_text}\n{game_url}", embed=embed, view=view)
        log.info(f"Sent GOG catalog notification for: {title}")

    async def _send_gamerpower_notification(self, game):
        """Send notification for a GOG giveaway found via GamerPower."""
        title = game.get("title", "Unknown Game")
        description = game.get("description", "")
        game_url = game.get("open_giveaway_url") or game.get("gamerpower_url", "")
        image_url = game.get("image") or game.get("thumbnail")
        worth = game.get("worth", "N/A")
        end_date = game.get("end_date", "N/A")

        embed = discord.Embed(
            title=title,
            description=description[:2048],
            url=game_url,
            color=0x86328A  # GOG Purple
        )
        if image_url:
            embed.set_image(url=image_url)
        if worth and worth != "N/A":
            embed.add_field(name=f"💰 {self.lang.get('field_worth', 'Érték')}", value=worth, inline=True)
        if end_date and end_date != "N/A":
            embed.add_field(name=f"⏰ {self.lang.get('field_expiry', 'Lejárat')}", value=end_date, inline=True)
        embed.set_footer(text="Gog.com • GamerPower")

        alert_text = self.lang.get("new_gog_free_alert", "Ingyenes GOG játék érkezett!")
        ping = f"{self.ping_role} " if self.ping_role else ""

        # Create interactive button
        view = discord.ui.View()
        btn_label = self.lang.get("btn_view_gog", "Watch on GOG")
        view.add_item(discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link))

        await self.send_update(content=f"{ping}{alert_text}\n{game_url}", embed=embed, view=view)
        log.info(f"Sent GOG GamerPower notification for: {title}")
