import aiohttp
import discord
from core.base_monitor import BaseMonitor
from logger import log
import database as db
from core.ui_layouts import generate_tmdb_layout

class MovieMonitor(BaseMonitor):
    """Monitor for new movie releases using TMDB API."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.bearer_token = bot.config.get("tmdb_bearer_token")
        self.api_key = bot.config.get("tmdb_api_key") # Fallback
        
        # Get server language for TMDB API
        self.tmdb_lang = bot.get_feedback("tmdb_lang_code", guild_id=self.guild_id)
        # Set platform string used for publication tracking
        self.platform = f"movie:{self.tmdb_lang}"
        
        # Base URL without api_key
        self.api_url = f"https://api.themoviedb.org/3/movie/now_playing?language={self.tmdb_lang}"

    def get_headers(self):
        if self.bearer_token:
            return {"Authorization": f"Bearer {self.bearer_token}"}
        return {}

    def get_api_url(self):
        """Build URL with fallback to api_key if no bearer token is present."""
        if not self.bearer_token and self.api_key:
            return f"{self.api_url}&api_key={self.api_key}"
        return self.api_url

    def get_shared_key(self):
        return f"tmdb_now_playing:{self.tmdb_lang}"

    async def _get_en_fallback(self, movie_id, original=False):
        """Fetch English (or original language) details as fallback."""
        try:
            if original:
                url = f"https://api.themoviedb.org/3/movie/{movie_id}"
            else:
                url = f"https://api.themoviedb.org/3/movie/{movie_id}?language=en-US"
            if not self.bearer_token and self.api_key:
                url += ("&" if "?" in url else "?") + f"api_key={self.api_key}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    return await response.json()
        except:
            return {}

    async def _fetch_genres(self):
        """Fetch and cache genre names for the current language."""
        if not self.bot.monitor_manager: return {}
        
        cache = self.bot.monitor_manager.tmdb_genres_cache
        if self.tmdb_lang in cache:
            return cache[self.tmdb_lang]
            
        url = f"https://api.themoviedb.org/3/genre/movie/list?language={self.tmdb_lang}"
        if not self.bearer_token and self.api_key:
            url += f"&api_key={self.api_key}"
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    if response.status == 200:
                        data = await response.json()
                        mapping = {g["id"]: g["name"] for g in data.get("genres", [])}
                        cache[self.tmdb_lang] = mapping
                        return mapping
        except Exception as e:
            log.error(f"Error fetching TMDB genres: {e}")
        return {}

    async def _get_trailer_url(self, movie_id):
        """Fetch a YouTube video URL (Priority: Trailer -> Teaser -> Clip)."""
        try:
            async with aiohttp.ClientSession() as session:
                best_video = None
                
                # We check tiers: Localized, then EN, then No-Language
                # In each tier, we prefer Trailer, but keep track of Teaser as backup
                tiers = [
                    f"https://api.themoviedb.org/3/movie/{movie_id}/videos?language={self.tmdb_lang}",
                    f"https://api.themoviedb.org/3/movie/{movie_id}/videos?language=en-US" if self.tmdb_lang != "en-US" else None,
                    f"https://api.themoviedb.org/3/movie/{movie_id}/videos"
                ]
                
                for url in tiers:
                    if not url: continue
                    if not self.bearer_token and self.api_key:
                        url += ("&" if "?" in url else "?") + f"api_key={self.api_key}"
                    
                    async with session.get(url, headers=self.get_headers()) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            results = data.get("results", [])
                            
                            # 1. Look for Trailer
                            for v in results:
                                if v.get("site") == "YouTube" and v.get("type") == "Trailer":
                                    return f"https://www.youtube.com/watch?v={v.get('key')}"
                            
                            # 2. Keep track of best alternative (Teaser/Clip)
                            if not best_video:
                                for v in results:
                                    if v.get("site") == "YouTube" and v.get("type") in ["Teaser", "Clip"]:
                                        best_video = f"https://www.youtube.com/watch?v={v.get('key')}"
                                        break
                
                return best_video
        except:
            pass
        return None

    async def fetch_new_items(self):
        """Fetch TMDB Now Playing and look for new movies."""
        if not self.bearer_token and not self.api_key:
            log.warning("TMDB Auth missing in configuration. Movie monitor disabled.")
            return []

        # Check for shared data
        feed = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if not feed:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.get_api_url(), headers=self.get_headers()) as response:
                        if response.status != 200:
                            log.error(f"Failed to fetch TMDB movies: {response.status}")
                            return []
                        data = await response.json()
                        feed = data.get("results", [])
                        if feed:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Error fetching TMDB movies: {e}")
                return []

        if not feed:
            return []

        all_candidates = []
        for movie in feed:
            movie_id = str(movie.get("id"))
            if not movie_id: continue
            all_candidates.append(movie)

        return list(reversed(all_candidates))

    def _build_tmdb_data(self, movie, genre_map):
        """Extract common data fields from a TMDB movie object."""
        movie_id = str(movie.get("id"))
        title = movie.get("title", "")
        overview = movie.get("overview", "")
        release_date = movie.get("release_date", self.bot.get_feedback("default_na", guild_id=self.guild_id))
        
        genre_ids = movie.get("genre_ids", [])
        genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
        genre_text = ", ".join(genre_names) if genre_names else None
        
        vote_avg = movie.get("vote_average", 0)
        vote_count = movie.get("vote_count", 0)
        na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
        score_text = f"{vote_avg:.1f} ({vote_count})" if vote_count > 0 else na_text
        
        poster_path = movie.get("poster_path")
        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
        
        backdrop_path = movie.get("backdrop_path")
        backdrop_url = f"https://image.tmdb.org/t/p/w780{backdrop_path}" if backdrop_path else None
        backdrop_url = self.get_image_url(backdrop_url)
        
        tmdb_url = f"https://www.themoviedb.org/movie/{movie_id}"
        
        return {
            "movie_id": movie_id, "title": title, "overview": overview,
            "release_date": release_date, "genre_text": genre_text,
            "score_text": score_text, "poster_url": poster_url,
            "backdrop_url": backdrop_url, "tmdb_url": tmdb_url
        }

    async def process_item(self, movie):
        target_genres = self.config.get("target_genres", [])
        if target_genres:
            item_genres = [str(g) for g in movie.get("genre_ids", [])]
            
            # Map asian animations to the custom '9999' Anime genre
            orig_lang = movie.get("original_language", "")
            if orig_lang in ["ja", "zh", "ko"] and "16" in item_genres:
                item_genres.append("9999")
                
            # If no intersection between target genres and movie genres, skip posting to this target
            if not any(g in target_genres for g in item_genres):
                return

        target_languages = self.config.get("target_languages", [])
        if target_languages:
            orig_lang = movie.get("original_language", "")
            if orig_lang not in target_languages:
                return

        genre_map = await self._fetch_genres()
        data = self._build_tmdb_data(movie, genre_map)
        
        title = data["title"]
        overview = data["overview"]
        movie_id = data["movie_id"]
        
        # Language fallbacks
        if (not title or not overview) and self.tmdb_lang != "en-US":
            en_data = await self._get_en_fallback(movie_id)
            if not title: title = en_data.get("title", "")
            if not overview: overview = en_data.get("overview", "")
        if not title: title = movie.get("original_title", "")
        if not overview:
            orig_data = await self._get_en_fallback(movie_id, original=True)
            overview = orig_data.get("overview", "")
        if not title: title = self.bot.get_feedback("monitor_movie_fallback_title", guild_id=self.guild_id)
        
        trailer_url = await self._get_trailer_url(movie_id)
        
        alert_text = self.get_alert_message({
            "name": self.bot.get_feedback("monitor_platform_movie", guild_id=self.guild_id),
            "title": title,
            "url": data["tmdb_url"]
        })
        
        content, layout = generate_tmdb_layout(
            bot=self.bot,
            guild_id=self.guild_id,
            alert_text=alert_text,
            title=title[:256],
            url=data["tmdb_url"],
            backdrop_url=data["backdrop_url"],
            poster_url=data["poster_url"],
            score_text=data["score_text"],
            genre_text=data["genre_text"],
            release_date=data["release_date"],
            trailer_url=trailer_url,
            accent_color=self.get_color(0x3d3f45)
        )
        
        await self.send_update(content=content, view=layout)

    def get_item_id(self, movie):
        return str(movie.get("id"))

    async def mark_items_published(self, items):
        for movie in items:
            movie_id = self.get_item_id(movie)
            if movie_id:
                title = movie.get("title") or movie.get("original_title")
                poster_path = movie.get("poster_path")
                thumbnail = f"https://image.tmdb.org/t/p/w200{poster_path}" if poster_path else None
                await db.mark_as_published(
                    movie_id, self.platform, self.api_url,
                    guild_id=self.guild_id,
                    title=title,
                    thumbnail_url=thumbnail,
                    author_name="TMDB Movies"
                )

    async def get_latest_item(self):
        """Fetch the most recent film for manual check."""
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        """Fetch the N most recent movies, searching through up to 5 pages if filters are active."""
        if not self.bearer_token and not self.api_key: return []
        
        filtered_results = []
        target_genres = self.config.get("target_genres", [])
        target_languages = self.config.get("target_languages", [])
        
        try:
            async with aiohttp.ClientSession() as session:
                # Iterate through up to 5 pages to find enough items matching filters
                for page in range(1, 6):
                    url = f"{self.get_api_url()}&page={page}"
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
                for movie in filtered_results:
                    items.append(await self._format_movie(movie, genre_map))
                return items
                
        except Exception as e:
            log.error(f"Error fetching filtered movies ({self.tmdb_lang}): {e}")
            return []

    async def _format_movie(self, movie, genre_map):
        """Helper to format a TMDB movie into standard output mapping."""
        data = self._build_tmdb_data(movie, genre_map)
        
        title = data["title"]
        overview = data["overview"]
        movie_id = data["movie_id"]
        
        # Language fallbacks
        if (not title or not overview) and self.tmdb_lang != "en-US":
            en_data = await self._get_en_fallback(movie_id)
            if not title: title = en_data.get("title", "")
            if not overview: overview = en_data.get("overview", "")
        if not title: title = movie.get("original_title", "")
        if not overview:
            orig_data = await self._get_en_fallback(movie_id, original=True)
            overview = orig_data.get("overview", "")
        if not title: title = self.bot.get_feedback("monitor_movie_fallback_title", guild_id=self.guild_id)
        
        trailer_url = await self._get_trailer_url(movie_id)
        
        alert_text = self.get_alert_message({
            "name": self.bot.get_feedback("monitor_platform_movie", guild_id=self.guild_id),
            "title": title,
            "url": data["tmdb_url"]
        })
        
        content, layout = generate_tmdb_layout(
            bot=self.bot,
            guild_id=self.guild_id,
            alert_text=alert_text,
            title=title[:256],
            url=data["tmdb_url"],
            backdrop_url=data["backdrop_url"],
            poster_url=data["poster_url"],
            score_text=data["score_text"],
            genre_text=data["genre_text"],
            release_date=data["release_date"],
            trailer_url=trailer_url,
            accent_color=self.get_color(0x3d3f45)
        )
        
        return {"content": content, "view": layout}
