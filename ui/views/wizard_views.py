import discord
import database
from ui.modals import (
    AddMonitorWizardStepTwoModal,
    EditMonitorModal,
    NewChannelModal,
    NewRoleModal,
    ManualInputModal
)
from ui.views.select_views import AlertTemplateSelectView
from core.emojis import ICON_LOCATION, ICON_SETTINGS, ICON_ADD, ICON_ID, ICON_MUTE, ICON_DOT, ICON_CLOSE

class AddMonitorWizardView(discord.ui.View):
    def __init__(self, bot, interaction):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = interaction.guild_id or 0
        self.trigger_interaction = interaction
        
        self.selected_channel_id = None
        self.selected_role_id = 0
        self.selected_type = None
        
        # Display names for the embed/feedback
        self.channel_display_name = bot.get_feedback("ui_status_not_selected")
        self.role_display_name = bot.get_feedback("ui_status_no_ping")

        self.update_components()

    def update_components(self):
        self.clear_items()
        
        # 1. Simplified Channel Select
        ch_options = [
            discord.SelectOption(label=f"Jelenlegi csatorna (#{self.trigger_interaction.channel.name})", value="current", emoji=ICON_LOCATION),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_default_ch"), value="default", emoji=ICON_SETTINGS),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_ch"), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_ch"), value="manual", emoji=ICON_ID)
        ]
        self.channel_select = discord.ui.Select(placeholder=self.bot.get_feedback("add_monitor_channel_select"), options=ch_options, row=0)
        self.channel_select.callback = self.channel_callback
        self.add_item(self.channel_select)

        # 2. Simplified Role Select
        role_options = [
            discord.SelectOption(label="Nincs ping", value="none", emoji=ICON_MUTE),
            discord.SelectOption(label=self.bot.get_feedback("ui_status_default_config"), value="default", emoji=ICON_SETTINGS),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role"), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role"), value="manual", emoji=ICON_ID)
        ]
        self.role_select = discord.ui.Select(placeholder=self.bot.get_feedback("add_monitor_role_select"), options=role_options, row=1)
        self.role_select.callback = self.role_callback
        self.add_item(self.role_select)

        # 3. Platform Select (Original options preserved)
        platform_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_youtube"), value="youtube"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_rss"), value="rss"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_epic_games"), value="epic_games"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_steam_free"), value="steam_free"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_gog_free"), value="gog_free"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_stream"), value="stream"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_steam_news"), value="steam_news"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_movie"), value="movie"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_tv_series"), value="tv_series"),
        ]
        self.type_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_platform"), options=platform_options, row=2)
        self.type_select.callback = self.type_callback
        self.add_item(self.type_select)

        # 5. Next Button
        self.next_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_monitor_next_settings"), style=discord.ButtonStyle.success, disabled=True, row=4)
        self.next_btn.callback = self.next_callback
        self.add_item(self.next_btn)

    async def create_status_embed(self):
        embed = discord.Embed(title=self.bot.get_feedback("ui_monitor_add_step_1"), color=discord.Color.blue())
        embed.add_field(name=self.bot.get_feedback("ui_label_target_ch"), value=self.channel_display_name, inline=True)
        embed.add_field(name=self.bot.get_feedback("ui_label_ping_role"), value=self.role_display_name, inline=True)
        platform_name = self.selected_type.upper() if self.selected_type else self.bot.get_feedback("ui_status_not_selected")
        embed.add_field(name="Platform", value=platform_name, inline=True)
        return embed

    async def check_readiness(self, interaction: discord.Interaction):
        settings = self.bot.guild_settings_cache.get(self.guild_id, {})
        has_channel = self.selected_channel_id or settings.get("default_channel_id")
        self.next_btn.disabled = not (has_channel and self.selected_type)
        
        embed = await self.create_status_embed()
        if interaction.response.is_done():
            await interaction.edit_original_response(embed=embed, view=self)
        else:
            await interaction.response.edit_message(embed=embed, view=self)

    async def channel_callback(self, interaction: discord.Interaction):
        val = self.channel_select.values[0]
        if val == "current":
            self.selected_channel_id = interaction.channel.id
            self.channel_display_name = f"#{interaction.channel.name} {self.bot.get_feedback('ui_suffix_current')}"
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_channel_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_ch_not_set"), ephemeral=True)
                return
            self.selected_channel_id = 0 # 0 means use global default from settings
            self.channel_display_name = self.bot.get_feedback("ui_status_default_config")
            await self.check_readiness(interaction)
        elif val == "create":
            await interaction.response.send_modal(NewChannelModal(self.bot, self))
        elif val == "manual":
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="channel"))

    async def role_callback(self, interaction: discord.Interaction):
        val = self.role_select.values[0]
        if val == "none":
            self.selected_role_id = 0
            self.role_display_name = self.bot.get_feedback("ui_status_no_ping")
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_ping_role_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_role_not_set"), ephemeral=True)
                return
            self.selected_role_id = 0 # 0 means we'll use fallback in next_callback
            self.role_display_name = self.bot.get_feedback("ui_status_default_config")
            await self.check_readiness(interaction)
        elif val == "create":
            await interaction.response.send_modal(NewRoleModal(self.bot, self))
        elif val == "manual":
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role"))

    async def type_callback(self, interaction: discord.Interaction):
        self.selected_type = self.type_select.values[0]
        self.update_components() # Refresh to show/hide steam select
        await self.check_readiness(interaction)

    async def next_callback(self, interaction: discord.Interaction):
        settings = self.bot.guild_settings_cache.get(self.guild_id, {})
        ch_id = self.selected_channel_id or settings.get("default_channel_id")
        role_id = self.selected_role_id or settings.get("default_ping_role_id") or 0
        
        modal = AddMonitorWizardStepTwoModal(self.bot, self.selected_type, ch_id, role_id)
        await interaction.response.send_modal(modal)


