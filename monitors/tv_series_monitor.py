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
        
        # Get server language
        settings = bot.guild_settings_cache.get(self.guild_id, {})
        lang = settings.get("language", bot.config.get("language", "hu"))
        self.tmdb_lang = "hu-HU" if lang == "hu" else "en-US"
        
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

    async def check_for_updates(self):
        """Fetch trending items and look for new IDs."""
        if not self.api_key:
            log.warning("No TMDB API key provided.")
            return

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
                            return
                        data = await response.json()
                        trending = data.get("results", [])
                        if trending:
                            self.bot.monitor_manager.set_shared_data(shared_key, trending)
            except Exception as e:
                log.error(f"Error fetching TMDB data: {e}")
                return

        if not trending:
            return

        new_entries = []
        for series in reversed(trending):
            series_id = str(series.get("id"))
            if not series_id: continue

            if not await database.is_published(series_id, "tmdb_tv"):
                if self.is_first_run:
                    await database.mark_as_published(series_id, "tmdb_tv", f"https://www.themoviedb.org/tv/{series_id}")
                else:
                    new_entries.append(series)
                    log.info(f"New TV Series detected: {series.get('name')} ({series_id})")

        genre_map = await self._fetch_genres()

        for series in new_entries:
            series_id = str(series.get("id"))
            name = series.get("name", self.bot.get_feedback("monitor_tv_fallback_title", guild_id=self.guild_id))
            overview = series.get("overview", "")
            first_air_date = series.get("first_air_date", self.bot.get_feedback("default_na", guild_id=self.guild_id))
            
            # Genres
            genre_ids = series.get("genre_ids", [])
            genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
            genre_text = ", ".join(genre_names) if genre_names else None

            # Ratings
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

            # Wrap overview for better readability in Discord
            wrapped_overview = textwrap.fill(overview[:1000], width=42)

            embed = discord.Embed(
                title=name[:256],
                url=tmdb_url,
                description=wrapped_overview,
                color=self.get_color(0x01d277) # TMDB Green
            )
            embed.set_author(name=self.bot.get_feedback("new_tv_series_alert", guild_id=self.guild_id))
            if poster_url: embed.set_image(url=poster_url)
            
            # Genres field with intelligent wrap at 35 chars
            if genre_text:
                wrapped_genres = textwrap.fill(genre_text, width=35)
                embed.add_field(name=self.bot.get_feedback("field_genres", guild_id=self.guild_id), value=wrapped_genres, inline=False)
            
            embed.add_field(name=self.bot.get_feedback("field_release_date", guild_id=self.guild_id), value=first_air_date, inline=True)
            embed.add_field(name=self.bot.get_feedback("field_score", guild_id=self.guild_id), value=score_text, inline=True)
            
            embed.set_footer(text=self.bot.get_feedback("footer_tmdb", date=first_air_date, guild_id=self.guild_id))

            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_tmdb", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=tmdb_url, style=discord.ButtonStyle.link))
            if trailer_url:
                view.add_item(discord.ui.Button(label=self.bot.get_feedback("btn_watch_trailer", guild_id=self.guild_id), url=trailer_url, style=discord.ButtonStyle.link))

            await self.send_update(content=f"{alert_text}\n{tmdb_url}", embed=embed, view=view)
            await database.mark_as_published(series_id, "tmdb_tv", tmdb_url)

        if self.is_first_run:
            log.info("Initial TV Series seed completed.")
            self.is_first_run = False

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
        try:
            url = self.get_api_url(f"tv/{series_id}/videos")
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    data = await response.json()
                    for video in data.get("results", []):
                        if video["site"] == "YouTube" and video["type"] == "Trailer":
                            return f"https://www.youtube.com/watch?v={video['key']}"
            
            # English fallback if no localized trailer
            if self.tmdb_lang != "en-US":
                url_en = f"https://api.themoviedb.org/3/tv/{series_id}/videos?language=en-US"
                if not self.bearer_token and self.api_key: url_en += f"&api_key={self.api_key}"
                async with session.get(url_en, headers=self.get_headers()) as response:
                    data = await response.json()
                    for video in data.get("results", []):
                        if video["site"] == "YouTube" and video["type"] == "Trailer":
                            return f"https://www.youtube.com/watch?v={video['key']}"
            return None
        except:
            return None

    async def get_latest_item(self):
        """Fetch the single most recent trending TV series for a manual check."""
        if not self.bearer_token and not self.api_key: return None
        try:
            url = self.get_api_url("trending/tv/day")
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.get_headers()) as response:
                    if response.status != 200: return None
                    data = await response.json()
                    results = data.get("results", [])
                    if not results: return None
                    
                    series = results[0]
                    series_id = series.get("id")
                    name = series.get("name", self.bot.get_feedback("monitor_tv_fallback_title", guild_id=self.guild_id))
                    tmdb_url = f"https://www.themoviedb.org/tv/{series_id}"
                    first_air_date = series.get("first_air_date", self.bot.get_feedback("default_na", guild_id=self.guild_id))
                    
                    # Ratings
                    vote_avg = series.get("vote_average", 0)
                    vote_count = series.get("vote_count", 0)
                    na_text = self.bot.get_feedback("default_na", guild_id=self.guild_id)
                    score_text = f"{ICON_STAR} {vote_avg:.1f} ({vote_count})" if vote_count > 0 else na_text

                    genre_map = await self._fetch_genres()
                    genre_ids = series.get("genre_ids", [])
                    genre_names = [genre_map.get(gid) for gid in genre_ids if genre_map.get(gid)]
                    genre_text = ", ".join(genre_names) if genre_names else None
                    
                    trailer_url = await self._get_trailer_url(series_id)
                    
                    alert_text = self.get_alert_message({
                        "name": self.bot.get_feedback("monitor_platform_tv", guild_id=self.guild_id),
                        "title": name,
                        "url": tmdb_url
                    })
                    
                    # Wrap overview for better readability
                    wrapped_overview = textwrap.fill(series.get("overview", "")[:1000], width=42)
                    
                    embed = discord.Embed(
                        title=name[:256],
                        url=tmdb_url,
                        description=wrapped_overview,
                        color=self.get_color(0x01d277)
                    )
                    poster_path = series.get("poster_path")
                    if poster_path: embed.set_image(url=f"https://image.tmdb.org/t/p/w500{poster_path}")
                    
                    if genre_text:
                        wrapped_genres = textwrap.fill(genre_text, width=35)
                        embed.add_field(name=self.bot.get_feedback("field_genres", guild_id=self.guild_id), value=wrapped_genres, inline=False)
                    embed.add_field(name=self.bot.get_feedback("field_release_date", guild_id=self.guild_id), value=first_air_date, inline=True)
                    embed.add_field(name=self.bot.get_feedback("field_score", guild_id=self.guild_id), value=score_text, inline=True)
                    embed.set_footer(text=self.bot.get_feedback("footer_tmdb", date=first_air_date, guild_id=self.guild_id))

                    view = discord.ui.View()
                    view.add_item(discord.ui.Button(label=self.bot.get_feedback("btn_view_tmdb", guild_id=self.guild_id), url=tmdb_url, style=discord.ButtonStyle.link))
                    if trailer_url:
                        view.add_item(discord.ui.Button(label=self.bot.get_feedback("btn_watch_trailer", guild_id=self.guild_id), url=trailer_url, style=discord.ButtonStyle.link))
                    
                    return {
                        "content": f"{alert_text}\n{tmdb_url}",
                        "embed": embed,
                        "view": view
                    }
        except Exception as e:
            log.error(f"Manual TV check failed: {e}")
            return None
