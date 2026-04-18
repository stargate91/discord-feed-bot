import discord
import json
import re
from logger import log
import database
from core.emojis import STATUS_ERROR


class AddMonitorWizardStepTwoModal(discord.ui.Modal):
    def __init__(self, bot, monitor_type, discord_channel_id, ping_role_id):
        self.bot = bot
        self.monitor_type = monitor_type
        self.discord_channel_id = discord_channel_id
        self.ping_role_id = ping_role_id
        
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
            self.url_input = discord.ui.TextInput(
                label=bot.get_feedback("add_monitor_id_label"),
                placeholder=bot.get_feedback("ui_monitor_add_ph_url"),
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
                "discord_channel_id": self.discord_channel_id,
                "ping_role_id": self.ping_role_id,
                "enabled": True
            }

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

            if self.monitor_type == "epic_games":
                m_config["include_upcoming"] = True
            elif self.monitor_type == "steam_free":
                m_config["include_dlc"] = False

            color_val = self.color_input.value.strip() if self.color_input.value else ""
            if color_val: m_config["embed_color"] = color_val

            alert_val = self.alert_input.value.strip() if self.alert_input.value else ""
            if alert_val: m_config["custom_alert"] = alert_val
            
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
            await interaction.response.send_message(f"{STATUS_ERROR} Error: {e}", ephemeral=True)

class EditMonitorModal(discord.ui.Modal):
    def __init__(self, bot, monitor_id, original_name, discord_channel_id, ping_role_id, current_color="", steam_patch_only=None):
        self.bot = bot
        self.monitor_id = monitor_id
        self.discord_channel_id = discord_channel_id
        self.ping_role_id = ping_role_id
        self.steam_patch_only = steam_patch_only
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
            guild_id = interaction.guild_id or 0
            await database.update_monitor_details(self.monitor_id, guild_id, new_name, self.discord_channel_id, self.ping_role_id, embed_color=color_val, steam_patch_only=self.steam_patch_only)

            if self.bot.monitor_manager:
                from core.monitor_factory import create_monitor_instance
                db_monitors = await database.get_all_monitors()
                self.bot.monitor_manager.monitors = []
                for db_m in db_monitors:
                    monitor = create_monitor_instance(self.bot, db_m)
                    if monitor: self.bot.monitor_manager.add_monitor(monitor)

            await interaction.response.send_message(self.bot.get_feedback("ui_modal_edit_monitor_success", name=new_name, guild_id=interaction.guild_id), ephemeral=True)
        except Exception as e:
            log.error(f"Error editing monitor: {e}", exc_info=True)
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

class NewChannelModal(discord.ui.Modal):
    def __init__(self, bot, parent_view, id_attr="selected_channel_id", display_attr="channel_display_name"):
        super().__init__(title=bot.get_feedback("ui_modal_new_channel_title"))
        self.bot = bot
        self.parent_view = parent_view
        self.id_attr = id_attr
        self.display_attr = display_attr
        
        self.name_input = discord.ui.TextInput(
            label=self.bot.get_feedback("ui_modal_new_channel_label"),
            placeholder=self.bot.get_feedback("ui_modal_new_channel_ph"),
            required=True,
            max_length=100
        )
        self.add_item(self.name_input)

    async def on_submit(self, interaction: discord.Interaction):
        from core.utils import slugify
        raw_name = self.name_input.value
        clean_name = slugify(raw_name)
        
        try:
            # Create the channel in the same category as the current channel if possible
            overwrites = {
                interaction.guild.default_role: discord.PermissionOverwrite(read_messages=True, send_messages=False)
            }
            category = interaction.channel.category if hasattr(interaction.channel, 'category') else None
            
            new_channel = await interaction.guild.create_text_channel(
                name=clean_name,
                category=category,
                reason=f"Feed Bot monitor creation (Original: {raw_name})"
            )
            
            setattr(self.parent_view, self.id_attr, new_channel.id)
            setattr(self.parent_view, self.display_attr, f"#{new_channel.name} {self.bot.get_feedback('ui_suffix_created')}")
            
            await self.parent_view.check_readiness(interaction)
        except Exception as e:
            await interaction.response.send_message(self.bot.get_feedback("error_channel_create_fail", error=str(e)), ephemeral=True)

class ManualInputModal(discord.ui.Modal):
    def __init__(self, bot, parent_view, mode="channel", id_attr=None, display_attr=None):
        if mode == "channel":
            title = bot.get_feedback("ui_modal_manual_input_title_ch")
        else:
            title = bot.get_feedback("ui_modal_manual_input_title_role")
        super().__init__(title=title)
        self.bot = bot
        self.parent_view = parent_view
        self.mode = mode
        
        self.id_attr = id_attr or ("selected_channel_id" if mode == "channel" else "selected_role_id")
        self.display_attr = display_attr or ("channel_display_name" if mode == "channel" else "role_display_name")
        
        self.input_field = discord.ui.TextInput(
            label=self.bot.get_feedback("ui_modal_manual_input_label"),
            placeholder=self.bot.get_feedback("ui_modal_manual_input_ph"),
            required=True
        )
        self.add_item(self.input_field)

    async def on_submit(self, interaction: discord.Interaction):
        val = self.input_field.value.strip()
        guild = interaction.guild
        
        if self.mode == "channel":
            target = None
            if val.isdigit():
                target = guild.get_channel(int(val))
            else:
                target = discord.utils.get(guild.text_channels, name=val.lower())
            
            if target:
                setattr(self.parent_view, self.id_attr, target.id)
                setattr(self.parent_view, self.display_attr, f"#{target.name} {self.bot.get_feedback('ui_suffix_manual')}")
                await self.parent_view.check_readiness(interaction)
            else:
                await interaction.response.send_message(self.bot.get_feedback("error_channel_not_found"), ephemeral=True)
        
        else: # role mode
            target = None
            if val.isdigit():
                target = guild.get_role(int(val))
            else:
                target = discord.utils.get(guild.roles, name=val)
            
            if target:
                setattr(self.parent_view, self.id_attr, target.id)
                setattr(self.parent_view, self.display_attr, f"@{target.name} {self.bot.get_feedback('ui_suffix_manual')}")
                await self.parent_view.check_readiness(interaction)
            else:
                await interaction.response.send_message(self.bot.get_feedback("error_role_not_found"), ephemeral=True)

class NewRoleModal(discord.ui.Modal):
    def __init__(self, bot, parent_view, id_attr="selected_role_id", display_attr="role_display_name"):
        super().__init__(title=bot.get_feedback("ui_modal_new_role_title"))
        self.bot = bot
        self.parent_view = parent_view
        self.id_attr = id_attr
        self.display_attr = display_attr
        
        self.name_input = discord.ui.TextInput(
            label=self.bot.get_feedback("ui_modal_new_role_label"),
            placeholder=self.bot.get_feedback("ui_modal_new_role_ph"),
            required=True,
            max_length=100
        )
        self.add_item(self.name_input)

    async def on_submit(self, interaction: discord.Interaction):
        name = self.name_input.value
        try:
            # Create a standard role, mentionable usually wanted for ping feeds
            new_role = await interaction.guild.create_role(
                name=name,
                mentionable=True,
                reason=f"Feed Bot monitor role creation"
            )
            
            setattr(self.parent_view, self.id_attr, new_role.id)
            setattr(self.parent_view, self.display_attr, f"@{new_role.name} {self.bot.get_feedback('ui_suffix_created')}")
            
            await self.parent_view.check_readiness(interaction)
        except Exception as e:
            await interaction.response.send_message(self.bot.get_feedback("error_role_create_fail", error=str(e)), ephemeral=True)