class EditMonitorWizardView(discord.ui.View):
    def __init__(self, bot, monitor_id, original_name, monitor_type, current_color="", interaction=None):
        super().__init__(timeout=300)
        self.bot = bot
        self.monitor_id = monitor_id
        self.original_name = original_name
        self.monitor_type = monitor_type
        self.current_color = current_color
        self.guild_id = interaction.guild_id if interaction else 0
        self.trigger_interaction = interaction
        
        self.selected_channel_id = None
        self.selected_role_id = 0
        
        self.channel_display_name = bot.get_feedback("ui_status_unchanged")
        self.role_display_name = bot.get_feedback("ui_status_unchanged")
        
        self.update_components()

    def update_components(self):
        self.clear_items()
        
        ch_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_status_unchanged"), value="keep", emoji=ICON_DOT),
            discord.SelectOption(label=f"{self.bot.get_feedback('ui_option_current_ch')} (#{self.trigger_interaction.channel.name if self.trigger_interaction else '?'})", value="current", emoji=ICON_LOCATION),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_default_ch"), value="default", emoji=ICON_SETTINGS),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_ch"), value="manual", emoji=ICON_ID)
        ]
        self.channel_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_edit_ch_short"), options=ch_options, row=0)
        self.channel_select.callback = self.channel_callback
        self.add_item(self.channel_select)

        role_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_status_unchanged"), value="keep", emoji=ICON_DOT),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none"), value="none", emoji=ICON_MUTE),
            discord.SelectOption(label=self.bot.get_feedback("ui_status_default_config"), value="default", emoji=ICON_SETTINGS),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role"), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role"), value="manual", emoji=ICON_ID)
        ]
        self.role_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_edit_role_short"), options=role_options, row=1)
        self.role_select.callback = self.role_callback
        self.add_item(self.role_select)

        self.next_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_monitor_next_name"), style=discord.ButtonStyle.primary, disabled=False, row=3)
        self.next_btn.callback = self.next_btn_callback
        self.add_item(self.next_btn)

    async def create_edit_embed(self):
        embed = discord.Embed(title=self.bot.get_feedback("ui_monitor_edit_step_1", name=self.original_name), color=discord.Color.orange())
        embed.add_field(name=self.bot.get_feedback("ui_label_new_target_ch"), value=self.channel_display_name, inline=True)
        embed.add_field(name=self.bot.get_feedback("ui_label_new_ping_role"), value=self.role_display_name, inline=True)
        return embed

    async def check_readiness(self, interaction: discord.Interaction):
        embed = await self.create_edit_embed()
        if interaction.response.is_done():
            await interaction.edit_original_response(embed=embed, view=self)
        else:
            await interaction.response.edit_message(embed=embed, view=self)

    async def channel_callback(self, interaction: discord.Interaction):
        val = self.channel_select.values[0]
        if val == "keep":
            self.selected_channel_id = None
            self.channel_display_name = self.bot.get_feedback("ui_status_unchanged")
            await self.check_readiness(interaction)
        elif val == "current":
            self.selected_channel_id = interaction.channel.id
            self.channel_display_name = f"#{interaction.channel.name} {self.bot.get_feedback('ui_suffix_current')}"
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_channel_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_ch_not_set"), ephemeral=True)
                return
            self.selected_channel_id = 0
            self.channel_display_name = self.bot.get_feedback("ui_status_default_config")
            await self.check_readiness(interaction)
        elif val == "manual":
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="channel"))

    async def role_callback(self, interaction: discord.Interaction):
        val = self.role_select.values[0]
        if val == "keep":
            self.selected_role_id = None
            self.role_display_name = self.bot.get_feedback("ui_status_unchanged")
            await self.check_readiness(interaction)
        elif val == "none":
            self.selected_role_id = 0
            self.role_display_name = self.bot.get_feedback("ui_status_no_ping")
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_ping_role_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_role_not_set"), ephemeral=True)
                return
            self.selected_role_id = 0
            self.role_display_name = self.bot.get_feedback("ui_status_default_config")
            await self.check_readiness(interaction)
        elif val == "create":
            await interaction.response.send_modal(NewRoleModal(self.bot, self))
        elif val == "manual":
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role"))

    async def next_btn_callback(self, interaction: discord.Interaction):
        # If None, we pass 0 or original handled in EditMonitorModal
        modal = EditMonitorModal(self.bot, self.monitor_id, self.original_name, self.selected_channel_id, self.selected_role_id, current_color=self.current_color, steam_patch_only=self.steam_patch_only if self.monitor_type == "steam_news" else None)
        await interaction.response.send_modal(modal)


