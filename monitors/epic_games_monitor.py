import aiohttp
import discord
from datetime import datetime
from core.base_monitor import BaseMonitor
from logger import log
# Standard User-Agent to avoid being blocked
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
from core.emojis import THUMBNAIL_EPIC
import database as db
from core.ui_layouts import generate_free_game_layout

class EpicGamesMonitor(BaseMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.lang_code = bot.config.get("language", "hu")
        self.locale = "hu-HU" if self.lang_code == "hu" else "en-US"
        self.country = "HU" if self.lang_code == "hu" else "US"
        self.include_upcoming = config.get("include_upcoming", False)
        self.api_url = f"https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale={self.locale}&country={self.country}&allowCountries={self.country}"

    def get_shared_key(self):
        return "epic_games_free"

    async def fetch_new_items(self):
        """Fetch Epic Games entries. Filtering is handled by the manager."""
        shared_key = self.get_shared_key()
        data = self.bot.monitor_manager.get_shared_data(shared_key)
        
        if not data:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.api_url, headers={"User-Agent": USER_AGENT}) as response:
                        if response.status != 200:
                            log.error(f"Failed to fetch Epic Games API: {response.status}")
                            return []
                        data = await response.json()
                        if data:
                            self.bot.monitor_manager.set_shared_data(shared_key, data)
            except Exception as e:
                log.error(f"Error fetching Epic Games data: {e}")
                return []
        
        try:
            elements = data["data"]["Catalog"]["searchStore"]["elements"]
        except (KeyError, TypeError) as e:
            log.error(f"Unexpected Epic Games API structure: {e}")
            return []

        all_candidates = []
        for game in elements:
            game_id = game.get("id")
            title = game.get("title", "Unknown")
            
            promotions = game.get("promotions")
            if not promotions: continue

            active_offers = promotions.get("promotionalOffers", [])
            upcoming_offers = promotions.get("upcomingPromotionalOffers", [])

            is_active = False
            for offer_wrap in active_offers:
                for offer in offer_wrap.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        is_active = True; break
                if is_active: break

            is_upcoming = False
            if self.include_upcoming:
                for offer_wrap in upcoming_offers:
                    for offer in offer_wrap.get("promotionalOffers", []):
                        if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                            is_upcoming = True; break
                    if is_upcoming: break

            if not is_active and not is_upcoming: continue

            if is_active:
                price = game.get("price", {}).get("totalPrice", {})
                if price.get("discountPrice") != 0: is_active = False

            if not is_active and not is_upcoming: continue

            status_type = "active" if is_active else "upcoming"
            db_id = f"{game_id}_{status_type}"

            all_candidates.append({
                "game": game,
                "is_active": is_active,
                "db_id": db_id
            })

        return list(reversed(all_candidates))

    async def process_item(self, item):
        game = item["game"]
        is_active = item["is_active"]
        
        title = game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
        title = f"<:epic_games:1490131410852253716> {title}"
        description = game.get("description", "")
        
        product_slug = game.get("productSlug") or next((m.get("pageSlug") for m in game.get("catalogNs", {}).get("mappings", [])), None) or game.get("urlSlug")
        game_url = f"https://store.epicgames.com/{self.lang_code}/p/{product_slug}" if product_slug else "https://store.epicgames.com/free-games"

        image_url = next((img.get("url") for img in game.get("keyImages", []) if img.get("type") in ["OfferImageWide", "featuredMedia", "OfferImageTall"]), None)
        if image_url:
            image_url += "&w=460&resize=1" if "?" in image_url else "?w=460&resize=1"
        original_price = game.get("price", {}).get("totalPrice", {}).get("fmtPrice", {}).get("originalPrice", self.bot.get_feedback("default_na", guild_id=self.guild_id))
        
        end_date_str = None
        offer_key = "promotionalOffers" if is_active else "upcomingPromotionalOffers"
        for offer_wrap in game.get("promotions", {}).get(offer_key, []):
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
            except: pass

        alert_text = self.get_alert_message({
            "name": "Epic Games",
            "title": title,
            "url": game_url
        })
        
        content, layout = generate_free_game_layout(
            bot=self.bot,
            guild_id=self.guild_id,
            alert_text=alert_text,
            title=title,
            game_url=game_url,
            image_url=image_url,
            worth=original_price,
            giveaway_type="Game",
            expiry_ts=expiry_ts,
            accent_color=self.get_color(0x3d3f45)
        )
        
        await self.send_update(content=content, view=layout)

    def get_item_id(self, item):
        return item.get("db_id")

    async def mark_items_published(self, items):
        for item in items:
            game = item["game"]
            title = game.get("title", "Unknown Game")
            image_url = next((img.get("url") for img in game.get("keyImages", []) if img.get("type") in ["OfferImageWide", "featuredMedia", "OfferImageTall"]), None)
            await db.mark_as_published(
                item["db_id"], "epic_games", self.api_url,
                guild_id=self.guild_id,
                title=title,
                thumbnail_url=image_url,
                author_name="Epic Games"
            )

    async def get_latest_item(self):
        """Wrapper for get_latest_items(1)"""
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        """Fetch the N most recent free games from Epic Games Store."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url, headers={"User-Agent": USER_AGENT}) as response:
                    if response.status != 200: return []
                    data = await response.json()
            elements = data["data"]["Catalog"]["searchStore"]["elements"]
        except: return []

        results = []
        for game in elements:
            if len(results) >= count: break
            
            promotions = game.get("promotions")
            if not promotions: continue

            active_offers = promotions.get("promotionalOffers", [])
            upcoming_offers = promotions.get("upcomingPromotionalOffers", [])

            is_active = False
            for offer_wrap in active_offers:
                for offer in offer_wrap.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        is_active = True; break
                if is_active: break

            if Price := game.get("price", {}).get("totalPrice", {}):
                if Price.get("discountPrice") != 0: is_active = False

            is_upcoming = False
            if not is_active and self.include_upcoming:
                for offer_wrap in upcoming_offers:
                    for offer in offer_wrap.get("promotionalOffers", []):
                        if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                            is_upcoming = True; break
                    if is_upcoming: break

            if not is_active and not is_upcoming: continue

            title = game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
            title = f"<:epic_games:1490131410852253716> {title}"
            description = game.get("description", "")
            product_slug = game.get("productSlug") or next((m.get("pageSlug") for m in game.get("catalogNs", {}).get("mappings", [])), None) or game.get("urlSlug")
            game_url = f"https://store.epicgames.com/{self.lang_code}/p/{product_slug}" if product_slug else "https://store.epicgames.com/free-games"
            image_url = next((img.get("url") for img in game.get("keyImages", []) if img.get("type") in ["OfferImageWide", "featuredMedia", "OfferImageTall"]), None)
            if image_url:
                image_url += "&w=460&resize=1" if "?" in image_url else "?w=460&resize=1"
            original_price = game.get("price", {}).get("totalPrice", {}).get("fmtPrice", {}).get("originalPrice", self.bot.get_feedback("default_na", guild_id=self.guild_id))
            
            end_date_str = None
            offer_key = "promotionalOffers" if is_active else "upcomingPromotionalOffers"
            for offer_wrap in game.get("promotions", {}).get(offer_key, []):
                for offer in offer_wrap.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        end_date_str = offer.get("endDate"); break
                if end_date_str: break
            
            expiry_ts = None
            if end_date_str:
                try:
                    dt = datetime.strptime(end_date_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                    expiry_ts = int(dt.timestamp())
                except: pass

            alert_text = self.get_alert_message({"name": "Epic Games", "title": title, "url": game_url})
            
            content, layout = generate_free_game_layout(
                bot=self.bot,
                guild_id=self.guild_id,
                alert_text=alert_text,
                title=title,
                game_url=game_url,
                image_url=image_url,
                worth=original_price,
                giveaway_type="Game",
                expiry_ts=expiry_ts,
                accent_color=self.get_color(0x3d3f45)
            )
            
            results.append({"content": content, "view": layout})
            
        # Reverse to get Oldest -> Newest (sequential reposting)
        results.reverse()
        return results
