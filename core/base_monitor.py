from abc import ABC, abstractmethod
import discord
from logger import log
import database

class BaseMonitor(ABC):
    def __init__(self, bot, config):
        self.bot = bot
        self.config = config
        self.id = config.get("id")
        self.name = config.get("name", "Unknown Monitor")
        self.embed_color = config.get("embed_color", "3d3f45")
        self.platform = config.get("type", "unknown")
        self.enabled = config.get("enabled", True)
        self.target_channels = config.get("target_channels", [])
        self.target_roles = config.get("target_roles", [])
        self.guild_id = config.get("guild_id", 0)

    @property
    def ping_role(self):
        """Return the formatted ping string if a role is configured."""
        pings = []
        for role_id in self.target_roles:
            if role_id and role_id != 0:
                pings.append(f"<@&{role_id}>")
        return " ".join(pings) if pings else ""

    def get_alert_message(self, variables=None):
        """
        Get the alert message based on priority:
        1. Monitor-specific custom alert
        2. Guild-specific default alert for this platform
        3. System default from language files
        """
        variables = variables or {}
        # Ensure {name} is always available as a variable
        if "name" not in variables:
            variables["name"] = self.name

        # 1. Monitor-specific
        extra = self.config.get("extra_settings", {})
        msg = extra.get("custom_alert")
        
        # 2. Guild-default
        if not msg:
            guild_settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            templates = guild_settings.get("alert_templates", {})
            msg = templates.get(self.platform)
            
        # 3. System fallback
        if not msg:
            msg = self.bot.get_feedback(f"new_{self.platform}_alert", guild_id=self.guild_id)
            # If still just the key, use a generic fallback
            if msg == f"new_{self.platform}_alert":
                msg = self.bot.get_feedback("default_new_item", name=self.name, guild_id=self.guild_id)

        # Apply variables
        for k, v in variables.items():
            msg = msg.replace(f"{{{k}}}", str(v))
            
        ping = self.ping_role
        if ping:
            return f"{ping}\n{msg}"
        return msg
        
    async def fetch_new_items(self):
        """Fetch and return new, unpublished items from the data source.
        Should return a list of items."""
        return []

    async def process_item(self, item):
        """Process and send the new item to discord."""
        pass
        
    async def mark_items_published(self, items):
        """Mark a list of items as published globally (guild_id=0)."""
        pass

    def get_shared_key(self):
        """Return a key for the shared poll registry. Subclasses should override if pollable."""
        return None
        
    def get_color(self, default_hex=0x3d3f45):
        """Get the localized/custom embed color, falling back to global default (0x3d3f45)."""
        # Config uses extra_settings which contains embed_color if configured
        extra = self.config.get("extra_settings", {})
        if extra and isinstance(extra, dict):
            c = extra.get("embed_color")
            if c:
                try:
                    if isinstance(c, str):
                        c = c.replace("#", "").replace("0x", "")
                        return int(c, 16)
                    return int(c)
                except (ValueError, TypeError):
                    pass
        return default_hex

    async def check_for_updates(self):
        """Perform the check for updates. Deprecated in favor of fetch_new_items."""
        pass
    
    @abstractmethod
    async def get_latest_item(self):
        """Fetch the most recent item and return its (content, embed, view) without posting or marking as published."""
        pass

    async def get_latest_items(self, count=1):
        """Fetch the N most recent items and return as a list of data dicts. Default calls get_latest_item."""
        if count <= 1:
            item = await self.get_latest_item()
            return [item] if item else []
        return [] # Subclasses should override for N > 1

    async def get_preview(self):
        """
        Return a list of data dicts (content, embed, view) to represent how an alert looks.
        Default implementation returns the latest real item.
        """
        item = await self.get_latest_item()
        if not item or item.get("empty"):
            return None
        return [item]

    async def send_update(self, content=None, embed=None, view=None):
        """Send an update to the configured Discord channel(s)."""
        if not self.target_channels:
            log.warning(f"No target channels configured for monitor: {self.name}")
            return

        for ch_id in self.target_channels:
            channel = self.bot.get_channel(ch_id)
            if not channel:
                try:
                    channel = await self.bot.fetch_channel(ch_id)
                except discord.NotFound as enf:
                    if enf.code == 10003: # Unknown Channel
                        log.error(f"Channel {ch_id} for {self.name} is GONE (10003).")
                        continue
                    log.error(f"Could not fetch channel {ch_id} for {self.name}: {enf}")
                    continue
                except Exception as e:
                    log.error(f"Could not fetch channel {ch_id} for {self.name}: {e}")
                    continue

            if channel:
                try:
                    await channel.send(content=content, embed=embed, view=view)
                    log.info(f"Published update for {self.name} on channel {channel.name}", extra={'guild_id': self.guild_id})
                    await database.increment_post_stat(self.guild_id, self.platform)
                except Exception as e:
                    log.error(f"Failed to send update to channel {ch_id} for {self.name}: {e}", extra={'guild_id': self.guild_id})
            else:
                log.warning(f"Could not find channel {ch_id} for {self.name}", extra={'guild_id': self.guild_id})
