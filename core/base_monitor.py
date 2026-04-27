from abc import ABC, abstractmethod
import discord
from logger import log
import database as db

class BaseMonitor(ABC):
    def __init__(self, bot, config):
        self.bot = bot
        self.config = config
        self.id = config.get("id")
        self.name = config.get("name", "Unknown Monitor")
        self.embed_color = config.get("embed_color", "3d3f45")
        self.platform = config.get("type", "unknown")
        self.enabled = config.get("enabled", True)
        self.is_first_run = True # Used for centralized silent seeding in MonitorManager
        self.target_channels = config.get("target_channels", [])
        self.target_roles = config.get("target_roles", [])
        self.guild_id = config.get("guild_id", 0)
        self.send_initial_alert = config.get("send_initial_alert", False)

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
            # Use base platform name (strip :lang suffix) for translation keys
            base_type = self.platform.split(':')[0]
            msg = self.bot.get_feedback(f"new_{base_type}_alert", guild_id=self.guild_id)
            # If still just the key, use a generic fallback
            if msg == f"new_{base_type}_alert":
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
        
    def get_item_id(self, item):
        """Return the unique identifier for an item from fetch_new_items.
        Should be overridden by subclasses."""
        return None
        
    async def mark_items_published(self, items):
        """Mark a list of items as published globally (guild_id=0)."""
        pass

    def get_shared_key(self):
        """Return a key for the shared poll registry. Subclasses should override if pollable."""
        return None
        
    def get_color(self, default_hex=0x3d3f45):
        """Get the localized/custom embed color, falling back to global default (0x3d3f45)."""
        # The config is often flattened, so check top level first
        c = self.config.get("embed_color")
        
        # Fallback to nested extra_settings if not at top level
        if not c:
            extra = self.config.get("extra_settings", {})
            if isinstance(extra, dict):
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
                    if content is None and embed is None and view is None:
                        continue # Skip empty updates to prevent 50006 errors
                        
                    # Logic to handle Discord Components V2 (LayoutView)
                    # V2 messages (IS_COMPONENTS_V2 flag) cannot have the 'content' field.
                    # If we have both content and a V2 view, we send them as two separate messages.
                    is_v2 = view and (hasattr(view, "_is_v2") or type(view).__name__ == "LayoutView")
                    
                    if is_v2 and content:
                        # Message 1: Alert Text (and URL)
                        # We suppress embeds so Discord doesn't generate a native embed if a URL is present
                        await channel.send(content=content, suppress_embeds=True)
                        # Message 2: The V2 Layout
                        await channel.send(view=view)
                    else:
                        await channel.send(content=content, embed=embed, view=view)
                        
                    log.info(f"Published update for {self.name} on channel {channel.name}", extra={'guild_id': self.guild_id})
                    await db.increment_post_stat(self.guild_id, self.platform)
                    await db.update_last_post_at(self.id)
                except Exception as e:
                    log.error(f"Failed to send update to channel {ch_id} for {self.name}: {e}", extra={'guild_id': self.guild_id})
            else:
                log.warning(f"Could not find channel {ch_id} for {self.name}", extra={'guild_id': self.guild_id})
