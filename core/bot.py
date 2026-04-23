import asyncio
import logging
import discord
import json
import os
import re
from discord.ext import commands
from discord import app_commands
from logger import log
import database
from datetime import datetime

class FeedBot(commands.Bot):
    def __init__(self, config):
        # Intents needed for basic bot functionality
        intents = discord.Intents.default()
        intents.message_content = True
        
        prefix = config.get("command_prefix", "!")
        super().__init__(command_prefix=prefix, intents=intents)
        self.config = config
        self.monitor_manager = None
        self.language_data = {}
        self.locales = {}
        self.guild_settings_cache = {}

    async def setup_hook(self):
        """Perform initialization tasks before the bot connects."""
        # Load localization files
        if os.path.exists("locales"):
            for filename in os.listdir("locales"):
                if filename.endswith(".json"):
                    lang_code = filename[:-5]
                    try:
                        with open(f"locales/{filename}", "r", encoding="utf-8") as f:
                            self.locales[lang_code] = json.load(f)
                    except Exception as e:
                        log.error(f"Failed to load language file {filename}: {e}")
        
        self.language_data = self.locales.get("en", {})
        log.info(f"Loaded {len(self.locales)} language packs (Default: EN).")

        # Load all guild settings into memory
        try:
            settings_rows = await database._fetch("SELECT guild_id, language, admin_role_id, alert_templates, premium_until, tier, stripe_subscription_id FROM guild_settings")
            
            for row in settings_rows:
                g_id = row[0]
                self.guild_settings_cache[g_id] = {
                    "language": row[1] or "en",
                    "admin_role_id": row[2] or 0,
                    "alert_templates": json.loads(row[3]) if row[3] else {},
                    "premium_until": row[4],
                    "tier": row[5] or 0,
                    "stripe_subscription_id": row[6]
                }
        except Exception as e:
            log.error(f"Error loading guild settings cache: {e}")

        # Initialize Monitor Manager (Lazy import to avoid circular dependency)
        from core.monitor_manager import MonitorManager
        
        # Load Global Settings from DB
        # We override config values if they exist in the DB
        p_interval = await database.get_bot_setting("presence_interval_seconds")
        if p_interval:
            self.config["presence_interval_seconds"] = int(p_interval)
            
        r_interval = await database.get_bot_setting("refresh_interval_minutes")
        if r_interval:
            self.config["refresh_interval_minutes"] = int(r_interval)
            
        a_channel = await database.get_bot_setting("admin_channel_id")
        if a_channel:
            self.config["admin_channel_id"] = int(a_channel)

        self.monitor_manager = MonitorManager(self, self.config)
        
        # Load Cogs
        await self.load_all_extensions()

        # Register Master and Status groups to master guilds
        master_guilds = self.config.get("master_guild_ids", [])
        for mg_id in master_guilds:
            guild_obj = discord.Object(id=mg_id)
            master_cog = self.get_cog("master")
            if master_cog:
                self.tree.add_command(master_cog.app_command, guild=guild_obj)
                

        # Load monitors from DB
        from core.monitor_factory import create_monitor_instance
        db_monitors = await database.get_all_monitors()
        for m_config in db_monitors:
            monitor = create_monitor_instance(self, m_config)
            if monitor:
                self.monitor_manager.add_monitor(monitor)
            else:
                log.warning(f"Unknown monitor type in DB: {m_config.get('type')}")

        # Start the background loop as a task
        self.monitor_task = self.loop.create_task(self.monitor_manager.start_loop())
        
        # Override Tree Error Handler for Slash Commands
        self.tree.on_error = self.on_app_command_error


    async def load_all_extensions(self):
        """Locate and load all cogs from the cogs/ directory."""
        if not os.path.exists("cogs"):
            return
            
        for filename in os.listdir("cogs"):
            if filename.endswith("_cog.py"):
                try:
                    await self.load_extension(f"cogs.{filename[:-3]}")
                    log.info(f"Loaded extension: {filename}")
                except Exception as e:
                    log.error(f"Failed to load extension {filename}: {e}", exc_info=True)

    def restart_monitor_task(self):
        if hasattr(self, 'monitor_task') and not self.monitor_task.done():
            self.monitor_task.cancel()
        self.monitor_manager.is_running = False
        self.monitor_task = self.loop.create_task(self.monitor_manager.start_loop())

    async def on_ready(self):
        log.info(f"--- FEED BOT ONLINE ---")
        log.info(f"Identity: {self.user} (ID: {self.user.id})")
        log.info(f"Prefix: {self.command_prefix}")
        log.info(f"Intents - Message Content: {self.intents.message_content}")
        log.info(f"Intents - Guild Messages: {self.intents.guild_messages}")
        log.info(f"Connected to {len(self.guilds)} guilds.")

        # Sync guilds with database
        log.info("Syncing guilds with database...")
        synced = 0
        for guild in self.guilds:
            try:
                # Ensure guild exists in database
                res = await database._execute(
                    "INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING",
                    guild.id
                )
                # If a new row was inserted or if we just want to ensure cache is warm
                if guild.id not in self.guild_settings_cache:
                    self.guild_settings_cache[guild.id] = {
                        "language": "hu",
                        "admin_role_id": 0,
                        "alert_templates": {},
                        "premium_until": None,
                        "tier": 0,
                        "stripe_subscription_id": None
                    }
                    synced += 1
            except Exception as e:
                log.error(f"Error syncing guild {guild.id}: {e}")
        
        if synced > 0:
            log.info(f"Successfully synced {synced} new guilds to database.")
        
        log.info(f"------------------------")

    async def on_guild_join(self, guild):
        """Called when the bot joins a new guild."""
        log.info(f"Joined new guild: {guild.name} (ID: {guild.id})")
        try:
            # Ensure guild exists in database
            await database._execute(
                "INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING",
                guild.id
            )
            # Update local cache with default settings
            if guild.id not in self.guild_settings_cache:
                self.guild_settings_cache[guild.id] = {
                    "language": "hu", # Default for new joins
                    "admin_role_id": 0,
                    "alert_templates": {},
                    "premium_until": None,
                    "tier": 0,
                    "stripe_subscription_id": None
                }
        except Exception as e:
            log.error(f"Error initializing guild settings for {guild.id}: {e}")

    async def on_guild_remove(self, guild):
        """Called when the bot is kicked from a guild."""
        log.info(f"Left guild: {guild.name} (ID: {guild.id})")
        # We keep the settings in DB for potential re-joins, but we could remove from cache
        if guild.id in self.guild_settings_cache:
            del self.guild_settings_cache[guild.id]

    async def on_message(self, message):
        """Process commands and filter logs."""
        log.info(f"DEBUG: on_message triggered by {message.author}: {message.content[:50]}")
        if message.author.bot:
            return
        
        prefix = self.command_prefix
        suffix = self.config.get("command_suffix", "")
        
        if message.content.startswith(prefix):
            # Handle Suffix (e.g., !sync_nova -> !sync)
            if suffix:
                parts = message.content.split(" ", 1)
                command_part = parts[0]
                if command_part.endswith(suffix):
                    clean_command = command_part[:-len(suffix)]
                    if len(parts) > 1:
                        message.content = clean_command + " " + parts[1]
                    else:
                        message.content = clean_command
                    log.info(f"Command cleaned: {command_part} -> {clean_command}")

            master_guilds = self.config.get("master_guilds", {})
            
            if master_guilds and message.guild:
                guild_id_str = str(message.guild.id)
                if guild_id_str not in master_guilds:
                    log.info(f"Command ignored: Guild {guild_id_str} not in master_guilds list")
                    return
                    
                admin_channel_id = master_guilds.get(guild_id_str, 0)
                if admin_channel_id != 0 and message.channel.id != admin_channel_id:
                    log.info(f"Command ignored: Channel {message.channel.id} is not the master admin channel ({admin_channel_id})")
                    return
                
                log.info(f"Processing admin command: {message.content} in #{message.channel.name}")
        
        await self.process_commands(message)

    def is_bot_admin(self, member):
        """Check if a member is a bot admin (Owner OR Discord Admin OR Admin Role)."""
        if not member or not hasattr(member, 'guild'):
            return False
            
        # 1. Global Owner
        if member.id in [self.owner_id] or (self.application and member.id == self.application.owner.id):
            return True

        # 2. Discord Admin
        if member.guild_permissions.administrator:
            return True
            
        # 3. Check for configured Admin Role
        settings = self.guild_settings_cache.get(member.guild.id, {})
        admin_role_id = settings.get("admin_role_id", 0)
        
        if admin_role_id != 0:
            role = member.get_role(admin_role_id)
            if role in member.roles:
                return True
                
        return False

    def is_master(self, guild_id):
        """Check if a guild is configured as a Master Guild in config.json."""
        master_guilds = self.config.get("master_guilds", {})
        return str(guild_id) in master_guilds

    def is_premium(self, guild_id):
        """Check if a guild has premium status (via Tier or DB expiration or Master status)."""
        # 1. Master Guilds are automatically Premium Forever (Tier 3+)
        if self.is_master(guild_id):
            return True
            
        settings = self.guild_settings_cache.get(guild_id, {})
        
        # 2. Check Tier Level
        if settings.get("tier", 0) >= 1:
            return True

        # 3. DB Source (Calculated from expiration date - Legacy support)
        p_until = settings.get("premium_until")
        if p_until:
            return p_until > datetime.now()
            
        return False

    def get_guild_tier_limits(self, guild_id):
        """Returns (min_refresh_min, max_refresh_min, default_refresh_min, max_monitors, max_channels, max_roles) based on tier."""
        if self.is_master(guild_id):
            return (1, 1440, 5, 1000, 20, 20)
            
        settings = self.guild_settings_cache.get(guild_id, {})
        tier = settings.get("tier", 0)
        
        # Legacy fallback if tier is 0 but premium_until is valid
        if tier == 0 and self.is_premium(guild_id):
            tier = 3 # Assume top tier for legacy premium users

        if tier == 3: # Architect
            return (2, 1440, 5, 100, 15, 15)
        if tier == 2: # Operator
            return (2, 1440, 5, 50, 10, 10)
        if tier == 1: # Scout
            return (2, 1440, 5, 25, 5, 5)
            
        return (20, 1440, 30, 5, 1, 1) # Free Tier

    def has_feature(self, guild_id, feature_name):
        """Check if a guild has access to a specific premium feature."""
        # Masters have everything
        if self.is_master(guild_id):
            return True
            
        premium = self.is_premium(guild_id)
        
        # Premium-only features
        premium_only = ["crypto", "repost", "custom_color", "alert_template", "genre_filter", "bulk_delete", "tmdb_language_filter"]
        if feature_name in premium_only:
            return premium
            
        return True

    def get_guild_refresh_interval(self, guild_id):
        """Returns the configured refresh interval in minutes, validated against tier limits."""
        min_m, max_m, def_m, _, _, _ = self.get_guild_tier_limits(guild_id)
        settings = self.guild_settings_cache.get(guild_id, {})
        
        ri = settings.get("refresh_interval")
        if ri is not None and isinstance(ri, int):
            # Clamp value strictly to limits
            clamped = max(min_m, min(max_m, ri))
            return clamped
        return def_m



    def is_master_admin(self, member):
        """Check if a member is a Master Admin (Owner OR globally permitted User ID)."""
        if not member:
            return False
            
        # 1. Global Owner
        if member.id in [self.owner_id] or (self.application and member.id == self.application.owner.id):
            return True

        # 2. Check config.json array
        if member.id in self.config.get("master_user_ids", []):
            return True
            
        return False

    async def on_error(self, event, *args, **kwargs):
        log.error(f"Global Event Error in '{event}':", exc_info=True)

    async def on_command_error(self, ctx, error):
        if isinstance(error, commands.CommandNotFound):
            return
        log.error(f"Prefix Command Error in '{ctx.command}': {error}", exc_info=True)
        await ctx.send(self.get_feedback("error_prefix_msg", error=error, guild_id=ctx.guild.id if ctx.guild else 0), delete_after=10)

    async def on_app_command_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        log.error(f"Slash Command Error in '/{interaction.command.name if interaction.command else 'unknown'}': {error}", exc_info=True, extra={'guild_id': interaction.guild_id or 0})
        
        msg = self.get_feedback("error_unexpected", guild_id=interaction.guild_id or 0)
        if interaction.response.is_done():
            await interaction.followup.send(msg, ephemeral=True)
        else:
            await interaction.response.send_message(msg, ephemeral=True)

    def get_feedback(self, key, guild_id=None, force_lang=None, **kwargs):
        """Helper to get localized feedback."""
        guild_id = guild_id or 0
        settings = self.guild_settings_cache.get(guild_id, {})
        
        # Determine language
        master_guilds = self.config.get("master_guild_ids", [])
        
        # 1. Force Language Override
        if force_lang:
            lang_code = force_lang
        else:
            # 2. User context: prioritizes guild setting
            lang_code = settings.get("language")
            
            # 3. Smart Fallback for user content
            if not lang_code:
                # If no guild setting exists, we default to Hungarian for user-facing content (feeds)
                # This ensures cards are localized even on the Master Guild without manual setup.
                lang_code = "hu"

        lang_data = self.locales.get(lang_code, self.locales.get("en", self.language_data))

        text = lang_data.get(key, self.language_data.get(key, key))
        if not isinstance(text, str):
            return text
            
        for k, v in kwargs.items():
            text = text.replace(f"{{{k}}}", str(v))
        return text

    def parse_emoji_text(self, text: str):
        """
        Parses a string for custom Discord emojis (<:name:ID> or <a:name:ID>).
        Removes the emoji from the text and returns (clean_text, emoji_str).
        """
        if not isinstance(text, str):
            return text, None
            
        # Regex for custom Discord emojis (animated or static)
        emoji_pattern = r"(<a?:[a-zA-Z0-9_]+:[0-9]+>)"
        
        match = re.search(emoji_pattern, text)
        if match:
            emoji_str = match.group(1)
            # Remove emoji and strip extra spaces
            clean_text = text.replace(emoji_str, "").strip()
            return clean_text, emoji_str
        
        return text, None

    def save_config(self):
        """Persist config.json to disk."""
        save_config = self.config.copy()
        for key in ("token", "database_path", "refresh_interval_minutes", "presence_interval_seconds", "monitors", "admin_channel_id"):
            save_config.pop(key, None)
        with open("config.json", "w", encoding="utf-8") as f:
            json.dump(save_config, f, indent=4, ensure_ascii=False)
        log.info("config.json saved to disk.")
