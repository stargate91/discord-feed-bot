import aiohttp
import discord
from core.base_monitor import BaseMonitor
from logger import log
import database

class MovieMonitor(BaseMonitor):
    """Monitor for new movie releases using TMDB API."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.bearer_token = bot.config.get("tmdb_bearer_token")
        self.api_key = bot.config.get("tmdb_api_key") # Fallback
        self.tmdb_lang = bot.config.get("language", "hu")
        
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
        return "tmdb_now_playing"

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

        new_entries = []
        for movie in reversed(feed):
            movie_id = str(movie.get("id"))
            if not movie_id: continue

            if not await database.is_published(movie_id, "movie"):
                if self.is_first_run:
                    await database.mark_as_published(movie_id, "movie", self.api_url)
                else:
                    new_entries.append(movie)
                    log.info(f"New Movie detected: {movie.get('title')} ({movie_id})")

        for movie in new_entries:
            movie_id = str(movie.get("id"))
            title = movie.get("title", "New Movie")
            overview = movie.get("overview", "")
            release_date = movie.get("release_date", "N/A")
            poster_path = movie.get("poster_path")
            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
            tmdb_url = f"https://www.themoviedb.org/movie/{movie_id}"
            
            alert_text = self.get_alert_message({
                "name": "TMDB Movies",
                "title": title,
                "url": tmdb_url
            })
            
            embed = discord.Embed(
                title=title[:256],
                url=tmdb_url,
                description=overview[:300] + "..." if len(overview) > 300 else overview,
                color=self.get_color(0x01d277) # TMDB Green
            )
            if poster_url:
                embed.set_image(url=poster_url)
            
            embed.set_footer(text=f"TMDB • Released: {release_date}")
            
            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_tmdb", guild_id=self.guild_id)
            view.add_item(discord.ui.Button(label=btn_label, url=tmdb_url, style=discord.ButtonStyle.link))
            
            await self.send_update(content=f"{alert_text}\n{tmdb_url}", embed=embed, view=view)
            await database.mark_as_published(movie_id, "movie", self.api_url)

        if self.is_first_run:
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent film."""
        if not self.bearer_token and not self.api_key: return None
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.get_api_url(), headers=self.get_headers()) as response:
                    if response.status != 200: return None
                    data = await response.json()
                    results = data.get("results", [])
                    if not results: return None
                    
                    movie = results[0]
                    title = movie.get("title", "New Movie")
                    movie_id = movie.get("id")
                    tmdb_url = f"https://www.themoviedb.org/movie/{movie_id}"
                    
                    alert_text = self.get_alert_message({"name": "TMDB Movies", "title": title, "url": tmdb_url})
                    
                    embed = discord.Embed(
                        title=title[:256],
                        url=tmdb_url,
                        description=movie.get("overview", "")[:300],
                        color=self.get_color(0x01d277)
                    )
                    poster_path = movie.get("poster_path")
                    if poster_path:
                        embed.set_image(url=f"https://image.tmdb.org/t/p/w500{poster_path}")
                    
                    view = discord.ui.View()
                    btn_label = self.bot.get_feedback("btn_view_tmdb", guild_id=self.guild_id)
                    view.add_item(discord.ui.Button(label=btn_label, url=tmdb_url, style=discord.ButtonStyle.link))
                    
                    return {"content": f"{alert_text}\n{tmdb_url}", "embed": embed, "view": view}
        except:
            return None
