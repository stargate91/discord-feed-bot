import discord
import database
from ui.modals import (
    AddMonitorWizardStepTwoModal,
    EditMonitorModal,
    NewChannelModal,
    NewRoleModal,
    ManualInputModal
)
from ui.views.select_views import AlertTemplateSelectLayout
from core.emojis import ICON_LOCATION, ICON_SETTINGS, ICON_ADD, ICON_ID, ICON_MUTE, ICON_DOT, ICON_CLOSE

class AddMonitorWizardLayout(discord.ui.LayoutView):
    def __init__(self, bot, interaction):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = interaction.guild_id or 0
        self.trigger_interaction = interaction
        
        self.selected_channel_id = None
        self.selected_role_id = 0
        self.selected_type = None
        
        # Display names for the embed/feedback
        self.channel_display_name = bot.get_feedback("ui_status_not_selected", guild_id=self.guild_id)
        self.role_display_name = bot.get_feedback("ui_status_no_ping", guild_id=self.guild_id)

        self.update_components()

    def update_components(self):
        self.clear_items()
        
        # 1. Simplified Channel Select
        ch_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_current_ch_name", name=self.trigger_interaction.channel.name, guild_id=self.guild_id), value="current", emoji=ICON_LOCATION),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_default_ch", guild_id=self.guild_id), value="default", emoji=ICON_SETTINGS),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_ch", guild_id=self.guild_id), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_ch", guild_id=self.guild_id), value="manual", emoji=ICON_ID)
        ]
        self.channel_select = discord.ui.Select(placeholder=self.bot.get_feedback("add_monitor_channel_select", guild_id=self.guild_id), options=ch_options)
        self.channel_select.callback = self.channel_callback

        # 2. Simplified Role Select
        role_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_status_no_ping", guild_id=self.guild_id), value="none", emoji=ICON_MUTE),
            discord.SelectOption(label=self.bot.get_feedback("ui_status_default_config", guild_id=self.guild_id), value="default", emoji=ICON_SETTINGS),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role", guild_id=self.guild_id), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role", guild_id=self.guild_id), value="manual", emoji=ICON_ID)
        ]
        self.role_select = discord.ui.Select(placeholder=self.bot.get_feedback("add_monitor_role_select", guild_id=self.guild_id), options=role_options)
        self.role_select.callback = self.role_callback

        # 3. Platform Select (Original options preserved)
        platform_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_youtube", guild_id=self.guild_id), value="youtube"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_rss", guild_id=self.guild_id), value="rss"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_epic_games", guild_id=self.guild_id), value="epic_games"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_steam_free", guild_id=self.guild_id), value="steam_free"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_gog_free", guild_id=self.guild_id), value="gog_free"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_stream", guild_id=self.guild_id), value="stream"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_steam_news", guild_id=self.guild_id), value="steam_news"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_movie", guild_id=self.guild_id), value="movie"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_tv_series", guild_id=self.guild_id), value="tv_series"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_crypto", guild_id=self.guild_id), value="crypto"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_github", guild_id=self.guild_id), value="github"),
        ]
        self.type_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_platform", guild_id=self.guild_id), options=platform_options)
        self.type_select.callback = self.type_callback

        # 5. Next Button
        self.next_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_monitor_next_settings", guild_id=self.guild_id), style=discord.ButtonStyle.success, disabled=True)
        self.next_btn.callback = self.next_callback

        title_text = self.bot.get_feedback("ui_monitor_add_step_1", guild_id=self.guild_id)
        platform_name = self.selected_type.upper() if self.selected_type else self.bot.get_feedback("ui_status_not_selected", guild_id=self.guild_id)
        
        settings_text = (
            f"### **{title_text}**\n"
            f"**{self.bot.get_feedback('ui_label_target_ch', guild_id=self.guild_id)}:** {self.channel_display_name}\n"
            f"**{self.bot.get_feedback('ui_label_ping_role', guild_id=self.guild_id)}:** {self.role_display_name}\n"
            f"**{self.bot.get_feedback('field_type', guild_id=self.guild_id)}:** {platform_name}"
        )
        
        container_items = [
            discord.ui.TextDisplay(settings_text),
            discord.ui.Separator(),
            discord.ui.ActionRow(self.channel_select),
            discord.ui.ActionRow(self.role_select),
            discord.ui.ActionRow(self.type_select),
            discord.ui.ActionRow(self.next_btn)
        ]
        
        self.add_item(discord.ui.Container(*container_items, accent_color=0x40C4FF))

    async def check_readiness(self, interaction: discord.Interaction):
        settings = self.bot.guild_settings_cache.get(self.guild_id, {})
        has_channel = self.selected_channel_id or settings.get("default_channel_id")
        self.next_btn.disabled = not (has_channel and self.selected_type)
        
        self.update_components()
        if interaction.response.is_done():
            await interaction.edit_original_response(view=self)
        else:
            await interaction.response.edit_message(view=self)

    async def channel_callback(self, interaction: discord.Interaction):
        val = self.channel_select.values[0]
        if val == "current":
            self.selected_channel_id = interaction.channel.id
            self.channel_display_name = f"#{interaction.channel.name} {self.bot.get_feedback('ui_suffix_current', guild_id=self.guild_id)}"
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_channel_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_ch_not_set", guild_id=self.guild_id), ephemeral=True)
                return
            self.selected_channel_id = 0 # 0 means use global default from settings
            self.channel_display_name = self.bot.get_feedback("ui_status_default_config", guild_id=self.guild_id)
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewChannelModal
            await interaction.response.send_modal(NewChannelModal(self.bot, self))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="channel"))

    async def role_callback(self, interaction: discord.Interaction):
        val = self.role_select.values[0]
        if val == "none":
            self.selected_role_id = 0
            self.role_display_name = self.bot.get_feedback("ui_status_no_ping", guild_id=self.guild_id)
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_ping_role_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_role_not_set", guild_id=self.guild_id), ephemeral=True)
                return
            self.selected_role_id = 0 # 0 means we'll use fallback in next_callback
            self.role_display_name = self.bot.get_feedback("ui_status_default_config", guild_id=self.guild_id)
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewRoleModal
            await interaction.response.send_modal(NewRoleModal(self.bot, self))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role"))

    async def type_callback(self, interaction: discord.Interaction):
        self.selected_type = self.type_select.values[0]
        self.update_components() # Refresh
        await self.check_readiness(interaction)

    async def next_callback(self, interaction: discord.Interaction):
        settings = self.bot.guild_settings_cache.get(self.guild_id, {})
        ch_id = self.selected_channel_id or settings.get("default_channel_id")
        role_id = self.selected_role_id or settings.get("default_ping_role_id") or 0
        
        from ui.modals import AddMonitorWizardStepTwoModal
        modal = AddMonitorWizardStepTwoModal(self.bot, self.selected_type, ch_id, role_id)
        await interaction.response.send_modal(modal)


