import aiohttp
import discord
import textwrap
from core.base_monitor import BaseMonitor
from logger import log
import database

class TVSeriesMonitor(BaseMonitor):
    """Monitor for TV series updates using TMDB API (On The Air)."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.bearer_token = bot.config.get("tmdb_bearer_token")
        self.api_key = bot.config.get("tmdb_api_key") # Fallback
        
        # Get server language from bot's cache
        settings = bot.guild_settings_cache.get(self.guild_id, {})
        self.tmdb_lang = settings.get("language", bot.config.get("language", "hu"))
        
        # On The Air: Shows that have an episode airing within the next 7 days
        self.api_url = f"https://api.themoviedb.org/3/tv/on_the_air?language={self.tmdb_lang}&page=1"
        self.is_first_run = True


    def get_headers(self):
        if self.bearer_token:
            return {"Authorization": f"Bearer {self.bearer_token}"}
        return {}

    def get_api_url(self):
        if not self.bearer_token and self.api_key:
            return f"{self.api_url}&api_key={self.api_key}"
        return self.api_url

    def get_shared_key(self):
        return f"tmdb_tv_on_the_air:{self.tmdb_lang}"

    async def _fetch_genres(self):
        """Fetch and cache genre names for the current language."""
        if not self.bot.monitor_manager: return {}
        
        cache = self.bot.monitor_manager.tmdb_genres_cache
        if f"tv:{self.tmdb_lang}" in cache:
            return cache[f"tv:{self.tmdb_lang}"]
            
        url = f"https://api.themoviedb.org/3/genre/tv/list?language={self.tmdb_lang}"
        if not self.bearer_token and self.api_key:
            url += f"&api_key={self.api_key}"
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    if response.status == 200:
                        data = await response.json()
                        mapping = {g["id"]: g["name"] for g in data.get("genres", [])}
                        cache[f"tv:{self.tmdb_lang}"] = mapping
                        return mapping
        except Exception as e:
            log.error(f"Error fetching TMDB TV genres: {e}")
        return {}

    async def _get_trailer_url(self, series_id):
        """Fetch the official YouTube trailer URL for a TV series."""
        url = f"https://api.themoviedb.org/3/tv/{series_id}/videos?language={self.tmdb_lang}"
        if not self.bearer_token and self.api_key:
            url += f"&api_key={self.api_key}"
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = data.get("results", [])
                        for video in results:
                            if video.get("site") == "YouTube" and video.get("type") in ("Trailer", "Teaser"):
                                return f"https://www.youtube.com/watch?v={video.get('key')}"
                        
                        if self.tmdb_lang != "en-US":
                            return await self._get_trailer_url_en(series_id)
        except: pass
        return None

    async def _get_trailer_url_en(self, series_id):
        """Fallback to fetch English trailer/teaser."""
        url = f"https://api.themoviedb.org/3/tv/{series_id}/videos?language=en-US"
        if not self.bearer_token and self.api_key:
            url += f"&api_key={self.api_key}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    if response.status == 200:
                        data = await response.json()
                        for video in data.get("results", []):
                            if video.get("site") == "YouTube" and video.get("type") in ("Trailer", "Teaser"):
                                return f"https://www.youtube.com/watch?v={video.get('key')}"
        except: pass
        return None

    async def check_for_updates(self):
        """Fetch ongoing TV series and look for updates."""
        if not self.bearer_token and not self.api_key:
            log.warning("TMDB Auth missing in configuration. TV series monitor disabled.")
            return

        feed = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if not feed:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.get_api_url(), headers=self.get_headers()) as response:
                        if response.status != 200:
                            log.error(f"Failed to fetch TMDB TV series: {response.status}")
                            return
                        data = await response.json()
                        feed = data.get("results", [])
                        if feed:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Error fetching TMDB TV series: {e}")
                return

        if not feed:
            return

        entry_type = f"tv_series:{self.tmdb_lang}"
        new_entries = []
        for series in reversed(feed):
            series_id = str(series.get("id"))
            if not series_id: continue

            if not await database.is_published(series_id, entry_type):
                if self.is_first_run:
                    await database.mark_as_published(series_id, entry_type, self.api_url)
                else:
                    new_entries.append(series)
                    log.info(f"New TV Series update ({self.tmdb_lang}): {series.get('name')} ({series_id})")

        genre_map = await self._fetch_genres()

        for series in new_entries:
            series_id = str(series.get("id"))
            name = series.get("name", "New TV Series")
            overview = series.get("overview", "")
            first_air_date = series.get("first_air_date", "N/A")
            
            # Genres
            genre_ids = series.get("genre_ids", [])
            genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
            genre_text = ", ".join(genre_names) if genre_names else None

            # Ratings
            vote_avg = series.get("vote_average", 0)
            vote_count = series.get("vote_count", 0)
            score_text = f"⭐ {vote_avg:.1f} ({vote_count})" if vote_count > 0 else "N/A"

            poster_path = series.get("poster_path")
            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
            tmdb_url = f"https://www.themoviedb.org/tv/{series_id}"
            
            trailer_url = await self._get_trailer_url(series_id)

            alert_text = self.get_alert_message({
                "name": "TMDB TV Series",
                "title": name,
                "url": tmdb_url
            })
            
            # Wrap overview for better readability on narrow views
            wrapped_overview = textwrap.fill(overview[:1000], width=42)
            if len(overview) > 1000:
                wrapped_overview += "..."

            embed = discord.Embed(
                title=name[:256],
                url=tmdb_url,
                description=wrapped_overview,
                color=self.get_color(0x01d277)
            )
            if poster_url:
                embed.set_image(url=poster_url)
            
            if genre_text:
                wrapped_genres = textwrap.fill(genre_text, width=30)
                embed.add_field(name=self.bot.get_feedback("field_genres", guild_id=self.guild_id), value=wrapped_genres, inline=False)
            
            embed.add_field(name=self.bot.get_feedback("field_release_date", guild_id=self.guild_id), value=first_air_date, inline=True)
            embed.add_field(name=self.bot.get_feedback("field_score", guild_id=self.guild_id), value=score_text, inline=True)

            embed.set_footer(text=f"TMDB • {first_air_date}")
            
            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_tmdb_tv", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=tmdb_url, style=discord.ButtonStyle.link))
            
            if trailer_url:
                view.add_item(discord.ui.Button(label=self.bot.get_feedback("btn_watch_trailer", guild_id=self.guild_id), url=trailer_url, style=discord.ButtonStyle.link))

            await self.send_update(content=f"{alert_text}\n{tmdb_url}", embed=embed, view=view)
            await database.mark_as_published(series_id, entry_type, self.api_url)

        if self.is_first_run:
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent TV series update for manual check."""
        if not self.bearer_token and not self.api_key: return None
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.get_api_url(), headers=self.get_headers()) as response:
                    if response.status != 200: return None
                    data = await response.json()
                    results = data.get("results", [])
                    if not results: return None
                    
                    series = results[0]
                    series_id = series.get("id")
                    name = series.get("name", "New TV Series")
                    tmdb_url = f"https://www.themoviedb.org/tv/{series_id}"
                    first_air_date = series.get("first_air_date", "N/A")
                    
                    # Ratings
                    vote_avg = series.get("vote_average", 0)
                    vote_count = series.get("vote_count", 0)
                    score_text = f"⭐ {vote_avg:.1f} ({vote_count})" if vote_count > 0 else "N/A"

                    genre_map = await self._fetch_genres()
                    genre_ids = series.get("genre_ids", [])
                    genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
                    genre_text = ", ".join(genre_names) if genre_names else None
                    
                    trailer_url = await self._get_trailer_url(series_id)
                    
                    # Wrap overview for better readability
                    wrapped_overview = textwrap.fill(series.get("overview", "")[:1000], width=42)
                    
                    alert_text = self.get_alert_message({"name": "TMDB TV Series", "title": name, "url": tmdb_url})
                    
                    embed = discord.Embed(
                        title=name[:256],
                        url=tmdb_url,
                        description=wrapped_overview,
                        color=self.get_color(0x01d277)
                    )
                    poster_path = series.get("poster_path")
                    if poster_path:
                        embed.set_image(url=f"https://image.tmdb.org/t/p/w500{poster_path}")
                    
                    if genre_text:
                        wrapped_genres = textwrap.fill(genre_text, width=30)
                        embed.add_field(name=self.bot.get_feedback("field_genres", guild_id=self.guild_id), value=wrapped_genres, inline=False)
                    embed.add_field(name=self.bot.get_feedback("field_release_date", guild_id=self.guild_id), value=first_air_date, inline=True)
                    embed.add_field(name=self.bot.get_feedback("field_score", guild_id=self.guild_id), value=score_text, inline=True)
                    
                    view = discord.ui.View()
                    btn_label = self.bot.get_feedback("btn_view_tmdb_tv", guild_id=self.guild_id)
                    view.add_item(discord.ui.Button(label=btn_label, url=tmdb_url, style=discord.ButtonStyle.link))
                    
                    if trailer_url:
                        view.add_item(discord.ui.Button(label=self.bot.get_feedback("btn_watch_trailer", guild_id=self.guild_id), url=trailer_url, style=discord.ButtonStyle.link))
                    
                    return {"content": f"{alert_text}\n{tmdb_url}", "embed": embed, "view": view}
        except Exception as e:
            log.error(f"Error in get_latest_item for TV: {e}")
            return None
