import aiohttp
import discord
import textwrap
from core.base_monitor import BaseMonitor
from logger import log
import database
from core.emojis import ICON_STAR

class MovieMonitor(BaseMonitor):
    """Monitor for new movie releases using TMDB API."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.bearer_token = bot.config.get("tmdb_bearer_token")
        self.api_key = bot.config.get("tmdb_api_key") # Fallback
        
        # Get server language from bot's cache
        settings = bot.guild_settings_cache.get(self.guild_id, {})
        self.tmdb_lang = settings.get("language", bot.config.get("language", "hu"))
        
        # Base URL without api_key
        self.api_url = f"https://api.themoviedb.org/3/movie/now_playing?language={self.tmdb_lang}&page=1"
        self.is_first_run = True

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
        """Fetch the official YouTube trailer URL for a movie."""
        url = f"https://api.themoviedb.org/3/movie/{movie_id}/videos?language={self.tmdb_lang}"
        if not self.bearer_token and self.api_key:
            url += f"&api_key={self.api_key}"
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = data.get("results", [])
                        # Look for YouTube Trailer
                        for video in results:
                            if video.get("site") == "YouTube" and video.get("type") == "Trailer":
                                return f"https://www.youtube.com/watch?v={video.get('key')}"
                        
                        # Fallback to any YouTube video if no localized trailer
                        if self.tmdb_lang != "en-US":
                            # Try English for trailer
                            return await self._get_trailer_url_en(movie_id)
        except: pass
        return None

    async def _get_trailer_url_en(self, movie_id):
        """Fallback to fetch English trailer."""
        url = f"https://api.themoviedb.org/3/movie/{movie_id}/videos?language=en-US"
        if not self.bearer_token and self.api_key:
            url += f"&api_key={self.api_key}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    if response.status == 200:
                        data = await response.json()
                        for video in data.get("results", []):
                            if video.get("site") == "YouTube" and video.get("type") == "Trailer":
                                return f"https://www.youtube.com/watch?v={video.get('key')}"
        except: pass
        return None

    async def check_for_updates(self):
        """Fetch TMDB Now Playing and look for new movies."""
        if not self.bearer_token and not self.api_key:
            log.warning("TMDB Auth missing in configuration. Movie monitor disabled.")
            return

        # Check for shared data
        feed = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if not feed:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.get_api_url(), headers=self.get_headers()) as response:
                        if response.status != 200:
                            log.error(f"Failed to fetch TMDB movies: {response.status}")
                            return
                        data = await response.json()
                        feed = data.get("results", [])
                        if feed:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Error fetching TMDB movies: {e}")
                return

        if not feed:
            return

        entry_type = f"movie:{self.tmdb_lang}"
        new_entries = []
        for movie in reversed(feed):
            movie_id = str(movie.get("id"))
            if not movie_id: continue

            if not await database.is_published(movie_id, entry_type):
                if self.is_first_run:
                    await database.mark_as_published(movie_id, entry_type, self.api_url)
                else:
                    new_entries.append(movie)
                    log.info(f"New Movie detected ({self.tmdb_lang}): {movie.get('title')} ({movie_id})")

        genre_map = await self._fetch_genres()

        for movie in new_entries:
            movie_id = str(movie.get("id"))
            title = movie.get("title", self.bot.get_feedback("monitor_movie_fallback_title", guild_id=self.guild_id))
            overview = movie.get("overview", "")
            release_date = movie.get("release_date", self.bot.get_feedback("default_na", guild_id=self.guild_id))
            
            # Genres
            genre_ids = movie.get("genre_ids", [])
            genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
            genre_text = ", ".join(genre_names) if genre_names else None

            # Ratings
            vote_avg = movie.get("vote_average", 0)
            vote_count = movie.get("vote_count", 0)
            na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
            score_text = f"{ICON_STAR} {vote_avg:.1f} ({vote_count})" if vote_count > 0 else na_text

            poster_path = movie.get("poster_path")
            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
            tmdb_url = f"https://www.themoviedb.org/movie/{movie_id}"
            
            trailer_url = await self._get_trailer_url(movie_id)
            
            alert_text = self.get_alert_message({
                "name": self.bot.get_feedback("monitor_platform_movie", guild_id=self.guild_id),
                "title": title,
                "url": tmdb_url
            })
            
            # Wrap overview for better readability on narrow views
            wrapped_overview = textwrap.fill(overview[:1000], width=42)
            if len(overview) > 1000:
                wrapped_overview += "..."

            embed = discord.Embed(
                title=title[:256],
                url=tmdb_url,
                description=wrapped_overview,
                color=self.get_color(0x01d277)
            )
            if poster_url:
                embed.set_image(url=poster_url)
            
            if genre_text:
                # Wrap genres too if they are long
                wrapped_genres = textwrap.fill(genre_text, width=30)
                embed.add_field(name=self.bot.get_feedback("field_genres", guild_id=self.guild_id), value=wrapped_genres, inline=False)
            
            embed.add_field(name=self.bot.get_feedback("field_release_date", guild_id=self.guild_id), value=release_date, inline=True)
            embed.add_field(name=self.bot.get_feedback("field_score", guild_id=self.guild_id), value=score_text, inline=True)
            
            embed.set_footer(text=self.bot.get_feedback("footer_tmdb", date=release_date, guild_id=self.guild_id))
            
            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_tmdb", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=tmdb_url, style=discord.ButtonStyle.link))
            
            if trailer_url:
                view.add_item(discord.ui.Button(label=self.bot.get_feedback("btn_watch_trailer", guild_id=self.guild_id), url=trailer_url, style=discord.ButtonStyle.link))
            
            await self.send_update(content=f"{alert_text}\n{tmdb_url}", embed=embed, view=view)
            await database.mark_as_published(movie_id, entry_type, self.api_url)

        if self.is_first_run:
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent film for manual check."""
        if not self.bearer_token and not self.api_key: return None
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.get_api_url(), headers=self.get_headers()) as response:
                    if response.status != 200: return None
                    data = await response.json()
                    results = data.get("results", [])
                    if not results: return None
                    
                    movie = results[0]
                    movie_id = movie.get("id")
                    title = movie.get("title", self.bot.get_feedback("monitor_movie_fallback_title", guild_id=self.guild_id))
                    tmdb_url = f"https://www.themoviedb.org/movie/{movie_id}"
                    release_date = movie.get("release_date", self.bot.get_feedback("default_na", guild_id=self.guild_id))
                    
                    # Ratings
                    vote_avg = movie.get("vote_average", 0)
                    vote_count = movie.get("vote_count", 0)
                    na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
                    score_text = f"{ICON_STAR} {vote_avg:.1f} ({vote_count})" if vote_count > 0 else na_text

                    genre_map = await self._fetch_genres()
                    genre_ids = movie.get("genre_ids", [])
                    genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
                    genre_text = ", ".join(genre_names) if genre_names else None
                    
                    trailer_url = await self._get_trailer_url(movie_id)
                    
                    alert_text = self.bot.get_feedback("new_movie_alert", name=title, guild_id=self.guild_id)
                    
                    # Wrap overview for better readability
                    wrapped_overview = textwrap.fill(movie.get("overview", "")[:1000], width=42)
                    
                    embed = discord.Embed(
                        title=title[:256],
                        url=tmdb_url,
                        description=wrapped_overview,
                        color=self.get_color(0x01d277)
                    )
                    poster_path = movie.get("poster_path")
                    if poster_path:
                        embed.set_image(url=f"https://image.tmdb.org/t/p/w500{poster_path}")
                    
                    if genre_text:
                        wrapped_genres = textwrap.fill(genre_text, width=30)
                        embed.add_field(name=self.bot.get_feedback("field_genres", guild_id=self.guild_id), value=wrapped_genres, inline=False)
                    
                    embed.add_field(name=self.bot.get_feedback("field_release_date", guild_id=self.guild_id), value=release_date, inline=True)
                    embed.add_field(name=self.bot.get_feedback("field_score", guild_id=self.guild_id), value=score_text, inline=True)
                        
                    view = discord.ui.View()
                    btn_label = self.bot.get_feedback("btn_view_tmdb", guild_id=self.guild_id)
                    view.add_item(discord.ui.Button(label=btn_label, url=tmdb_url, style=discord.ButtonStyle.link))
                    
                    if trailer_url:
                        view.add_item(discord.ui.Button(label=self.bot.get_feedback("btn_watch_trailer", guild_id=self.guild_id), url=trailer_url, style=discord.ButtonStyle.link))
                    
                    return {"content": f"{alert_text}\n{tmdb_url}", "embed": embed, "view": view}
        except Exception as e:
            log.error(f"Error in get_latest_item for movie: {e}")
            return None