class EditMonitorWizardLayout(discord.ui.LayoutView):
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
        
        self.channel_display_name = bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id)
        self.role_display_name = bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id)
        
        self.update_components()

    def update_components(self):
        self.clear_items()
        
        ch_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id), value="keep", emoji=ICON_DOT),
            discord.SelectOption(label=f"{self.bot.get_feedback('ui_option_current_ch', guild_id=self.guild_id)} (#{self.trigger_interaction.channel.name if self.trigger_interaction else '?'})", value="current", emoji=ICON_LOCATION),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_default_ch", guild_id=self.guild_id), value="default", emoji=ICON_SETTINGS),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_ch", guild_id=self.guild_id), value="manual", emoji=ICON_ID)
        ]
        self.channel_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_edit_ch_short", guild_id=self.guild_id), options=ch_options)
        self.channel_select.callback = self.channel_callback

        role_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id), value="keep", emoji=ICON_DOT),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none", guild_id=self.guild_id), value="none", emoji=ICON_MUTE),
            discord.SelectOption(label=self.bot.get_feedback("ui_status_default_config", guild_id=self.guild_id), value="default", emoji=ICON_SETTINGS),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role", guild_id=self.guild_id), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role", guild_id=self.guild_id), value="manual", emoji=ICON_ID)
        ]
        self.role_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_edit_role_short", guild_id=self.guild_id), options=role_options)
        self.role_select.callback = self.role_callback

        self.next_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_monitor_next_name", guild_id=self.guild_id), style=discord.ButtonStyle.primary, disabled=False)
        self.next_btn.callback = self.next_btn_callback
        
        title_text = self.bot.get_feedback("ui_monitor_edit_step_1", name=self.original_name, guild_id=self.guild_id)
        
        settings_text = (
            f"### **{title_text}**\n"
            f"**{self.bot.get_feedback('ui_label_new_target_ch', guild_id=self.guild_id)}:** {self.channel_display_name}\n"
            f"**{self.bot.get_feedback('ui_label_new_ping_role', guild_id=self.guild_id)}:** {self.role_display_name}"
        )
        
        container_items = [
            discord.ui.TextDisplay(settings_text),
            discord.ui.Separator(),
            discord.ui.ActionRow(self.channel_select),
            discord.ui.ActionRow(self.role_select),
            discord.ui.ActionRow(self.next_btn)
        ]
        
        self.add_item(discord.ui.Container(*container_items, accent_color=0x40C4FF))

    async def check_readiness(self, interaction: discord.Interaction):
        self.update_components()
        if interaction.response.is_done():
            await interaction.edit_original_response(view=self)
        else:
            await interaction.response.edit_message(view=self)

    async def channel_callback(self, interaction: discord.Interaction):
        val = self.channel_select.values[0]
        if val == "keep":
            self.selected_channel_id = None
            self.channel_display_name = self.bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id)
            await self.check_readiness(interaction)
        elif val == "current":
            self.selected_channel_id = interaction.channel.id
            self.channel_display_name = f"#{interaction.channel.name} {self.bot.get_feedback('ui_suffix_current', guild_id=self.guild_id)}"
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_channel_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_ch_not_set", guild_id=self.guild_id), ephemeral=True)
                return
            self.selected_channel_id = 0
            self.channel_display_name = self.bot.get_feedback("ui_status_default_config", guild_id=self.guild_id)
            await self.check_readiness(interaction)
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="channel"))

    async def role_callback(self, interaction: discord.Interaction):
        val = self.role_select.values[0]
        if val == "keep":
            self.selected_role_id = None
            self.role_display_name = self.bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id)
            await self.check_readiness(interaction)
        elif val == "none":
            self.selected_role_id = 0
            self.role_display_name = self.bot.get_feedback("ui_status_no_ping", guild_id=self.guild_id)
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_ping_role_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_role_not_set", guild_id=self.guild_id), ephemeral=True)
                return
            self.selected_role_id = 0
            self.role_display_name = self.bot.get_feedback("ui_status_default_config", guild_id=self.guild_id)
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewRoleModal
            await interaction.response.send_modal(NewRoleModal(self.bot, self))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role"))

    async def next_btn_callback(self, interaction: discord.Interaction):
        # If None, we pass 0 or original handled in EditMonitorModal
        from ui.modals import EditMonitorModal
        modal = EditMonitorModal(self.bot, self.monitor_id, self.original_name, self.selected_channel_id, self.selected_role_id, current_color=self.current_color, steam_patch_only=self.steam_patch_only if self.monitor_type == "steam_news" else None)
        await interaction.response.send_modal(modal)


