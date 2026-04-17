import aiohttp
import discord
import time
from core.base_monitor import BaseMonitor
from logger import log
import database

class StreamMonitor(BaseMonitor):
    """Monitor for Twitch and Kick streams."""
    
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.stream_platform = config.get("platform", "twitch").lower()
        self.stream_username = config.get("username", self.name)
        self.is_live = False
        self.is_first_run = True

    def get_shared_key(self):
        return f"{self.stream_platform}:{self.stream_username}"

    async def check_for_updates(self):
        """Check if the stream is live."""
        if not self.stream_username:
            log.warning(f"No username for {self.stream_platform} monitor: {self.name}")
            return

        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            stream_data = shared_data
        else:
            try:
                if self.stream_platform == "twitch":
                    stream_data = await self._fetch_twitch_data()
                else: # kick
                    stream_data = await self._fetch_kick_data()
                
                if stream_data:
                    self.bot.monitor_manager.set_shared_data(self.get_shared_key(), stream_data)
            except Exception as e:
                log.error(f"Error fetching {self.stream_platform} data for {self.stream_username}: {e}")
                return

        current_live = stream_data.get("is_live", False) if stream_data else False

        if current_live and not self.is_live:
            if not self.is_first_run:
                # Store in database to avoid duplicate pings across bot restarts if we can
                # But typically stream starts are handled in-memory for session consistency
                await self._send_live_notification(stream_data)
            self.is_live = True
        elif not current_live and self.is_live:
            self.is_live = False

        if self.is_first_run:
            self.is_first_run = False
            log.info(f"Initial check completed for {self.stream_platform}:{self.stream_username}")

    async def _fetch_twitch_data(self):
        """Fetch Twitch stream data via unofficial/official route."""
        # For simplicity in this template, we assume a helper or direct API call
        # Mocking implementation for now
        return None

    async def _fetch_kick_data(self):
        """Fetch Kick stream data using their internal API."""
        try:
            url = f"https://kick.com/api/v1/channels/{self.stream_username}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
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

    async def _send_live_notification(self, stream_data):
        """Send a Discord notification that the stream went live."""
        title = stream_data.get("title", self.bot.get_feedback("monitor_stream_fallback_title", guild_id=self.guild_id))
        na_text = self.bot.get_feedback("default_unknown", guild_id=self.guild_id)
        game = stream_data.get("game", na_text)
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

        embed.set_footer(text=platform_name)

        # Format alert
        alert_text = self.get_alert_message({
            "name": self.bot.get_feedback("monitor_platform_stream", guild_id=self.guild_id),
            "title": title,
            "url": stream_url,
            "game": game,
            "platform": platform_name
        })
        ping = f"{self.ping_role} " if self.ping_role else ""

        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_stream", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=stream_url, style=discord.ButtonStyle.link))

        await self.send_update(content=f"{ping}{alert_text}", embed=embed, view=view)

    async def get_latest_item(self):
        """Fetch current stream status for manual check."""
        if self.stream_platform == "twitch":
            # Mock or implement
            return None
        
        stream_data = await self._fetch_kick_data()
        if not stream_data or not stream_data.get("is_live"):
            return None
        
        title = stream_data.get("title", self.bot.get_feedback("monitor_stream_fallback_title", guild_id=self.guild_id))
        na_text = self.bot.get_feedback("default_unknown", guild_id=self.guild_id)
        game = stream_data.get("game", na_text)
        viewers = stream_data.get("viewers", 0)
        thumbnail = stream_data.get("thumbnail", "")
        display_name = stream_data.get("display_name", self.stream_username)
        profile_image = stream_data.get("profile_image", "")
        stream_url = stream_data.get("url", "")

        platform_name = "Kick"
        platform_color=0x53FC18

        embed = discord.Embed(title=title[:256], url=stream_url, color=platform_color)
        embed.set_author(name=f"{display_name} • LIVE", icon_url=profile_image or discord.Embed.Empty)
        if thumbnail: embed.set_image(url=f"{thumbnail}?t={int(time.time())}")
        if game and game != na_text:
            embed.add_field(name=self.bot.get_feedback("field_game", guild_id=self.guild_id), value=game, inline=True)
        if viewers:
            embed.add_field(name=self.bot.get_feedback("field_viewers", guild_id=self.guild_id), value=f"{viewers:,}", inline=True)
        embed.set_footer(text=platform_name)

        alert_text = self.bot.get_feedback("new_twitch_alert" if self.stream_platform == "twitch" else "new_kick_alert", name=display_name, guild_id=self.guild_id)
        ping = f"{self.ping_role} " if self.ping_role else ""
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_stream", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=stream_url, style=discord.ButtonStyle.link))

        return {
            "content": f"{ping}{alert_text}\n{stream_url}",
            "embed": embed,
            "view": view
        }
