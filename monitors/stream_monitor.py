import aiohttp
import discord
import time
from core.base_monitor import BaseMonitor
from logger import log
import database as db
from core.ui_layouts import generate_stream_layout

# Standard User-Agent to avoid being blocked
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

class BaseStreamMonitor(BaseMonitor):
    """Base class for stream platforms (Twitch, Kick)."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        raw_username = config.get("username", self.name)
        
        # Clean up URL if user pasted a full link
        if raw_username:
            raw_username = raw_username.strip().rstrip('/')
            if 'kick.com/' in raw_username:
                raw_username = raw_username.split('kick.com/')[-1].split('?')[0]
            elif 'twitch.tv/' in raw_username:
                raw_username = raw_username.split('twitch.tv/')[-1].split('?')[0]
                
        self.stream_username = raw_username
        self.is_live = False

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
            # Notify only if NOT in silent start mode
            if not getattr(self, 'is_silent_start', False):
                await self.process_item(stream_data)
            self.is_live = True
        elif not current_live and self.is_live:
            self.is_live = False
            
        self.is_silent_start = False
        self.is_first_run = False
        return items

    async def _fetch_platform_data(self):
        """Should be implemented by subclasses."""
        raise NotImplementedError

    async def process_item(self, stream_data):
        await self._send_live_notification(stream_data)

    def _build_stream_output(self, stream_data):
        """Build Components V2 layout from stream data. Returns (content, view) dict."""
        title = stream_data.get("title", self.bot.get_feedback(f"monitor_{self.platform}_fallback_title", guild_id=self.guild_id))
        na_text = self.bot.get_feedback("default_unknown", guild_id=self.guild_id)
        game = stream_data.get("game", na_text)
        viewers = stream_data.get("viewers", 0)
        thumbnail = stream_data.get("thumbnail", "")
        display_name = stream_data.get("display_name", self.stream_username)
        profile_image = stream_data.get("profile_image", "")
        stream_url = stream_data.get("url", "")

        # Cache-bust thumbnail
        if thumbnail:
            thumbnail = f"{thumbnail}?t={int(time.time())}"

        alert_text = self.get_alert_message({
            "name": display_name,
            "url": stream_url,
            "game": game,
            "title": title,
            "viewers": f"{viewers:,}",
            "platform": self.platform.capitalize()
        })

        content, layout = generate_stream_layout(
            bot=self.bot,
            guild_id=self.guild_id,
            alert_text=alert_text,
            display_name=display_name,
            title=title[:256],
            url=stream_url,
            thumbnail_url=thumbnail,
            profile_image_url=profile_image,
            game=game,
            viewers=viewers,
            platform=self.platform,
            accent_color=self.get_color(0x3d3f45)
        )

        return {
            "content": content,
            "view": layout,
            "title": title,
            "display_name": display_name,
            "thumbnail": stream_data.get("thumbnail", ""),
            "stream_url": stream_url
        }

    async def _send_live_notification(self, stream_data):
        """Send a Discord notification that the stream went live."""
        output = self._build_stream_output(stream_data)
        
        await self.send_update(content=output["content"], view=output["view"])

        # Log to DB for dashboard timeline
        try:
            await db.mark_as_published(
                entry_id=f"{self.platform}:{self.stream_username}:{int(time.time())}", 
                platform=self.platform,
                feed_url=output["stream_url"],
                guild_id=self.guild_id,
                title=output["title"],
                thumbnail_url=output["thumbnail"],
                author_name=output["display_name"]
            )
        except Exception as e:
            log.error(f"Failed to log stream notification: {e}")

    async def get_latest_item(self):
        """Fetch current stream status for manual check."""
        stream_data = await self._fetch_platform_data()
        
        if not stream_data or not stream_data.get("is_live"):
            return {"empty": True}
        
        output = self._build_stream_output(stream_data)
        return {"content": output["content"], "view": output["view"]}

    async def get_preview(self):
        """Provide a mock preview even if the streamer is offline."""
        item = await self.get_latest_item()
        if item and not item.get("empty"):
            return [item]
            
        # If offline, generate a mock preview
        mock_data = {
            "title": f"Mock Preview Alert for {self.stream_username}",
            "game": "Just Chatting",
            "viewers": 1234,
            "thumbnail": "",
            "display_name": self.stream_username,
            "profile_image": "",
            "url": f"https://{self.platform}.com/{self.stream_username}",
            "is_live": True
        }
        
        output = self._build_stream_output(mock_data)
        return [{"content": output["content"], "view": output["view"]}]

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

    async def _get_kick_token(self):
        """Get or refresh a Kick App Access Token."""
        cache_key = "kick_app_token"
        token = self.bot.monitor_manager.get_shared_data(cache_key)
        if token: return token

        client_id = self.bot.config.get("kick_client_id")
        client_secret = self.bot.config.get("kick_client_secret")
        if not client_id or not client_secret:
            log.error("Kick credentials (kick_client_id, kick_client_secret) missing in .env")
            return None

        url = "https://id.kick.com/oauth/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}) as response:
                    if response.status == 200:
                        resp_data = await response.json()
                        token = resp_data.get("access_token")
                        self.bot.monitor_manager.set_shared_data(cache_key, token)
                        return token
                    else:
                        log.error(f"Kick token error: {response.status} {await response.text()}")
        except Exception as e:
            log.error(f"Kick token error: {e}")
        return None

    async def _fetch_platform_data(self):
        token = await self._get_kick_token()
        if not token:
            return None

        try:
            url = f"https://api.kick.com/public/v1/channels?slug={self.stream_username}"
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 401:
                        # Token might be expired, clear it from cache so it fetches a new one next time
                        self.bot.monitor_manager.set_shared_data("kick_app_token", None)
                        return None
                        
                    if response.status != 200:
                        return None
                        
                    data = await response.json()
                    channels = data.get("data", [])
                    
                    if not channels:
                        return {"is_live": False}
                        
                    channel_data = channels[0]
                    stream_data = channel_data.get("stream")
                    
                    if not stream_data or not stream_data.get("is_live"):
                        return {"is_live": False}
                    
                    na_text = self.bot.get_feedback("default_unknown", guild_id=self.guild_id)
                    
                    # Extract info from new API structure
                    title = channel_data.get("stream_title", "")
                    game = channel_data.get("category", {}).get("name", na_text)
                    viewers = stream_data.get("viewer_count", 0)
                    thumbnail = stream_data.get("thumbnail", "")
                    profile_image = channel_data.get("banner_picture", "") # They provide banner, not profile pic in this endpoint currently
                    display_name = channel_data.get("slug", self.stream_username)

                    # Ensure protocol
                    if thumbnail and thumbnail.startswith("//"):
                        thumbnail = f"https:{thumbnail}"
                    if profile_image and profile_image.startswith("//"):
                        profile_image = f"https:{profile_image}"

                    return {
                        "is_live": True,
                        "title": title,
                        "game": game,
                        "viewers": viewers,
                        "thumbnail": thumbnail,
                        "display_name": display_name,
                        "profile_image": profile_image,
                        "url": f"https://kick.com/{self.stream_username}"
                    }
        except Exception as e:
            log.error(f"Kick fetch error: {e}")
        return None
