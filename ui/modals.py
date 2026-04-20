import discord
import json
import re
from logger import log
import database
from core.emojis import STATUS_ERROR


class AddMonitorWizardStepTwoModal(discord.ui.Modal):
    def __init__(self, bot, monitor_type, target_channels, target_roles, target_genres=None):
        self.bot = bot
        self.monitor_type = monitor_type
        self.target_channels = target_channels
        self.target_roles = target_roles
        self.target_genres = target_genres or []
        
        super().__init__(title=bot.get_feedback("add_monitor_title"))

        self.name_input = discord.ui.TextInput(
            label=bot.get_feedback("add_monitor_name_label"),
            placeholder=bot.get_feedback("ui_monitor_add_ph_name"),
            required=True
        )
        self.add_item(self.name_input)

        types_without_url = ["epic_games", "steam_free", "gog_free", "movie", "tv_series"]
        self.needs_url = self.monitor_type not in types_without_url

        if self.needs_url:
            label = bot.get_feedback("add_monitor_id_label")
            placeholder = bot.get_feedback("ui_monitor_add_ph_url")
            
            if self.monitor_type == "crypto":
                label = bot.get_feedback("ui_monitor_crypto_input_label")
                placeholder = bot.get_feedback("ui_monitor_crypto_input_ph")

            self.url_input = discord.ui.TextInput(
                label=label,
                placeholder=placeholder,
                required=True
            )
            self.add_item(self.url_input)

        self.alert_input = discord.ui.TextInput(
            label=bot.get_feedback("ui_monitor_add_label_alert"),
            placeholder=bot.get_feedback("ui_monitor_add_ph_alert"),
            style=discord.TextStyle.paragraph,
            required=False,
            max_length=500
        )
        self.add_item(self.alert_input)

        self.color_input = discord.ui.TextInput(
            label=bot.get_feedback("ui_monitor_add_label_color"),
            placeholder=bot.get_feedback("ui_monitor_add_ph_color"),
            required=False,
            max_length=7
        )
        self.add_item(self.color_input)

    async def on_submit(self, interaction: discord.Interaction):
        try:
            m_config = {
                "type": self.monitor_type,
                "name": self.name_input.value,
                "target_channels": self.target_channels,
                "target_roles": self.target_roles,
                "enabled": True
            }
            if self.target_genres:
                m_config["target_genres"] = self.target_genres

            if self.needs_url:
                val = self.url_input.value
                if self.monitor_type == "youtube":
                    m_config["channel_id"] = val
                elif self.monitor_type == "rss":
                    m_config["rss_url"] = val
                elif self.monitor_type == "stream":
                    m_config["stream_platform"] = "twitch"
                    m_config["stream_username"] = val
                    m_config["cooldown_seconds"] = 7200
                elif self.monitor_type == "steam_news":
                    match = re.search(r"app/(\d+)", val)
                    m_config["appid"] = match.group(1) if match else val
                elif self.monitor_type == "crypto":
                    m_config["source_id"] = val
                elif self.monitor_type == "github":
                    # Parse owner/repo from URL or plain string
                    val = val.strip()
                    if "github.com/" in val:
                        # Extract from URL: https://github.com/owner/repo/something
                        match = re.search(r"github\.com/([^/]+)/([^/]+)", val)
                        if match:
                            val = f"{match.group(1)}/{match.group(2)}"
                    m_config["repo_path"] = val

            if self.monitor_type == "epic_games":
                m_config["include_upcoming"] = True
            elif self.monitor_type == "steam_free":
                m_config["include_dlc"] = False

            guild_id = interaction.guild_id or 0
            
            color_val = self.color_input.value.strip() if self.color_input.value else ""
            if color_val:
                if self.bot.has_feature(guild_id, "custom_color"):
                    m_config["embed_color"] = color_val
                else:
                    log.warning(f"Prevented custom color for non-premium guild {guild_id}")

            alert_val = self.alert_input.value.strip() if self.alert_input.value else ""
            if alert_val:
                if self.bot.has_feature(guild_id, "alert_template"):
                    m_config["custom_alert"] = alert_val
                else:
                    log.warning(f"Prevented custom alert for non-premium guild {guild_id}")
            
            guild_id = interaction.guild_id or 0
            await database.add_monitor(m_config, guild_id=guild_id)

            if self.bot.monitor_manager:
                from core.monitor_factory import create_monitor_instance
                db_monitors = await database.get_all_monitors()
                self.bot.monitor_manager.monitors = []
                for db_m in db_monitors:
                    monitor = create_monitor_instance(self.bot, db_m)
                    if monitor: self.bot.monitor_manager.add_monitor(monitor)
            
            success_msg = self.bot.get_feedback("add_monitor_success", name=self.name_input.value, type=self.monitor_type)
            await interaction.response.send_message(success_msg, ephemeral=True)

        except Exception as e:
            log.error(f"Error adding monitor via modal: {e}", exc_info=True)
            await interaction.response.send_message(self.bot.get_feedback("error_prefix_msg", error=str(e)), ephemeral=True)

