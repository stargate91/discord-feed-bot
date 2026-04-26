import aiohttp
import discord
from core.base_monitor import BaseMonitor
from logger import log
import database as db
from core.ui_layouts import generate_tmdb_layout

class TVSeriesMonitor(BaseMonitor):
    """Monitor for TV series updates via TMDB."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.bearer_token = bot.config.get("tmdb_bearer_token")
        self.api_key = bot.config.get("tmdb_api_key") # Fallback
        
        # Get server language for TMDB API
        self.tmdb_lang = bot.get_feedback("tmdb_lang_code", guild_id=self.guild_id)
        # Set platform string used for publication tracking
        self.platform = f"tv_series:{self.tmdb_lang}"

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
            all_candidates.append(series)

        return list(reversed(all_candidates))

    def _build_tmdb_data(self, series, genre_map):
        """Extract common data fields from a TMDB series object."""
        series_id = str(series.get("id"))
        name = series.get("name", "")
        overview = series.get("overview", "")
        first_air_date = series.get("first_air_date", self.bot.get_feedback("default_na", guild_id=self.guild_id))
        
        genre_ids = series.get("genre_ids", [])
        genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
        genre_text = ", ".join(genre_names) if genre_names else None
        
        vote_avg = series.get("vote_average", 0)
        vote_count = series.get("vote_count", 0)
        na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
        score_text = f"{vote_avg:.1f} ({vote_count})" if vote_count > 0 else na_text
        
        poster_path = series.get("poster_path")
        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
        
        backdrop_path = series.get("backdrop_path")
        backdrop_url = f"https://image.tmdb.org/t/p/w780{backdrop_path}" if backdrop_path else None
        
        tmdb_url = f"https://www.themoviedb.org/tv/{series_id}"
        
        return {
            "series_id": series_id, "name": name, "overview": overview,
            "first_air_date": first_air_date, "genre_text": genre_text,
            "score_text": score_text, "poster_url": poster_url,
            "backdrop_url": backdrop_url, "tmdb_url": tmdb_url
        }

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
        data = self._build_tmdb_data(series, genre_map)
        
        name = data["name"]
        overview = data["overview"]
        series_id = data["series_id"]
        
        # Language fallbacks
        if (not name or not overview) and self.tmdb_lang != "en-US":
            en_data = await self._get_en_fallback("tv", series_id)
            if not name: name = en_data.get("name", "")
            if not overview: overview = en_data.get("overview", "")
        if not name: name = series.get("original_name", "")
        if not overview:
            orig_data = await self._get_en_fallback("tv", series_id, original=True)
            overview = orig_data.get("overview", "")
        if not name: name = self.bot.get_feedback("monitor_tv_fallback_title", guild_id=self.guild_id)
        
        trailer_url = await self._get_trailer_url(series_id)
        
        alert_text = self.get_alert_message({
            "name": self.bot.get_feedback("monitor_platform_tv", guild_id=self.guild_id),
            "title": name,
            "url": data["tmdb_url"]
        })
        
        content, layout = generate_tmdb_layout(
            bot=self.bot,
            guild_id=self.guild_id,
            alert_text=alert_text,
            title=name[:256],
            url=data["tmdb_url"],
            backdrop_url=data["backdrop_url"],
            poster_url=data["poster_url"],
            score_text=data["score_text"],
            genre_text=data["genre_text"],
            release_date=data["first_air_date"],
            trailer_url=trailer_url,
            accent_color=self.get_color(0x3d3f45)
        )
        
        await self.send_update(content=content, view=layout)

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
                await db.mark_as_published(
                    series_id, self.platform, tmdb_url,
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
        data = self._build_tmdb_data(series, genre_map)
        
        name = data["name"]
        overview = data["overview"]
        series_id = data["series_id"]
        
        # Language fallbacks
        if (not name or not overview) and self.tmdb_lang != "en-US":
            en_data = await self._get_en_fallback("tv", series_id)
            if not name: name = en_data.get("name", "")
            if not overview: overview = en_data.get("overview", "")
        if not name: name = series.get("original_name", "")
        if not overview:
            orig_data = await self._get_en_fallback("tv", series_id, original=True)
            overview = orig_data.get("overview", "")
        if not name: name = self.bot.get_feedback("monitor_tv_fallback_title", guild_id=self.guild_id)
        
        trailer_url = await self._get_trailer_url(series_id)
        
        alert_text = self.get_alert_message({
            "name": self.bot.get_feedback("monitor_platform_tv", guild_id=self.guild_id),
            "title": name,
            "url": data["tmdb_url"]
        })
        
        content, layout = generate_tmdb_layout(
            bot=self.bot,
            guild_id=self.guild_id,
            alert_text=alert_text,
            title=name[:256],
            url=data["tmdb_url"],
            backdrop_url=data["backdrop_url"],
            poster_url=data["poster_url"],
            score_text=data["score_text"],
            genre_text=data["genre_text"],
            release_date=data["first_air_date"],
            trailer_url=trailer_url,
            accent_color=self.get_color(0x3d3f45)
        )
        
        return {"content": content, "view": layout}