class SetupWizardLayout(discord.ui.LayoutView):
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
        self.ch_display_name = bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang)
        if self.new_ch:
            ch = bot.get_channel(self.new_ch)
            self.ch_display_name = f"#{ch.name}" if ch else f"ID: {self.new_ch}"
            
        self.role_display_name = bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang)
        if self.new_role:
            r = discord.utils.get(bot.guilds, id=self.guild_id).get_role(self.new_role) if bot.guilds else None
            self.role_display_name = f"@{r.name}" if r else f"ID: {self.new_role}"
            
        self.admin_role_display_name = bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang)
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
        
        self.lang_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_lang", guild_id=self.guild_id, force_lang=self.new_lang), options=lang_options)
        self.lang_select.callback = self.lang_callback

        # 2. Default Channel
        ch_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_current_ch", guild_id=self.guild_id, force_lang=self.new_lang), value="current", emoji=ICON_LOCATION),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_ch", guild_id=self.guild_id, force_lang=self.new_lang), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_ch", guild_id=self.guild_id, force_lang=self.new_lang), value="manual", emoji=ICON_ID),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang), value="none", emoji=ICON_CLOSE)
        ]
        self.channel_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_default_ch", guild_id=self.guild_id, force_lang=self.new_lang), options=ch_options)
        self.channel_select.callback = self.channel_callback

        # 3. Default Ping Role
        role_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang), value="none", emoji=ICON_MUTE),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role", guild_id=self.guild_id, force_lang=self.new_lang), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role", guild_id=self.guild_id, force_lang=self.new_lang), value="manual", emoji=ICON_ID)
        ]
        self.role_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_default_role", guild_id=self.guild_id, force_lang=self.new_lang), options=role_options)
        self.role_select.callback = self.role_callback

        # 4. Admin Role
        admin_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role", guild_id=self.guild_id, force_lang=self.new_lang), value="create", emoji=ICON_ADD),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role", guild_id=self.guild_id, force_lang=self.new_lang), value="manual", emoji=ICON_ID),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang), value="none", emoji=ICON_CLOSE)
        ]
        self.admin_role_select = discord.ui.Select(placeholder=self.bot.get_feedback("setup_admin_role_select", guild_id=self.guild_id, force_lang=self.new_lang), options=admin_options)
        self.admin_role_select.callback = self.admin_role_callback

        # 5. Templates/Save footer
        template_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_templates", guild_id=self.guild_id, force_lang=self.new_lang), style=discord.ButtonStyle.secondary)
        template_btn.callback = self.template_callback

        save_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_save", guild_id=self.guild_id, force_lang=self.new_lang), style=discord.ButtonStyle.success)
        save_btn.callback = self.save_callback

        # Build Container layout items
        title_text = self.bot.get_feedback("ui_setup_title", guild_id=self.guild_id, force_lang=self.new_lang)
        if title_text == "ui_setup_title":
            title_text = "Bot Setup" # Fallback if missing
            
        settings_text = (
            f"### **{title_text}**\n"
            f"**{self.bot.get_feedback('ui_setup_lang_label', guild_id=self.guild_id, force_lang=self.new_lang)}:** {self.new_lang.upper()}\n"
            f"**{self.bot.get_feedback('ui_label_target_ch', guild_id=self.guild_id, force_lang=self.new_lang)}:** {self.ch_display_name}\n"
            f"**{self.bot.get_feedback('ui_label_ping_role', guild_id=self.guild_id, force_lang=self.new_lang)}:** {self.role_display_name}\n"
            f"**{self.bot.get_feedback('ui_setup_admin_role_label', guild_id=self.guild_id, force_lang=self.new_lang)}:** {self.admin_role_display_name}"
        )
        
        container_items = [
            discord.ui.TextDisplay(settings_text),
            discord.ui.Separator(),
            discord.ui.ActionRow(self.lang_select),
            discord.ui.ActionRow(self.channel_select),
            discord.ui.ActionRow(self.role_select),
            discord.ui.ActionRow(self.admin_role_select),
            discord.ui.ActionRow(template_btn, save_btn)
        ]
        
        self.add_item(discord.ui.Container(*container_items, accent_color=0x40C4FF))

    async def check_readiness(self, interaction: discord.Interaction):
        self.update_components()
        if interaction.response.is_done():
            await interaction.edit_original_response(view=self)
        else:
            await interaction.response.edit_message(view=self)

    async def lang_callback(self, interaction: discord.Interaction):
        self.new_lang = self.lang_select.values[0]
        await self.check_readiness(interaction)

    async def channel_callback(self, interaction: discord.Interaction):
        val = self.channel_select.values[0]
        if val == "current":
            self.new_ch = interaction.channel.id
            self.ch_display_name = f"#{interaction.channel.name} {self.bot.get_feedback('ui_suffix_current', guild_id=self.guild_id, force_lang=self.new_lang)}"
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewChannelModal
            await interaction.response.send_modal(NewChannelModal(self.bot, self, id_attr="new_ch", display_attr="ch_display_name"))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="channel", id_attr="new_ch", display_attr="ch_display_name"))
        elif val == "none":
            self.new_ch = None
            self.ch_display_name = self.bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang)
            await self.check_readiness(interaction)

    async def role_callback(self, interaction: discord.Interaction):
        val = self.role_select.values[0]
        if val == "none":
            self.new_role = None
            self.role_display_name = self.bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang)
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
            self.admin_role_display_name = self.bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang)
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewRoleModal
            await interaction.response.send_modal(NewRoleModal(self.bot, self, id_attr="new_admin_role", display_attr="admin_role_display_name"))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role", id_attr="new_admin_role", display_attr="admin_role_display_name"))



    async def template_callback(self, interaction: discord.Interaction):
        from ui.views.select_views import AlertTemplateSelectLayout
        view = AlertTemplateSelectLayout(self.bot, self.guild_id, self.settings, force_lang=self.new_lang)
        await interaction.response.send_message(view=view, ephemeral=True)

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
        success_view = discord.ui.LayoutView()
        success_view.add_item(discord.ui.TextDisplay(self.bot.get_feedback("setup_save_success", guild_id=self.guild_id)))
        await interaction.response.edit_message(view=success_view)


