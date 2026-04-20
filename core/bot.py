import asyncio
import logging
import discord
import json
import os
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
            settings_rows = await database._fetch("SELECT guild_id, language, admin_role_id, admin_channel_id, master_role_id, alert_templates, premium_until FROM guild_settings")
            
            for row in settings_rows:
                g_id = row[0]
                self.guild_settings_cache[g_id] = {
                    "language": row[1] or "en",
                    "admin_role_id": row[2] or 0,
                    "admin_channel_id": row[3] or 0,
                    "master_role_id": row[4] or 0,
                    "alert_templates": json.loads(row[5]) if row[5] else {},
                    "premium_until": row[6]
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
        log.info(f"------------------------")

    async def on_message(self, message):
        """Process commands and filter logs."""
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

            guild_id = message.guild.id if message.guild else 0
            master_guilds = self.config.get("master_guild_ids", [])
            
            # Restriction for Master Guilds: Check Admin Channel
            if guild_id in master_guilds:
                settings = self.guild_settings_cache.get(guild_id, {})
                admin_channel_id = settings.get("admin_channel_id", 0)
                if admin_channel_id != 0 and message.channel.id != admin_channel_id:
                    # Ignore command if not in admin channel
                    return
            
            # Universal Restriction: Master guilds can limit prefix commands to themselves
            if master_guilds and message.guild and message.guild.id not in master_guilds:
                return
        
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
        master_guild_ids = self.config.get("master_guild_ids", [])
        return guild_id in master_guild_ids

    def is_premium(self, guild_id):
        """Check if a guild has premium status (via JSON config or DB expiration)."""
        # 1. JSON Sources (Forever)
        if self.is_master(guild_id):
            return True
        if guild_id in self.config.get("premium_guild_ids", []):
            return True
            
        # 2. DB Source (Calculated from expiration date)
        settings = self.guild_settings_cache.get(guild_id, {})
        p_until = settings.get("premium_until")
        if p_until:
            return p_until > datetime.now()
            
        return False


    def is_master_admin(self, member):
        """Check if a member is a Master Admin (Owner OR specific Master Role)."""
        if not member or not hasattr(member, 'guild'):
            return False
            
        # 1. Global Owner
        if member.id in [self.owner_id] or (self.application and member.id == self.application.owner.id):
            return True

        # 2. Check for Master-only Role
        if self.is_master(member.guild.id):
            settings = self.guild_settings_cache.get(member.guild.id, {})
            master_role_id = settings.get("master_role_id", 0)
            if master_role_id != 0:
                role = member.get_role(master_role_id)
                if role in member.roles:
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
        
        # Identify system keys (admin/master commands)
        # These should always be English for technical consistency as requested.
        system_prefixes = ["master_", "sync_", "clear_commands_", "status_"]
        is_system = any(key.startswith(p) for p in system_prefixes)
        
        # Determine language
        master_guilds = self.config.get("master_guild_ids", [])
        
        # 1. Force Language Override
        if force_lang:
            lang_code = force_lang
        elif is_system:
            # System context defaults to English
            lang_code = "en"
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

    def save_config(self):
        """Persist config.json to disk."""
        save_config = self.config.copy()
        for key in ("token", "database_path", "refresh_interval_minutes", "presence_interval_seconds", "monitors", "admin_channel_id"):
            save_config.pop(key, None)
        with open("config.json", "w", encoding="utf-8") as f:
            json.dump(save_config, f, indent=4, ensure_ascii=False)
        log.info("config.json saved to disk.")
