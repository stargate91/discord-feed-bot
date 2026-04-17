import aiohttp
import discord
import time
from core.base_monitor import BaseMonitor
from logger import log


class StreamMonitor(BaseMonitor):
    """Monitor for live streams on Twitch and Kick platforms."""

    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.stream_platform = config.get("stream_platform", "twitch")  # "twitch" or "kick"
        self.stream_username = config.get("stream_username", "")
        self.cooldown_seconds = config.get("cooldown_seconds", 7200)  # 2 hours default
        self.is_first_run = True
        self._was_live = False
        self._last_notified = 0

    def get_shared_key(self):
        return f"stream:{self.stream_platform}:{self.stream_username}"

    async def check_for_updates(self):
        """Check if the streamer went live."""
        if not self.stream_username:
            log.warning(f"No stream username configured for monitor: {self.name}")
            return

        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            stream_data = shared_data
        else:
            stream_data = await self._fetch_stream_status()
            if stream_data and stream_data.get("is_live"):
                self.bot.monitor_manager.set_shared_data(self.get_shared_key(), stream_data)

        if stream_data is None:
            # API error, skip this cycle
            return

        is_live = stream_data.get("is_live", False)

        if self.is_first_run:
            # On first run, just record the state; don't notify
            self._was_live = is_live
            log.info(
                f"Stream monitor initialized for {self.stream_username} "
                f"({'LIVE' if is_live else 'OFFLINE'}). Monitoring active."
            )
            self.is_first_run = False
            return

        # Trigger notification only on offline -> live transition
        if is_live and not self._was_live:
            now = time.time()
            if now - self._last_notified < self.cooldown_seconds:
                log.debug(
                    f"Stream {self.stream_username} is live but cooldown active, skipping."
                )
                self._was_live = is_live
                return

            self._last_notified = now
            await self._send_live_notification(stream_data)

        self._was_live = is_live

    async def _fetch_stream_status(self):
        """Fetch stream status from the appropriate platform API."""
        if self.stream_platform == "twitch":
            return await self._fetch_twitch()
        elif self.stream_platform == "kick":
            return await self._fetch_kick()
        else:
            log.warning(f"Unknown stream platform: {self.stream_platform}")
            return None

    async def _fetch_twitch(self):
        """Check Twitch stream status via the public GQL API."""
        url = "https://gql.twitch.tv/gql"
        headers = {
            "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
            "Content-Type": "application/json",
        }
        payload = [
            {
                "operationName": "StreamMetadata",
                "variables": {"channelLogin": self.stream_username},
                "extensions": {
                    "persistedQuery": {
                        "version": 1,
                        "sha256Hash": "252a46e68f3e5d1e0042f5e8e3dfb850f4f5b0e1ecbe101b2e060da023e4b1e0",
                    }
                },
            }
        ]

        try:
            async with aiohttp.ClientSession() as session:
                # Use a simpler, more reliable query
                simple_payload = {
                    "query": f'query {{ user(login: "{self.stream_username}") {{ stream {{ title game {{ displayName }} type viewersCount previewImageURL(width: 640, height: 360) }} displayName profileImageURL(width: 70) }} }}'
                }
                async with session.post(url, headers=headers, json=simple_payload) as response:
                    if response.status != 200:
                        log.debug(f"Twitch GQL returned {response.status}")
                        return None
                    data = await response.json()
        except Exception as e:
            log.error(f"Error fetching Twitch data for {self.stream_username}: {e}")
            return None

        user_data = data.get("data", {}).get("user")
        if not user_data:
            return {"is_live": False}

        stream = user_data.get("stream")
        if not stream or stream.get("type") != "live":
            return {"is_live": False}

        return {
            "is_live": True,
            "title": stream.get("title", ""),
            "game": stream.get("game", {}).get("displayName", "Unknown"),
            "viewers": stream.get("viewersCount", 0),
            "thumbnail": stream.get("previewImageURL", ""),
            "display_name": user_data.get("displayName", self.stream_username),
            "profile_image": user_data.get("profileImageURL", ""),
            "url": f"https://twitch.tv/{self.stream_username}",
        }

    async def _fetch_kick(self):
        """Check Kick stream status via the public Channel API."""
        url = f"https://kick.com/api/v2/channels/{self.stream_username}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status != 200:
                        log.debug(f"Kick API returned {response.status}")
                        return None
                    data = await response.json()
        except Exception as e:
            log.error(f"Error fetching Kick data for {self.stream_username}: {e}")
            return None

        livestream = data.get("livestream")
        if not livestream or not livestream.get("is_live"):
            return {"is_live": False}

        return {
            "is_live": True,
            "title": livestream.get("session_title", ""),
            "game": livestream.get("categories", [{}])[0].get("name", "Unknown")
            if livestream.get("categories")
            else "Unknown",
            "viewers": livestream.get("viewer_count", 0),
            "thumbnail": livestream.get("thumbnail", {}).get("url", "")
            if isinstance(livestream.get("thumbnail"), dict)
            else "",
            "display_name": data.get("user", {}).get("username", self.stream_username),
            "profile_image": data.get("user", {}).get("profile_pic", ""),
            "url": f"https://kick.com/{self.stream_username}",
        }

    async def _send_live_notification(self, stream_data):
        """Send a Discord notification that the stream went live."""
        title = stream_data.get("title", "Élő adás!")
        game = stream_data.get("game", "Unknown")
        viewers = stream_data.get("viewers", 0)
        thumbnail = stream_data.get("thumbnail", "")
        display_name = stream_data.get("display_name", self.stream_username)
        profile_image = stream_data.get("profile_image", "")
        stream_url = stream_data.get("url", "")

        platform_name = "Twitch" if self.stream_platform == "twitch" else "Kick"
        platform_color=self.get_color(0x9146FF) if self.stream_platform == "twitch" else 0x53FC18

        embed = discord.Embed(
            title=title[:256],
            url=stream_url,
            color=platform_color,
        )
        embed.set_author(name=f"{display_name} • LIVE", icon_url=profile_image or discord.Embed.Empty)

        if thumbnail:
            # Append timestamp to bust Discord's cache
            embed.set_image(url=f"{thumbnail}?t={int(time.time())}")

        if game and game != "Unknown":
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

        embed.set_footer(text=platform_name)

        # Format alert
        alert_text = self.get_alert_message({
            "name": display_name,
            "title": title,
            "url": stream_url,
            "game": game,
            "platform": platform_name
        })
        ping = f"{self.ping_role} " if self.ping_role else ""

        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_stream", guild_id=self.guild_id)
        view.add_item(
            discord.ui.Button(
                label=btn_label, url=stream_url, style=discord.ButtonStyle.link
            )
        )

        await self.send_update(
            content=f"{ping}{alert_text}\n{stream_url}", embed=embed, view=view
        )
        log.info(f"Sent LIVE notification for {display_name} on {platform_name}")

    async def get_latest_item(self):
        """Fetch the current stream status for manual /check."""
        if not self.stream_username:
            return None

        stream_data = await self._fetch_stream_status()
        if stream_data is None:
            return None

        if not stream_data.get("is_live"):
            return {"empty": True}

        # Build the same embed as the live notification
        title = stream_data.get("title", "Élő adás!")
        game = stream_data.get("game", "Unknown")
        viewers = stream_data.get("viewers", 0)
        thumbnail = stream_data.get("thumbnail", "")
        display_name = stream_data.get("display_name", self.stream_username)
        profile_image = stream_data.get("profile_image", "")
        stream_url = stream_data.get("url", "")

        platform_name = "Twitch" if self.stream_platform == "twitch" else "Kick"
        platform_color=self.get_color(0x9146FF) if self.stream_platform == "twitch" else 0x53FC18

        embed = discord.Embed(title=title[:256], url=stream_url, color=platform_color)
        embed.set_author(name=f"{display_name} • LIVE", icon_url=profile_image or discord.Embed.Empty)
        if thumbnail:
            embed.set_image(url=f"{thumbnail}?t={int(time.time())}")
        if game and game != "Unknown":
            embed.add_field(
                name=self.bot.get_feedback("field_game", guild_id=self.guild_id), value=game, inline=True
            )
        if viewers:
            embed.add_field(
                name=self.bot.get_feedback("field_viewers", guild_id=self.guild_id),
                value=f"{viewers:,}",
                inline=True,
            )
        embed.set_footer(text=platform_name)

        alert_key = "new_twitch_alert" if self.stream_platform == "twitch" else "new_kick_alert"
        alert_text = self.bot.get_feedback(alert_key, name=display_name, guild_id=self.guild_id)
        ping = f"{self.ping_role} " if self.ping_role else ""

        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_stream", guild_id=self.guild_id)
        view.add_item(
            discord.ui.Button(
                label=btn_label, url=stream_url, style=discord.ButtonStyle.link
            )
        )

        return {
            "content": f"{ping}{alert_text}\n{stream_url}",
            "embed": embed,
            "view": view,
        }