class SetupWizardView(discord.ui.View):
    def __init__(self, bot, guild_id):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.settings = bot.guild_settings_cache.get(guild_id, {"language": "hu", "default_channel_id": None, "default_ping_role_id": None, "alert_templates": {}})
        
        # Internal State
        self.new_lang = self.settings.get("language", "hu")
        self.new_ch = self.settings.get("default_channel_id")
        self.new_role = self.settings.get("default_ping_role_id")
        self.new_admin_role = self.settings.get("admin_role_id")
        
        # Display Names for Embed
        self.ch_display_name = bot.get_feedback("ui_option_none")
        if self.new_ch:
            ch = bot.get_channel(self.new_ch)
            self.ch_display_name = f"#{ch.name}" if ch else f"ID: {self.new_ch}"
            
        self.role_display_name = bot.get_feedback("ui_option_none")
        if self.new_role:
            r = discord.utils.get(bot.guilds, id=self.guild_id).get_role(self.new_role) if bot.guilds else None
            self.role_display_name = f"@{r.name}" if r else f"ID: {self.new_role}"
            
        self.admin_role_display_name = bot.get_feedback("ui_option_none")
        if self.new_admin_role:
            r = discord.utils.get(bot.guilds, id=self.guild_id).get_role(self.new_admin_role) if bot.guilds else None
            self.admin_role_display_name = f"@{r.name}" if r else f"ID: {self.new_admin_role}"

        self.update_components()

    def update_components(self):
        self.clear_items()
        
        # 1. Language
        lang_options = []
        for code, data in self.bot.locales.items():
            lang_options.append(discord.SelectOption(label=data.get("language_name", code.upper()), value=code, default=(code == self.new_lang)))
        
        self.lang_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_lang"), options=lang_options, row=0)
        self.lang_select.callback = self.lang_callback
        self.add_item(self.lang_select)

        # 2. Default Channel
        ch_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_current_ch"), value="current", emoji=ICON_LOCATION),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_ch"), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_ch"), value="manual", emoji=ICON_ID),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none"), value="none", emoji=ICON_CLOSE)
        ]
        self.channel_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_default_ch"), options=ch_options, row=1)
        self.channel_select.callback = self.channel_callback
        self.add_item(self.channel_select)

        # 3. Default Ping Role
        role_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none"), value="none", emoji=ICON_MUTE),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role"), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role"), value="manual", emoji=ICON_ID)
        ]
        self.role_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_default_role"), options=role_options, row=2)
        self.role_select.callback = self.role_callback
        self.add_item(self.role_select)

        # 4. Admin Role
        admin_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role"), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role"), value="manual", emoji=ICON_ID),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none"), value="none", emoji=ICON_CLOSE)
        ]
        self.admin_role_select = discord.ui.Select(placeholder=self.bot.get_feedback("setup_admin_role_select", guild_id=self.guild_id), options=admin_options, row=3)
        self.admin_role_select.callback = self.admin_role_callback
        self.add_item(self.admin_role_select)

        # 5. Templates/Save footer

        template_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_templates"), style=discord.ButtonStyle.secondary, row=4)
        template_btn.callback = self.template_callback
        self.add_item(template_btn)

        save_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_save"), style=discord.ButtonStyle.success, row=4)
        save_btn.callback = self.save_callback
        self.add_item(save_btn)

    async def create_embed(self):
        embed = discord.Embed(title=self.bot.get_feedback("ui_setup_title"), color=discord.Color.blue())
        embed.add_field(name="Nyelv", value=self.new_lang.upper(), inline=True)
        embed.add_field(name=self.bot.get_feedback("ui_label_target_ch"), value=self.ch_display_name, inline=True)
        embed.add_field(name=self.bot.get_feedback("ui_label_ping_role"), value=self.role_display_name, inline=True)
        embed.add_field(name=self.bot.get_feedback("setup_admin_role_select").split(".")[1].strip(), value=self.admin_role_display_name, inline=True)
        return embed

    async def check_readiness(self, interaction: discord.Interaction):
        embed = await self.create_embed()
        if interaction.response.is_done():
            await interaction.edit_original_response(embed=embed, view=self)
        else:
            await interaction.response.edit_message(embed=embed, view=self)

    async def lang_callback(self, interaction: discord.Interaction):
        self.new_lang = self.lang_select.values[0]
        await self.check_readiness(interaction)

    async def channel_callback(self, interaction: discord.Interaction):
        val = self.channel_select.values[0]
        if val == "current":
            self.new_ch = interaction.channel.id
            self.ch_display_name = f"#{interaction.channel.name} {self.bot.get_feedback('ui_suffix_current')}"
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewChannelModal
            await interaction.response.send_modal(NewChannelModal(self.bot, self, id_attr="new_ch", display_attr="ch_display_name"))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="channel", id_attr="new_ch", display_attr="ch_display_name"))
        elif val == "none":
            self.new_ch = None
            self.ch_display_name = self.bot.get_feedback("ui_option_none")
            await self.check_readiness(interaction)

    async def role_callback(self, interaction: discord.Interaction):
        val = self.role_select.values[0]
        if val == "none":
            self.new_role = None
            self.role_display_name = self.bot.get_feedback("ui_option_none")
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewRoleModal
            await interaction.response.send_modal(NewRoleModal(self.bot, self, id_attr="new_role", display_attr="role_display_name"))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role", id_attr="new_role", display_attr="role_display_name"))

    async def admin_role_callback(self, interaction: discord.Interaction):
        val = self.admin_role_select.values[0]
        if val == "none":
            self.new_admin_role = 0
            self.admin_role_display_name = self.bot.get_feedback("ui_option_none")
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewRoleModal
            await interaction.response.send_modal(NewRoleModal(self.bot, self, id_attr="new_admin_role", display_attr="admin_role_display_name"))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role", id_attr="new_admin_role", display_attr="admin_role_display_name"))



    async def template_callback(self, interaction: discord.Interaction):
        from ui.views.select_views import AlertTemplateSelectView
        view = AlertTemplateSelectView(self.bot, self.guild_id, self.settings)
        await interaction.response.send_message(self.bot.get_feedback("ui_setup_platform_select_msg", guild_id=self.guild_id), view=view, ephemeral=True)

    async def save_callback(self, interaction: discord.Interaction):
        # We only update the core settings here, master settings are updated in MasterSetupView
        await database.update_guild_settings(
            self.guild_id, 
            language=self.new_lang,
            default_channel_id=self.new_ch,
            default_ping_role_id=self.new_role,
            admin_role_id=self.new_admin_role,
            bot=self.bot
        )
        # Update cache
        current = self.bot.guild_settings_cache.get(self.guild_id, {})
        current.update({
            "language": self.new_lang, 
            "default_channel_id": self.new_ch, 
            "default_ping_role_id": self.new_role,
            "admin_role_id": self.new_admin_role
        })
        self.bot.guild_settings_cache[self.guild_id] = current
        await interaction.response.edit_message(content=self.bot.get_feedback("setup_save_success", guild_id=self.guild_id), view=None)