class EditMonitorModal(discord.ui.Modal):
    def __init__(self, bot, monitor_id, original_name, target_channels, target_roles, current_color="", steam_patch_only=None, target_genres=None):
        self.bot = bot
        self.monitor_id = monitor_id
        self.target_channels = target_channels
        self.target_roles = target_roles
        self.steam_patch_only = steam_patch_only
        self.target_genres = target_genres
        super().__init__(title=bot.get_feedback("ui_monitor_edit_title", name=original_name))

        self.name_input = discord.ui.TextInput(label=bot.get_feedback("add_monitor_name_label"), default=original_name, required=True)
        self.add_item(self.name_input)
        self.color_input = discord.ui.TextInput(label=bot.get_feedback("ui_label_embed_color_hex"), default=current_color or "", required=False, max_length=7)
        self.add_item(self.color_input)

    async def on_submit(self, interaction: discord.Interaction):
        try:
            guild_id = interaction.guild_id or 0
            new_name = self.name_input.value
            color_val = self.color_input.value.strip() if self.color_input.value else ""
            
            # Enforce Color Limit
            if color_val and not self.bot.has_feature(guild_id, "custom_color"):
                color_val = "" # Reset if non-premium tries to hack it
                log.warning(f"Blocked manual hex inject for guild {guild_id}")

            log.info(f"[EDIT DEBUG] Step 1: monitor_id={self.monitor_id}, guild_id={guild_id}, new_name={new_name}, new_chs={self.target_channels}, new_roles={self.target_roles}, color={color_val}, steam_patch={self.steam_patch_only}")
            
            await database.update_monitor_details(self.monitor_id, guild_id, new_name, self.target_channels, self.target_roles, embed_color=color_val, steam_patch_only=self.steam_patch_only, target_genres=self.target_genres)
            
            log.info(f"[EDIT DEBUG] Step 2: Database update completed successfully.")

            if self.bot.monitor_manager:
                from core.monitor_factory import create_monitor_instance
                
                old_count = len(self.bot.monitor_manager.monitors)
                self.bot.monitor_manager.monitors = [m for m in self.bot.monitor_manager.monitors if m.id != self.monitor_id]
                new_count = len(self.bot.monitor_manager.monitors)
                log.info(f"[EDIT DEBUG] Step 3: Removed old instance. Monitors: {old_count} -> {new_count}")
                
                db_monitors = await database.get_all_monitors()
                curr_db_data = next((m for m in db_monitors if m["id"] == self.monitor_id), None)
                log.info(f"[EDIT DEBUG] Step 4: DB lookup result: {curr_db_data}")
                
                if curr_db_data:
                    new_monitor = create_monitor_instance(self.bot, curr_db_data)
                    if new_monitor:
                        self.bot.monitor_manager.add_monitor(new_monitor)
                        log.info(f"[EDIT DEBUG] Step 5: New instance created. id={new_monitor.id}, ch={new_monitor.target_channels}, name={new_monitor.name}")
                    else:
                        log.error(f"[EDIT DEBUG] Step 5 FAILED: create_monitor_instance returned None!")
                else:
                    log.error(f"[EDIT DEBUG] Step 4 FAILED: Monitor {self.monitor_id} not found in database after update!")

            await interaction.response.send_message(self.bot.get_feedback("ui_modal_edit_monitor_success", name=new_name, guild_id=interaction.guild_id), ephemeral=True)
        except Exception as e:
            log.error(f"[EDIT DEBUG] EXCEPTION: {e}", exc_info=True)
            await interaction.response.send_message(self.bot.get_feedback("ui_modal_edit_monitor_error", error=str(e), guild_id=interaction.guild_id), ephemeral=True)

class AlertTemplateModal(discord.ui.Modal):
    def __init__(self, bot, platform, current_val=""):
        super().__init__(title=bot.get_feedback("ui_modal_alert_template_title", platform=platform.capitalize()))
        self.bot = bot
        self.platform = platform
        self.template_input = discord.ui.TextInput(
            label=self.bot.get_feedback("ui_modal_alert_template_label"),
            placeholder=self.bot.get_feedback("ui_modal_alert_template_ph"),
            default=current_val,
            style=discord.TextStyle.paragraph,
            required=False,
            max_length=500
        )
        self.add_item(self.template_input)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer()


class RefreshIntervalModal(discord.ui.Modal):
    def __init__(self, bot, guild_id):
        self.bot = bot
        self.guild_id = guild_id
        
        # Get limits
        self.min_m, self.max_m, self.def_m, _, _, _ = bot.get_guild_tier_limits(guild_id)
        
        super().__init__(title=bot.get_feedback("modal_interval_title", guild_id=guild_id))
        
        self.interval_input = discord.ui.TextInput(
            label=bot.get_feedback("modal_interval_label", guild_id=guild_id),
            placeholder=bot.get_feedback("modal_interval_ph", guild_id=guild_id),
            required=True,
            default=str(self.def_m),
            max_length=4
        )
        self.add_item(self.interval_input)

    async def on_submit(self, interaction: discord.Interaction):
        try:
            val = int(self.interval_input.value.strip())
        except ValueError:
            return await interaction.response.send_message(
                self.bot.get_feedback("modal_interval_error", min=self.min_m, max=self.max_m, guild_id=self.guild_id),
                ephemeral=True
            )
            
        if not (self.min_m <= val <= self.max_m):
            return await interaction.response.send_message(
                self.bot.get_feedback("modal_interval_error", min=self.min_m, max=self.max_m, guild_id=self.guild_id),
                ephemeral=True
            )
            
        # Update dynamically in DB
        try:
            await database.update_guild_settings(self.guild_id, refresh_interval=val, bot=self.bot)
            await interaction.response.send_message(
                self.bot.get_feedback("ui_setup_interval_success", val=val, guild_id=self.guild_id),
                ephemeral=True
            )
        except Exception as e:
            log.error(f"Error updating refresh interval: {e}")
            await interaction.response.send_message(f"Exception: {e}", ephemeral=True)

