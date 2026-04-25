import aiohttp
import discord
import textwrap
from core.base_monitor import BaseMonitor
from logger import log
import database
from core.emojis import ICON_STAR

class TVSeriesMonitor(BaseMonitor):
    """Monitor for TV series updates via TMDB."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.bearer_token = bot.config.get("tmdb_bearer_token")
        self.api_key = bot.config.get("tmdb_api_key") # Fallback
        
        # Get server language for TMDB API
        self.tmdb_lang = bot.get_feedback("tmdb_lang_code", guild_id=self.guild_id)
        
        self.is_first_run = True

    def get_headers(self):
        if self.bearer_token:
            return {"Authorization": f"Bearer {self.bearer_token}"}
        return {}

    def get_api_url(self, endpoint):
        """Build URL with language and fallback auth."""
        url = f"https://api.themoviedb.org/3/{endpoint}?language={self.tmdb_lang}"
        if not self.bearer_token and self.api_key:
            url += f"&api_key={self.api_key}"
        return url

    def get_shared_key(self):
        return "tmdb_tv_trending"

    async def fetch_new_items(self):
        """Fetch trending items and look for new IDs."""
        if not self.api_key:
            log.warning("No TMDB API key provided.")
            return []

        # Check for shared data
        shared_key = f"{self.get_shared_key()}:{self.tmdb_lang}"
        shared_data = self.bot.monitor_manager.get_shared_data(shared_key)
        if shared_data:
            trending = shared_data
        else:
            try:
                url = self.get_api_url("trending/tv/day")
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, headers=self.get_headers()) as response:
                        if response.status != 200:
                            log.error(f"Failed to fetch TMDB Trending: {response.status}")
                            return []
                        data = await response.json()
                        trending = data.get("results", [])
                        if trending:
                            self.bot.monitor_manager.set_shared_data(shared_key, trending)
            except Exception as e:
                log.error(f"Error fetching TMDB data: {e}")
                return []

        if not trending:
            return []

        all_candidates = []
        for series in trending:
            series_id = str(series.get("id"))
            if not series_id: continue

            # Determine if we should seed (silent save) or post
            # Silent Seeding logic: Always silent-seed the entire feed on the very first run after bot startup/sync
            # This prevents "spam walls" of old items being detected as new.
            if self.is_first_run:
                await database.mark_as_published(
                    series_id, 
                    "tmdb_tv", 
                    f"https://www.themoviedb.org/tv/{series_id}", 
                    guild_id=self.guild_id, 
                    title=series.get("name") or series.get("original_name")
                )
            else:
                all_candidates.append(series)

        if self.is_first_run:
            log.info(f"Initial silent seed (first run) completed for TV Series monitor: {self.name}")
            self.is_first_run = False
            return []

        return list(reversed(all_candidates))

    async def process_item(self, series):
        target_genres = self.config.get("target_genres", [])
        if target_genres:
            item_genres = [str(g) for g in series.get("genre_ids", [])]
            
            # Map asian animations to the custom '9999' Anime genre
            orig_lang = series.get("original_language", "")
            if orig_lang in ["ja", "zh", "ko"] and "16" in item_genres:
                item_genres.append("9999")
                
            # If no intersection between target genres and series genres, skip posting to this target
            if not any(g in target_genres for g in item_genres):
                return

        target_languages = self.config.get("target_languages", [])
        if target_languages:
            orig_lang = series.get("original_language", "")
            if orig_lang not in target_languages:
                return

        genre_map = await self._fetch_genres()

        series_id = str(series.get("id"))
        name = series.get("name", "")
        overview = series.get("overview", "")
        first_air_date = series.get("first_air_date", self.bot.get_feedback("default_na", guild_id=self.guild_id))

        if (not name or not overview) and self.tmdb_lang != "en-US":
            en_data = await self._get_en_fallback("tv", series_id)
            if not name: name = en_data.get("name", "")
            if not overview: overview = en_data.get("overview", "")
        if not name: name = series.get("original_name", "")
        if not overview:
            orig_data = await self._get_en_fallback("tv", series_id, original=True)
            overview = orig_data.get("overview", "")
        if not name: name = self.bot.get_feedback("monitor_tv_fallback_title", guild_id=self.guild_id)
        
        genre_ids = series.get("genre_ids", [])
        genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
        genre_text = ", ".join(genre_names) if genre_names else None

        vote_avg = series.get("vote_average", 0)
        vote_count = series.get("vote_count", 0)
        na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
        score_text = f"{ICON_STAR} {vote_avg:.1f} ({vote_count})" if vote_count > 0 else na_text

        poster_path = series.get("poster_path")
        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
        tmdb_url = f"https://www.themoviedb.org/tv/{series_id}"
        
        trailer_url = await self._get_trailer_url(series_id)

        alert_text = self.get_alert_message({
            "name": self.bot.get_feedback("monitor_platform_tv", guild_id=self.guild_id),
            "title": name,
            "url": tmdb_url
        })


        embed = discord.Embed(
            title=name[:256],
            url=tmdb_url,
            
            color=self.get_color(0x3d3f45)
        )
        if poster_url: embed.set_image(url=poster_url)
        
        if genre_text:
            wrapped_genres = textwrap.fill(genre_text, width=32)
            embed.add_field(name=self.bot.get_feedback("field_genres", guild_id=self.guild_id), value=wrapped_genres, inline=False)
        
        embed.add_field(name=self.bot.get_feedback("field_release_date", guild_id=self.guild_id), value=first_air_date, inline=True)
        embed.add_field(name=self.bot.get_feedback("field_score", guild_id=self.guild_id), value=score_text, inline=True)
        
        embed.set_footer(text=self.bot.get_feedback("footer_tmdb", date=first_air_date, guild_id=self.guild_id))

        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_tmdb", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=tmdb_url, style=discord.ButtonStyle.link))
        if trailer_url:
            t_label, t_emoji = self.bot.parse_emoji_text(self.bot.get_feedback("btn_watch_trailer", guild_id=self.guild_id))
            view.add_item(discord.ui.Button(label=t_label, emoji=t_emoji, url=trailer_url, style=discord.ButtonStyle.link))

        await self.send_update(content=f"{alert_text}\n{tmdb_url}", embed=embed, view=view)

    def get_item_id(self, item):
        return str(item.get("id"))

    async def mark_items_published(self, items):
        for series in items:
            series_id = self.get_item_id(series)
            if series_id:
                tmdb_url = f"https://www.themoviedb.org/tv/{series_id}"
                title = series.get("name") or series.get("original_name")
                poster_path = series.get("poster_path")
                thumbnail = f"https://image.tmdb.org/t/p/w200{poster_path}" if poster_path else None
                await database.mark_as_published(
                    series_id, "tmdb_tv", tmdb_url,
                    guild_id=self.guild_id,
                    title=title,
                    thumbnail_url=thumbnail,
                    author_name="TMDB TV"
                )

    async def _get_en_fallback(self, media_type, item_id, original=False):
        """Fetch English (or original language) details as fallback."""
        try:
            if original:
                url = f"https://api.themoviedb.org/3/{media_type}/{item_id}"
            else:
                url = f"https://api.themoviedb.org/3/{media_type}/{item_id}?language=en-US"
            if not self.bearer_token and self.api_key:
                url += ("&" if "?" in url else "?") + f"api_key={self.api_key}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    return await response.json()
        except:
            return {}

    async def _fetch_genres(self):
        try:
            url = self.get_api_url("genre/tv/list")
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    data = await response.json()
                    return {g["id"]: g["name"] for g in data.get("genres", [])}
        except:
            return {}

    async def _get_trailer_url(self, series_id):
        """Fetch a YouTube video URL (Priority: Trailer -> Teaser -> Clip)."""
        try:
            async with aiohttp.ClientSession() as session:
                best_video = None
                
                # Tiers: Localized, then EN, then No-Language
                tiers = [
                    self.get_api_url(f"tv/{series_id}/videos"),
                    f"https://api.themoviedb.org/3/tv/{series_id}/videos?language=en-US" if self.tmdb_lang != "en-US" else None,
                    f"https://api.themoviedb.org/3/tv/{series_id}/videos"
                ]

                for url in tiers:
                    if not url: continue
                    if "api.themoviedb.org" in url and "api_key=" not in url:
                        if not self.bearer_token and self.api_key:
                            url += ("&" if "?" in url else "?") + f"api_key={self.api_key}"
                    
                    async with session.get(url, headers=self.get_headers()) as response:
                        if response.status == 200:
                            data = await response.json()
                            results = data.get("results", [])
                            
                            # 1. Look for Trailer
                            for v in results:
                                if v.get("site") == "YouTube" and v.get("type") == "Trailer":
                                    return f"https://www.youtube.com/watch?v={v.get('key')}"
                            
                            # 2. Backup: Teaser or Clip
                            if not best_video:
                                for v in results:
                                    if v.get("site") == "YouTube" and v.get("type") in ["Teaser", "Clip"]:
                                        best_video = f"https://www.youtube.com/watch?v={v.get('key')}"
                                        break
                return best_video
        except:
            return None

    async def get_latest_item(self):
        """Fetch the single most recent trending TV series for a manual check."""
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        """Fetch the N most recent TV series, searching through up to 5 pages if filters are active."""
        if not self.bearer_token and not self.api_key: return []
        
        filtered_results = []
        target_genres = self.config.get("target_genres", [])
        target_languages = self.config.get("target_languages", [])
        
        try:
            async with aiohttp.ClientSession() as session:
                # Iterate through up to 5 pages to find enough items matching filters
                for page in range(1, 6):
                    url = f"{self.get_api_url('trending/tv/day')}&page={page}"
                    async with session.get(url, headers=self.get_headers()) as response:
                        if response.status != 200:
                            break
                            
                        data = await response.json()
                        results = data.get("results", [])
                        if not results:
                            break
                        
                        for item in results:
                            # Apply Genre Filtering
                            if target_genres:
                                item_genres = [str(g) for g in item.get("genre_ids", [])]
                                orig_lang = item.get("original_language", "")
                                if orig_lang in ["ja", "zh", "ko"] and "16" in item_genres:
                                    item_genres.append("9999") # Anime tag
                                    
                                if not any(g in target_genres for g in item_genres):
                                    continue
                            
                            # Apply Language Filtering
                            if target_languages:
                                if item.get("original_language") not in target_languages:
                                    continue
                            
                            filtered_results.append(item)
                            if len(filtered_results) >= count:
                                # We have enough results, exit BOTH loops
                                break
                    
                    if len(filtered_results) >= count:
                        break
                
                # Format the results
                filtered_results.reverse()
                genre_map = await self._fetch_genres()
                items = []
                for series in filtered_results:
                    items.append(await self._format_series(series, genre_map))
                return items
                
        except Exception as e:
            log.error(f"Error fetching filtered TV series ({self.tmdb_lang}): {e}")
            return []

    async def _format_series(self, series, genre_map):
        """Helper to format a TMDB series into standard output mapping."""
        series_id = series.get("id")
        name = series.get("name", "")
        overview = series.get("overview", "")
        tmdb_url = f"https://www.themoviedb.org/tv/{series_id}"
        first_air_date = series.get("first_air_date", self.bot.get_feedback("default_na", guild_id=self.guild_id))

        # English fallback for missing name/overview
        if (not name or not overview) and self.tmdb_lang != "en-US":
            en_data = await self._get_en_fallback("tv", series_id)
            if not name: name = en_data.get("name", "")
            if not overview: overview = en_data.get("overview", "")
        # Original language fallback
        if not name: name = series.get("original_name", "")
        if not overview:
            orig_data = await self._get_en_fallback("tv", series_id, original=True)
            overview = orig_data.get("overview", "")
        if not name: name = self.bot.get_feedback("monitor_tv_fallback_title", guild_id=self.guild_id)
        
        # Ratings
        vote_avg = series.get("vote_average", 0)
        vote_count = series.get("vote_count", 0)
        na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
        score_text = f"{ICON_STAR} {vote_avg:.1f} ({vote_count})" if vote_count > 0 else na_text

        genre_ids = series.get("genre_ids", [])
        genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
        genre_text = ", ".join(genre_names) if genre_names else None
        
        trailer_url = await self._get_trailer_url(series_id)
        
        alert_text = self.get_alert_message({
            "name": self.bot.get_feedback("monitor_platform_tv", guild_id=self.guild_id),
            "title": name,
            "url": tmdb_url
        })
        
        # Wrap overview for better readability in Discord
        
        embed = discord.Embed(
            title=name[:256],
            url=tmdb_url,
            
            color=self.get_color(0x3d3f45)
        )
        poster_path = series.get("poster_path")
        if poster_path: embed.set_image(url=f"https://image.tmdb.org/t/p/w500{poster_path}")
        
        if genre_text:
            wrapped_genres = textwrap.fill(genre_text, width=32)
            embed.add_field(name=self.bot.get_feedback("field_genres", guild_id=self.guild_id), value=wrapped_genres, inline=False)
        embed.add_field(name=self.bot.get_feedback("field_release_date", guild_id=self.guild_id), value=first_air_date, inline=True)
        embed.add_field(name=self.bot.get_feedback("field_score", guild_id=self.guild_id), value=score_text, inline=True)
        embed.set_footer(text=self.bot.get_feedback("footer_tmdb", date=first_air_date, guild_id=self.guild_id))

        view = discord.ui.View()
        view.add_item(discord.ui.Button(label=self.bot.get_feedback("btn_view_tmdb", guild_id=self.guild_id), url=tmdb_url, style=discord.ButtonStyle.link))
        if trailer_url:
            t_label, t_emoji = self.bot.parse_emoji_text(self.bot.get_feedback("btn_watch_trailer", guild_id=self.guild_id))
            view.add_item(discord.ui.Button(label=t_label, emoji=t_emoji, url=trailer_url, style=discord.ButtonStyle.link))
        
        return {
            "content": f"{alert_text}\n{tmdb_url}",
            "embed": embed,
            "view": view
        }
