import aiohttp
import discord
import time
from core.base_monitor import BaseMonitor
from logger import log
import database

# Standard User-Agent to avoid being blocked
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

class BaseStreamMonitor(BaseMonitor):
    """Base class for stream platforms (Twitch, Kick)."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.stream_username = config.get("username", self.name)
        self.is_live = False
        self.is_first_run = True

    def get_shared_key(self):
        return f"{self.platform}:{self.stream_username}"

    async def fetch_new_items(self):
        """Check if the stream is live."""
        if not self.stream_username:
            log.warning(f"No username for {self.platform} monitor: {self.name}")
            return []

        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            stream_data = shared_data
        else:
            try:
                stream_data = await self._fetch_platform_data()
                if stream_data:
                    self.bot.monitor_manager.set_shared_data(self.get_shared_key(), stream_data)
            except Exception as e:
                log.error(f"Error fetching {self.platform} data for {self.stream_username}: {e}")
                return []

        items = []
        current_live = stream_data.get("is_live", False) if stream_data else False

        if current_live and not self.is_live:
            if not self.is_first_run:
                items.append(stream_data)
            self.is_live = True
        elif not current_live and self.is_live:
            self.is_live = False

        if self.is_first_run:
            self.is_first_run = False
            log.info(f"Initial check completed for {self.platform}:{self.stream_username}")
            
        return items

    async def _fetch_platform_data(self):
        """Should be implemented by subclasses."""
        raise NotImplementedError

    async def process_item(self, stream_data):
        await self._send_live_notification(stream_data)

    async def _send_live_notification(self, stream_data):
        """Send a Discord notification that the stream went live."""
        title = stream_data.get("title", self.bot.get_feedback(f"monitor_{self.platform}_fallback_title", guild_id=self.guild_id))
        na_text = self.bot.get_feedback("default_unknown", guild_id=self.guild_id)
        game = stream_data.get("game", na_text)
        viewers = stream_data.get("viewers", 0)
        thumbnail = stream_data.get("thumbnail", "")
        display_name = stream_data.get("display_name", self.stream_username)
        profile_image = stream_data.get("profile_image", "")
        stream_url = stream_data.get("url", "")

        embed = discord.Embed(
            title=title[:256],
            url=stream_url,
            color=self.get_color(0x3d3f45),
        )
        embed.set_author(name=f"{display_name} • LIVE", icon_url=profile_image or discord.Embed.Empty)

        if thumbnail:
            embed.set_image(url=f"{thumbnail}?t={int(time.time())}")

        if game and game != na_text:
            embed.add_field(
                name=self.bot.get_feedback("field_game", guild_id=self.guild_id),
                value=game,
                inline=True,
            )
        if viewers:
            embed.add_field(
                name=self.bot.get_feedback("field_viewers", guild_id=self.guild_id),
                value=f"{viewers:,}",
                inline=True,
            )

        embed.set_footer(text=self.platform.capitalize())

        # Format alert
        alert_text = self.get_alert_message({
            "name": display_name,
            "url": stream_url,
            "game": game,
            "title": title,
            "viewers": f"{viewers:,}",
            "platform": self.platform.capitalize()
        })

        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_stream", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=stream_url, style=discord.ButtonStyle.link))

        await self.send_update(content=f"{alert_text}\n{stream_url}", embed=embed, view=view)

    async def get_latest_item(self):
        """Fetch current stream status for manual check."""
        stream_data = await self._fetch_platform_data()
        
        if not stream_data or not stream_data.get("is_live"):
            return {"empty": True}
        
        title = stream_data.get("title", self.bot.get_feedback(f"monitor_{self.platform}_fallback_title", guild_id=self.guild_id))
        na_text = self.bot.get_feedback("default_unknown", guild_id=self.guild_id)
        game = stream_data.get("game", na_text)
        viewers = stream_data.get("viewers", 0)
        thumbnail = stream_data.get("thumbnail", "")
        display_name = stream_data.get("display_name", self.stream_username)
        profile_image = stream_data.get("profile_image", "")
        stream_url = stream_data.get("url", "")

        embed = discord.Embed(title=title[:256], url=stream_url, color=self.get_color(0x3d3f45))
        embed.set_author(name=f"{display_name} • LIVE", icon_url=profile_image or discord.Embed.Empty)
        if thumbnail: embed.set_image(url=f"{thumbnail}?t={int(time.time())}")
        if game and game != na_text:
            embed.add_field(name=self.bot.get_feedback("field_game", guild_id=self.guild_id), value=game, inline=True)
        if viewers:
            embed.add_field(name=self.bot.get_feedback("field_viewers", guild_id=self.guild_id), value=f"{viewers:,}", inline=True)
        embed.set_footer(text=self.platform.capitalize())

        alert_text = self.get_alert_message({
            "name": display_name,
            "url": stream_url,
            "game": game,
            "title": title,
            "viewers": f"{viewers:,}",
            "platform": self.platform.capitalize()
        })
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_stream", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=stream_url, style=discord.ButtonStyle.link))

        return {
            "content": f"{alert_text}\n{stream_url}",
            "embed": embed,
            "view": view
        }

    async def get_preview(self):
        """Provide a mock preview even if the streamer is offline."""
        item = await self.get_latest_item()
        if item and not item.get("empty"):
            return [item]
            
        # If offline, generate a mock preview
        display_name = self.stream_username
        stream_url = f"https://{self.platform}.com/{self.stream_username}"
        game = "Just Chatting"
        title = f"Mock Preview Alert for {display_name}"
        
        embed = discord.Embed(title=title, url=stream_url, color=self.get_color(0x3d3f45))
        embed.set_author(name=f"{display_name} • LIVE")
        embed.set_footer(text=self.platform.capitalize())
        embed.add_field(name=self.bot.get_feedback("field_game", guild_id=self.guild_id), value=game, inline=True)
        embed.add_field(name=self.bot.get_feedback("field_viewers", guild_id=self.guild_id), value="1,234", inline=True)
        
        alert_text = self.get_alert_message({
            "name": display_name,
            "url": stream_url,
            "game": game,
            "title": title,
            "viewers": "1,234",
            "platform": self.platform.capitalize()
        })
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_stream", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=stream_url, style=discord.ButtonStyle.link))
        
        return [{
            "content": f"{alert_text}\n{stream_url}",
            "embed": embed,
            "view": view
        }]

class TwitchMonitor(BaseStreamMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.platform = "twitch"

    async def _get_twitch_token(self):
        """Get or refresh a Twitch App Access Token."""
        cache_key = "twitch_app_token"
        token = self.bot.monitor_manager.get_shared_data(cache_key)
        if token: return token

        client_id = self.bot.config.get("twitch_client_id")
        client_secret = self.bot.config.get("twitch_client_secret")
        if not client_id or not client_secret:
            log.error("Twitch credentials missing in .env")
            return None

        url = "https://id.twitch.tv/oauth2/token"
        params = {"client_id": client_id, "client_secret": client_secret, "grant_type": "client_credentials"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        token = data.get("access_token")
                        self.bot.monitor_manager.set_shared_data(cache_key, token)
                        return token
        except Exception as e:
            log.error(f"Twitch token error: {e}")
        return None

    async def _fetch_platform_data(self):
        token = await self._get_twitch_token()
        client_id = self.bot.config.get("twitch_client_id")
        if not token or not client_id: return None

        url = f"https://api.twitch.tv/helix/streams?user_login={self.stream_username}"
        headers = {"Client-ID": client_id, "Authorization": f"Bearer {token}"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        streams = data.get("data", [])
                        if not streams: return {"is_live": False}
                        
                        stream = streams[0]
                        user_id = stream.get("user_id")
                        profile_image = ""
                        user_url = f"https://api.twitch.tv/helix/users?id={user_id}"
                        async with session.get(user_url, headers=headers) as user_resp:
                            if user_resp.status == 200:
                                u_data = await user_resp.json()
                                if u_data.get("data"): profile_image = u_data["data"][0].get("profile_image_url", "")

                        na_text = self.bot.get_feedback("default_unknown", guild_id=self.guild_id)
                        thumbnail = stream.get("thumbnail_url", "").replace("{width}", "1280").replace("{height}", "720")
                        
                        return {
                            "is_live": True,
                            "title": stream.get("title", ""),
                            "game": stream.get("game_name", na_text),
                            "viewers": stream.get("viewer_count", 0),
                            "thumbnail": thumbnail,
                            "display_name": stream.get("user_name", self.stream_username),
                            "profile_image": profile_image,
                            "url": f"https://twitch.tv/{self.stream_username}"
                        }
        except Exception as e:
            log.error(f"Twitch fetch error: {e}")
        return None

class KickMonitor(BaseStreamMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.platform = "kick"

    async def _fetch_platform_data(self):
        try:
            url = f"https://kick.com/api/v1/channels/{self.stream_username}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers={"User-Agent": USER_AGENT}) as response:
                    if response.status != 200: return None
                    data = await response.json()
                    
                    livestream = data.get("livestream")
                    if not livestream: return {"is_live": False}
                    
                    na_text = self.bot.get_feedback("default_unknown", guild_id=self.guild_id)
                    return {
                        "is_live": True,
                        "title": livestream.get("session_title", ""),
                        "game": livestream.get("categories", [{}])[0].get("name", na_text),
                        "viewers": livestream.get("viewer_count", 0),
                        "thumbnail": livestream.get("thumbnail", {}).get("url"),
                        "display_name": data.get("user", {}).get("username"),
                        "profile_image": data.get("user", {}).get("profile_pic"),
                        "url": f"https://kick.com/{self.stream_username}"
                    }
        except Exception as e:
            log.error(f"Kick fetch error: {e}")
        return None
