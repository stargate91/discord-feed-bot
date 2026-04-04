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

            if not is_active and not is_upcoming:
                continue

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
        
        # Link construction priority: productSlug > pageSlug from mappings > urlSlug
        product_slug = game.get("productSlug")
        if not product_slug:
            mappings = game.get("catalogNs", {}).get("mappings", [])
            if mappings:
                product_slug = mappings[0].get("pageSlug")
        
        # Fallback to urlSlug if still None
        if not product_slug:
            product_slug = game.get("urlSlug")
        
        if product_slug:
            game_url = f"https://store.epicgames.com/{self.lang_code}/p/{product_slug}"
        else:
            game_url = "https://store.epicgames.com/free-games"

        # Image selection
        image_url = None
        for img in game.get("keyImages", []):
            if img.get("type") in ["OfferImageWide", "featuredMedia", "OfferImageTall"]:
                image_url = img.get("url")
                break

        # Extraction logic for Price, Expiry and Tags
        original_price = game.get("price", {}).get("totalPrice", {}).get("fmtPrice", {}).get("originalPrice", "N/A")
        
        end_date_str = None
        promotions = game.get("promotions", {})
        offer_key = "promotionalOffers" if is_active else "upcomingPromotionalOffers"
        for offer_wrap in promotions.get(offer_key, []):
            for offer in offer_wrap.get("promotionalOffers", []):
                if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                    end_date_str = offer.get("endDate")
                    break
            if end_date_str: break
            
        expiry_ts = None
        if end_date_str:
            try:
                dt = datetime.strptime(end_date_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                expiry_ts = int(dt.timestamp())
            except:
                pass

        # Tags extraction
        tags = game.get("tags", [])
        genre_list = [tag.get("name") for tag in tags if tag.get("name")]
        genres = ", ".join(genre_list) if genre_list else None

        alert_key = "new_free_game_alert" if is_active else "upcoming_free_game_alert"
        alert_text = self.lang.get(alert_key, "Ingyenes játék!")
        
        embed = discord.Embed(
            title=title,
            url=game_url,
            color=0x000000 
        )
        if image_url:
            embed.set_image(url=image_url)
            
        # Add Fields
        if original_price and original_price != "0" and original_price != "N/A":
            embed.add_field(name=self.lang.get("field_worth", "Price"), value=original_price, inline=True)
            
        if expiry_ts:
            embed.add_field(name=self.lang.get("field_expiry", "Expiry"), value=f"<t:{expiry_ts}:R>", inline=True)
        
        if genres:
            embed.add_field(name=self.lang.get("field_genres", "Genres"), value=genres, inline=False)
        
        embed.set_footer(text="Epic Games Store")
        
        ping = f"{self.ping_role} " if self.ping_role else ""
        
        view = discord.ui.View()
        btn_label = self.lang.get("btn_get_game", "Get Game")
        view.add_item(discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link))
        
        await self.send_update(content=f"{ping}{alert_text}\n{game_url}", embed=embed, view=view)
        log.info(f"Sent Epic Games notification for: {title} ({'active' if is_active else 'upcoming'})")

    async def get_latest_item(self):
        """Fetch the most recent free game from Epic Games Store."""
        import aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url) as response:
                    if response.status != 200:
                        return None
                    data = await response.json()
            elements = data["data"]["Catalog"]["searchStore"]["elements"]
        except:
            return None

        # Find the first active or upcoming free game
        target_game = None
        is_active = False
        
        for game in elements:
            promotions = game.get("promotions")
            if not promotions: continue
            
            # Check active
            for offer_wrap in promotions.get("promotionalOffers", []):
                for offer in offer_wrap.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        target_game = game
                        is_active = True
                        break
                if target_game: break
            
            if target_game: break
            
            # Check upcoming if active not found
            for offer_wrap in promotions.get("upcomingPromotionalOffers", []):
                for offer in offer_wrap.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        target_game = game
                        is_active = False
                        break
                if target_game: break
            
            if target_game: break

        if not target_game:
            return None

        title = target_game.get("title", "Unknown Game")
        # Link construction priority: productSlug > pageSlug from mappings > urlSlug
        product_slug = target_game.get("productSlug")
        if not product_slug:
            mappings = target_game.get("catalogNs", {}).get("mappings", [])
            if mappings:
                product_slug = mappings[0].get("pageSlug")
        
        # Fallback to urlSlug if still None
        if not product_slug:
            product_slug = target_game.get("urlSlug")
            
        game_url = f"https://store.epicgames.com/{self.lang_code}/p/{product_slug}" if product_slug else "https://store.epicgames.com/free-games"
        
        # Image selection
        image_url = None
        for img in target_game.get("keyImages", []):
            if img.get("type") in ["OfferImageWide", "featuredMedia", "OfferImageTall"]:
                image_url = img.get("url")
                break
        
        # Extraction logic
        original_price = target_game.get("price", {}).get("totalPrice", {}).get("fmtPrice", {}).get("originalPrice", "N/A")
        
        end_date_str = None
        promotions = target_game.get("promotions", {})
        offer_key = "promotionalOffers" if is_active else "upcomingPromotionalOffers"
        for offer_wrap in promotions.get(offer_key, []):
            for offer in offer_wrap.get("promotionalOffers", []):
                if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                    end_date_str = offer.get("endDate")
                    break
            if end_date_str: break
            
        expiry_ts = None
        if end_date_str:
            try:
                dt = datetime.strptime(end_date_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                expiry_ts = int(dt.timestamp())
            except:
                pass

        # Tags extraction
        tags = target_game.get("tags", [])
        genre_list = [tag.get("name") for tag in tags if tag.get("name")]
        genres = ", ".join(genre_list) if genre_list else None

        alert_key = "new_free_game_alert" if is_active else "upcoming_free_game_alert"
        alert_text = self.lang.get(alert_key, "Ingyenes játék!")
        
        embed = discord.Embed(
            title=title,
            url=game_url,
            color=0x000000 
        )
        if image_url:
            embed.set_image(url=image_url)
            
        # Add Fields
        if original_price and original_price != "0" and original_price != "N/A":
            embed.add_field(name=self.lang.get("field_worth", "Price"), value=original_price, inline=True)
            
        if expiry_ts:
            embed.add_field(name=self.lang.get("field_expiry", "Expiry"), value=f"<t:{expiry_ts}:R>", inline=True)
            
        if genres:
            embed.add_field(name=self.lang.get("field_genres", "Genres"), value=genres, inline=False)
            
        embed.set_footer(text="Epic Games Store")
        
        ping = f"{self.ping_role} " if self.ping_role else ""
        view = discord.ui.View()
        btn_label = self.lang.get("btn_get_game", "Get Game")
        view.add_item(discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{ping}{alert_text}\n{game_url}",
            "embed": embed,
            "view": view
        }
