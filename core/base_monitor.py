from abc import ABC, abstractmethod
import discord
from logger import log

class BaseMonitor(ABC):
    def __init__(self, bot, config, db):
        self.bot = bot
        self.config = config
        self.db = db
        self.name = config.get("name", "Unknown Monitor")
        self.platform = config.get("type", "unknown")
        self.enabled = config.get("enabled", True)
        self.discord_channel_id = config.get("discord_channel_id")
        self.ping_role_id = config.get("ping_role_id", 0)

    @property
    def ping_role(self):
        """Return the formatted ping string if a role is configured."""
        if self.ping_role_id and self.ping_role_id != 0:
            return f"<@&{self.ping_role_id}>"
        return ""

    @abstractmethod
    async def check_for_updates(self):
        """Perform the check for updates and return a list of new entries/embeds."""
        pass

    async def send_update(self, content=None, embed=None, view=None):
        """Send an update to the configured Discord channel."""
        if not self.discord_channel_id:
            log.warning(f"No Discord channel ID configured for monitor: {self.name}")
            return

        channel = self.bot.get_channel(self.discord_channel_id)
        if not channel:
            try:
                channel = await self.bot.fetch_channel(self.discord_channel_id)
            except Exception as e:
                log.error(f"Could not fetch channel {self.discord_channel_id} for {self.name}: {e}")
                return

        if channel:
            try:
                await channel.send(content=content, embed=embed, view=view)
                log.info(f"Published update for {self.name} on channel {channel.name}")
            except Exception as e:
                log.error(f"Failed to send update for {self.name}: {e}")
        else:
            log.warning(f"Could not find channel {self.discord_channel_id} for {self.name}")
