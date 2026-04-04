import aiohttp
import discord
from datetime import datetime
from core.base_monitor import BaseMonitor
from logger import log

class EpicGamesMonitor(BaseMonitor):
    def __init__(self, bot, config, db, language_data):
        super().__init__(bot, config, db)
        self.lang_code = bot.config.get("language", "hu")
        self.locale = "hu-HU" if self.lang_code == "hu" else "en-US"
        self.country = "HU" if self.lang_code == "hu" else "US"
        self.include_upcoming = config.get("include_upcoming", False)
        self.api_url = f"https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale={self.locale}&country={self.country}&allowCountries={self.country}"
        self.lang = language_data
        self.is_first_run = True

    async def check_for_updates(self):
        """Fetch Epic Games free promotions JSON and look for new items."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url) as response:
                    if response.status != 200:
                        log.error(f"Failed to fetch Epic Games API: {response.status}")
                        return
                    data = await response.json()
        except Exception as e:
            log.error(f"Error fetching Epic Games data: {e}")
            return

        try:
            elements = data["data"]["Catalog"]["searchStore"]["elements"]
        except (KeyError, TypeError) as e:
            log.error(f"Unexpected Epic Games API structure: {e}")
            return

        for game in elements:
            game_id = game.get("id")
            title = game.get("title", "Unknown Game")
            description = game.get("description", "")
            
            # Identify promotions
            promotions = game.get("promotions")
            if not promotions:
                continue

            active_offers = promotions.get("promotionalOffers", [])
            upcoming_offers = promotions.get("upcomingPromotionalOffers", [])

            is_active = False
            is_upcoming = False

            # Check for current active free offer (100% discount)
            for offer_wrap in active_offers:
                for offer in offer_wrap.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        is_active = True
                        break

            # Check for upcoming free offer
            if self.include_upcoming:
                for offer_wrap in upcoming_offers:
                    for offer in offer_wrap.get("promotionalOffers", []):
                        if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                            is_upcoming = True
                            break

            if not is_active and not is_upcoming:
                continue

            # Check price as secondary verification for active games
            if is_active:
                price = game.get("price", {}).get("totalPrice", {})
                if price.get("discountPrice") != 0:
                    is_active = False # Not actually free right now

            status_type = "active" if is_active else "upcoming"
            # Unique ID for DB (combine game_id and status to allow notifying both when upcoming and when active)
            db_id = f"{game_id}_{status_type}"

            if not await self.db.is_published(db_id, "epic_games"):
                if self.is_first_run:
                    log.debug(f"Seeding database with Epic Game: {title} ({status_type})")
                    await self.db.mark_as_published(db_id, "epic_games", self.api_url)
                else:
                    await self.send_game_notification(game, is_active)
                    await self.db.mark_as_published(db_id, "epic_games", self.api_url)

        if self.is_first_run:
            log.info(f"Initial seed completed for Epic Games Store. Monitoring active.")
            self.is_first_run = False

    async def send_game_notification(self, game, is_active):
        title = game.get("title", "Unknown Game")
        description = game.get("description", "")
        
        # Link construction
        product_slug = game.get("productSlug") or game.get("urlSlug")
        if not product_slug and game.get("catalogNs", {}).get("mappings"):
            product_slug = game.get("catalogNs", {}).get("mappings", [{}])[0].get("pageSlug")
        
        if product_slug:
            game_url = f"https://store.epicgames.com/{self.lang_code}/p/{product_slug}"
        else:
            game_url = "https://store.epicgames.com/free-games"

        # Image selection (prefer 'OfferImageWide' or 'featuredMedia')
        image_url = None
        for img in game.get("keyImages", []):
            if img.get("type") in ["OfferImageWide", "featuredMedia", "OfferImageTall"]:
                image_url = img.get("url")
                break

        alert_key = "new_free_game_alert" if is_active else "upcoming_free_game_alert"
        alert_text = self.lang.get(alert_key, "Ingyenes játék!")
        
        embed = discord.Embed(
            title=title,
            description=description[:2048],
            url=game_url,
            color=0x000000 # Epic Games Black
        )
        if image_url:
            embed.set_image(url=image_url)
        
        embed.set_footer(text="Epic Games Store")
        
        ping = f"{self.ping_role} " if self.ping_role else ""
        await self.send_update(content=f"{ping}{alert_text}\n{game_url}", embed=embed)
        log.info(f"Sent Epic Games notification for: {title} ({'active' if is_active else 'upcoming'})")
