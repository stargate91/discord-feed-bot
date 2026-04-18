import aiohttp
import discord
from datetime import datetime
from core.base_monitor import BaseMonitor
from logger import log
from core.emojis import THUMBNAIL_EPIC
import database

class EpicGamesMonitor(BaseMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.lang_code = bot.config.get("language", "hu")
        self.locale = "hu-HU" if self.lang_code == "hu" else "en-US"
        self.country = "HU" if self.lang_code == "hu" else "US"
        self.include_upcoming = config.get("include_upcoming", False)
        self.api_url = f"https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale={self.locale}&country={self.country}&allowCountries={self.country}"
        self.is_first_run = True

    def get_shared_key(self):
        return "epic_games_free"

    async def check_for_updates(self):
        """Fetch Epic Games free promotions JSON and look for new items."""
        
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            data = shared_data
        else:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.api_url) as response:
                        if response.status != 200:
                            log.error(f"Failed to fetch Epic Games API: {response.status}")
                            return
                        data = await response.json()
                        if data:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), data)
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
            title = game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
            
            promotions = game.get("promotions")
            if not promotions:
                continue

            active_offers = promotions.get("promotionalOffers", [])
            upcoming_offers = promotions.get("upcomingPromotionalOffers", [])

            is_active = False
            is_upcoming = False

            for offer_wrap in active_offers:
                for offer in offer_wrap.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        is_active = True
                        break

            if self.include_upcoming:
                for offer_wrap in upcoming_offers:
                    for offer in offer_wrap.get("promotionalOffers", []):
                        if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                            is_upcoming = True
                            break

            if not is_active and not is_upcoming:
                continue

            if is_active:
                price = game.get("price", {}).get("totalPrice", {})
                if price.get("discountPrice") != 0:
                    is_active = False

            if not is_active and not is_upcoming:
                continue

            status_type = "active" if is_active else "upcoming"
            db_id = f"{game_id}_{status_type}"

            if not await database.is_published(db_id, "epic_games"):
                if self.is_first_run:
                    log.debug(f"Seeding database with Epic Game: {title} ({status_type})")
                    await database.mark_as_published(db_id, "epic_games", self.api_url)
                else:
                    await self.send_game_notification(game, is_active)
                    await database.mark_as_published(db_id, "epic_games", self.api_url)

        if self.is_first_run:
            log.info(f"Initial seed completed for Epic Games Store. Monitoring active.")
            self.is_first_run = False

    async def send_game_notification(self, game, is_active):
        title = game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
        description = game.get("description", "")
        
        product_slug = game.get("productSlug") or next((m.get("pageSlug") for m in game.get("catalogNs", {}).get("mappings", [])), None) or game.get("urlSlug")
        game_url = f"https://store.epicgames.com/{self.lang_code}/p/{product_slug}" if product_slug else "https://store.epicgames.com/free-games"

        image_url = next((img.get("url") for img in game.get("keyImages", []) if img.get("type") in ["OfferImageWide", "featuredMedia", "OfferImageTall"]), None)
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

        embed = discord.Embed(
            title=title,
            url=game_url,
            description=description[:300] + "..." if len(description) > 300 else description,
            color=self.get_color()
        )
        if image_url: embed.set_image(url=image_url)
        embed.set_thumbnail(url=THUMBNAIL_EPIC)
        if original_price and original_price != "0" and original_price != self.bot.get_feedback("default_na", guild_id=self.guild_id):
            embed.add_field(name=self.bot.get_feedback("field_worth", guild_id=self.guild_id), value=original_price, inline=True)
        if expiry_ts:
            embed.add_field(name=self.bot.get_feedback("field_expiry", guild_id=self.guild_id), value=f"<t:{expiry_ts}:R>", inline=True)
        embed.set_footer(text="Epic Games Store")

        alert_key = "new_epic_games_alert" if is_active else "upcoming_free_game_alert"
        alert_text = self.bot.get_feedback(alert_key, name=title, guild_id=self.guild_id)
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_get_game", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link))
        
        await self.send_update(content=f"{alert_text}\n{game_url}", embed=embed, view=view)
        log.info(f"Sent Epic Games notification for: {title}")

    async def get_latest_item(self):
        """Fetch the most recent free game from Epic Games Store."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url) as response:
                    if response.status != 200: return None
                    data = await response.json()
            elements = data["data"]["Catalog"]["searchStore"]["elements"]
        except: return None

        target_game, is_active = None, False
        for game in elements:
            promotions = game.get("promotions")
            if not promotions: continue
            for offer_wrap in promotions.get("promotionalOffers", []):
                for offer in offer_wrap.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        target_game, is_active = game, True
                        break
                if target_game: break
            if target_game: break
            for offer_wrap in promotions.get("upcomingPromotionalOffers", []):
                for offer in offer_wrap.get("promotionalOffers", []):
                    if offer.get("discountSetting", {}).get("discountPercentage") == 0:
                        target_game, is_active = game, False
                        break
                if target_game: break
            if target_game: break

        if not target_game: return None

        title = target_game.get("title", self.bot.get_feedback("default_unknown", guild_id=self.guild_id))
        product_slug = target_game.get("productSlug") or next((m.get("pageSlug") for m in target_game.get("catalogNs", {}).get("mappings", [])), None) or target_game.get("urlSlug")
        game_url = f"https://store.epicgames.com/{self.lang_code}/p/{product_slug}" if product_slug else "https://store.epicgames.com/free-games"
        image_url = next((img.get("url") for img in target_game.get("keyImages", []) if img.get("type") in ["OfferImageWide", "featuredMedia", "OfferImageTall"]), None)
        original_price = target_game.get("price", {}).get("totalPrice", {}).get("fmtPrice", {}).get("originalPrice", self.bot.get_feedback("default_na", guild_id=self.guild_id))
        
        end_date_str = None
        offer_key = "promotionalOffers" if is_active else "upcomingPromotionalOffers"
        for offer_wrap in target_game.get("promotions", {}).get(offer_key, []):
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

        alert_key = "new_epic_games_alert" if is_active else "upcoming_free_game_alert"
        alert_text = self.get_alert_message({
            "name": title,
            "url": game_url
        })
        
        embed = discord.Embed(title=title, url=game_url, color=self.get_color())
        if image_url: embed.set_image(url=image_url)
        embed.set_thumbnail(url=THUMBNAIL_EPIC)
        if original_price and original_price != "0" and original_price != self.bot.get_feedback("default_na", guild_id=self.guild_id):
            embed.add_field(name=self.bot.get_feedback("field_worth", guild_id=self.guild_id), value=original_price, inline=True)
        if expiry_ts:
            embed.add_field(name=self.bot.get_feedback("field_expiry", guild_id=self.guild_id), value=f"<t:{expiry_ts}:R>", inline=True)
        embed.set_footer(text="Epic Games Store")
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_get_game", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link))
        
        return {"content": f"{alert_text}\n{game_url}", "embed": embed, "view": view}
