import discord
import database
from ui.modals import (
    AddStatusModal, 
    StatusSettingsModal, 
    AddMonitorWizardStepTwoModal,
    EditMonitorModal,
    NewChannelModal,
    NewRoleModal,
    ManualInputModal
)
from ui.views.select_views import AlertTemplateSelectView

class StatusWizardView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=300)
        self.bot = bot
        self.selected_type = "watching"
        
    async def create_embed(self):
        statuses = await database.get_bot_statuses()
        interval = self.bot.config.get("presence_interval_seconds", 60)
        
        embed = discord.Embed(
            title=self.bot.get_feedback("ui_status_wizard_title"),
            description=self.bot.get_feedback("ui_status_wizard_desc"),
            color=discord.Color.purple()
        )
        
        if statuses:
            status_list = ""
            for s in statuses:
                status_list += f"`ID: {s['id']}` | **[{s['type'].upper()}]** {s['text']}\n"
            embed.add_field(name=self.bot.get_feedback("ui_status_wizard_active"), value=status_list, inline=False)
        else:
            embed.add_field(name=self.bot.get_feedback("ui_status_wizard_active"), value=self.bot.get_feedback("ui_status_wizard_empty"), inline=False)
            
        embed.add_field(name=self.bot.get_feedback("ui_status_wizard_settings"), value=self.bot.get_feedback("ui_status_wizard_interval", val=interval), inline=False)
        embed.set_footer(text=self.bot.get_feedback("ui_status_wizard_footer"))
        return embed

    def update_components(self, statuses):
        self.clear_items()
        type_select = discord.ui.Select(
            placeholder=self.bot.get_feedback("ui_status_ph_type"),
            options=[
                discord.SelectOption(label=self.bot.get_feedback("ui_status_type_watching"), value="watching", default=(self.selected_type == "watching")),
                discord.SelectOption(label=self.bot.get_feedback("ui_status_type_playing"), value="playing", default=(self.selected_type == "playing")),
                discord.SelectOption(label=self.bot.get_feedback("ui_status_type_listening"), value="listening", default=(self.selected_type == "listening")),
                discord.SelectOption(label=self.bot.get_feedback("ui_status_type_competing"), value="competing", default=(self.selected_type == "competing")),
            ],
            row=0
        )
        type_select.callback = self.type_callback
        self.add_item(type_select)
        
        add_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_add_status"), style=discord.ButtonStyle.primary, row=1)
        add_btn.callback = self.add_callback
        self.add_item(add_btn)
        
        set_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_set_interval"), style=discord.ButtonStyle.secondary, row=1)
        set_btn.callback = self.settings_callback
        self.add_item(set_btn)
        
        if statuses:
            del_options = []
            for s in statuses[:25]:
                label = f"[{s['type'].upper()}] {s['text']}"[:100]
                del_options.append(discord.SelectOption(label=label, value=str(s['id'])))
            
            del_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_status_ph_delete"), options=del_options, row=2)
            del_select.callback = self.delete_callback
            self.add_item(del_select)

    async def type_callback(self, interaction: discord.Interaction):
        self.selected_type = interaction.data['values'][0]
        statuses = await database.get_bot_statuses()
        self.update_components(statuses)
        await interaction.response.edit_message(view=self)

    async def add_callback(self, interaction: discord.Interaction):
        modal = AddStatusModal(self.bot, self.selected_type, self)
        await interaction.response.send_modal(modal)

    async def settings_callback(self, interaction: discord.Interaction):
        modal = StatusSettingsModal(self.bot, self)
        await interaction.response.send_modal(modal)

    async def delete_callback(self, interaction: discord.Interaction):
        status_id = int(interaction.data['values'][0])
        await database.remove_bot_status(status_id)
        self.bot.restart_status_task()
        statuses = await database.get_bot_statuses()
        self.update_components(statuses)
        embed = await self.create_embed()
        await interaction.response.edit_message(embed=embed, view=self)





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
        self.channel_display_name = "Nincs kiválasztva"
        self.role_display_name = "Nincs ping (vagy alapértelmezett)"

        self.update_components()

    def update_components(self):
        self.clear_items()
        
        # 1. Simplified Channel Select
        ch_options = [
            discord.SelectOption(label=f"Jelenlegi csatorna (#{self.trigger_interaction.channel.name})", value="current", emoji="📍"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_default_ch"), value="default", emoji="⚙️"),
            discord.SelectOption(label="Új csatorna létrehozása...", value="create", emoji="➕"),
            discord.SelectOption(label="Manuális ID vagy Név...", value="manual", emoji="🆔")
        ]
        self.channel_select = discord.ui.Select(placeholder="1. Válassz célcsatornát (Egyedi opciók)...", options=ch_options, row=0)
        self.channel_select.callback = self.channel_callback
        self.add_item(self.channel_select)

        # 2. Simplified Role Select
        role_options = [
            discord.SelectOption(label="Nincs ping", value="none", emoji="🔇"),
            discord.SelectOption(label="Szerver alapértelmezett rangja", value="default", emoji="⚙️"),
            discord.SelectOption(label="Új rang létrehozása...", value="create", emoji="➕"),
            discord.SelectOption(label="Manuális Rang ID vagy Név...", value="manual", emoji="🆔")
        ]
        self.role_select = discord.ui.Select(placeholder="2. Válassz ping rolt (Egyedi opciók)...", options=role_options, row=1)
        self.role_select.callback = self.role_callback
        self.add_item(self.role_select)

        # 3. Platform Select (Original options preserved)
        platform_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_youtube"), value="youtube"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_rss"), value="rss"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_epic_games"), value="epic_games"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_steam_free"), value="steam_free"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_gog_free"), value="gog_free"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_twitter"), value="twitter"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_stream"), value="stream"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_steam_news"), value="steam_news"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_movie"), value="movie"),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_tv_series"), value="tv_series"),
        ]
        self.type_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_platform"), options=platform_options, row=2)
        self.type_select.callback = self.type_callback
        self.add_item(self.type_select)

        # 4. Next Button
        self.next_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_monitor_next_settings"), style=discord.ButtonStyle.success, disabled=True, row=4)
        self.next_btn.callback = self.next_callback
        self.add_item(self.next_btn)

    async def create_status_embed(self):
        embed = discord.Embed(title="Monitor Hozzáadása - 1. Lépés", color=discord.Color.blue())
        embed.add_field(name="Célcsatorna", value=self.channel_display_name, inline=True)
        embed.add_field(name="Ping Rang", value=self.role_display_name, inline=True)
        platform_name = self.selected_type.upper() if self.selected_type else "Nincs kiválasztva"
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
            self.channel_display_name = f"#{interaction.channel.name} (Jelenlegi)"
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_channel_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_ch_not_set"), ephemeral=True)
                return
            self.selected_channel_id = 0 # 0 means use global default from settings
            self.channel_display_name = "Alapértelmezett (Beállítások szerint)"
            await self.check_readiness(interaction)
        elif val == "create":
            await interaction.response.send_modal(NewChannelModal(self.bot, self))
        elif val == "manual":
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="channel"))

    async def role_callback(self, interaction: discord.Interaction):
        val = self.role_select.values[0]
        if val == "none":
            self.selected_role_id = 0
            self.role_display_name = "Nincs ping"
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_ping_role_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_role_not_set"), ephemeral=True)
                return
            self.selected_role_id = 0 # 0 means we'll use fallback in next_callback
            self.role_display_name = "Alapértelmezett (Beállítások szerint)"
            await self.check_readiness(interaction)
        elif val == "create":
            await interaction.response.send_modal(NewRoleModal(self.bot, self))
        elif val == "manual":
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role"))

    async def type_callback(self, interaction: discord.Interaction):
        self.selected_type = self.type_select.values[0]
        await self.check_readiness(interaction)

    async def next_callback(self, interaction: discord.Interaction):
        settings = self.bot.guild_settings_cache.get(self.guild_id, {})
        ch_id = self.selected_channel_id or settings.get("default_channel_id")
        role_id = self.selected_role_id or settings.get("default_ping_role_id") or 0
        
        modal = AddMonitorWizardStepTwoModal(self.bot, self.selected_type, ch_id, role_id)
        await interaction.response.send_modal(modal)


class EditMonitorWizardView(discord.ui.View):
    def __init__(self, bot, monitor_id, original_name, current_color="", interaction=None):
        super().__init__(timeout=300)
        self.bot = bot
        self.monitor_id = monitor_id
        self.original_name = original_name
        self.current_color = current_color
        self.guild_id = interaction.guild_id if interaction else 0
        self.trigger_interaction = interaction
        
        self.selected_channel_id = None
        self.selected_role_id = 0
        
        self.channel_display_name = "Változatlan"
        self.role_display_name = "Változatlan"
        
        self.update_components()

    def update_components(self):
        self.clear_items()
        
        ch_options = [
            discord.SelectOption(label="Változatlan marad", value="keep", emoji="⏺️"),
            discord.SelectOption(label=f"Átállítás jelenlegire (#{self.trigger_interaction.channel.name if self.trigger_interaction else '?'})", value="current", emoji="📍"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_default_ch"), value="default", emoji="⚙️"),
            discord.SelectOption(label="Átállítás manuális ID/Névre...", value="manual", emoji="🆔")
        ]
        self.channel_select = discord.ui.Select(placeholder="Módosítsd a célcsatornát...", options=ch_options, row=0)
        self.channel_select.callback = self.channel_callback
        self.add_item(self.channel_select)

        role_options = [
            discord.SelectOption(label="Változatlan marad", value="keep", emoji="⏺️"),
            discord.SelectOption(label="Nincs ping", value="none", emoji="🔇"),
            discord.SelectOption(label="Szerver alapértelmezett rangja", value="default", emoji="⚙️"),
            discord.SelectOption(label="Új rang létrehozása...", value="create", emoji="➕"),
            discord.SelectOption(label="Manuális Rang ID vagy Név...", value="manual", emoji="🆔")
        ]
        self.role_select = discord.ui.Select(placeholder="Módosítsd a ping rolt...", options=role_options, row=1)
        self.role_select.callback = self.role_callback
        self.add_item(self.role_select)

        self.next_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_monitor_next_name"), style=discord.ButtonStyle.primary, disabled=False, row=2)
        self.next_btn.callback = self.next_btn_callback
        self.add_item(self.next_btn)

    async def create_edit_embed(self):
        embed = discord.Embed(title=f"Monitor Szerkesztése: {self.original_name}", color=discord.Color.orange())
        embed.add_field(name="Új Célcsatorna", value=self.channel_display_name, inline=True)
        embed.add_field(name="Új Ping Rang", value=self.role_display_name, inline=True)
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
            self.channel_display_name = "Változatlan"
            await self.check_readiness(interaction)
        elif val == "current":
            self.selected_channel_id = interaction.channel.id
            self.channel_display_name = f"#{interaction.channel.name} (Jelenlegi)"
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_channel_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_ch_not_set"), ephemeral=True)
                return
            self.selected_channel_id = 0
            self.channel_display_name = "Alapértelmezett (Beállítások szerint)"
            await self.check_readiness(interaction)
        elif val == "manual":
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="channel"))

    async def role_callback(self, interaction: discord.Interaction):
        val = self.role_select.values[0]
        if val == "keep":
            self.selected_role_id = None
            self.role_display_name = "Változatlan"
            await self.check_readiness(interaction)
        elif val == "none":
            self.selected_role_id = 0
            self.role_display_name = "Nincs ping"
            await self.check_readiness(interaction)
        elif val == "default":
            settings = self.bot.guild_settings_cache.get(self.guild_id, {})
            if not settings.get("default_ping_role_id"):
                await interaction.response.send_message(self.bot.get_feedback("error_default_role_not_set"), ephemeral=True)
                return
            self.selected_role_id = 0
            self.role_display_name = "Alapértelmezett (Beállítások szerint)"
            await self.check_readiness(interaction)
        elif val == "create":
            await interaction.response.send_modal(NewRoleModal(self.bot, self))
        elif val == "manual":
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role"))

    async def next_btn_callback(self, interaction: discord.Interaction):
        # If None, we pass 0 or original handled in EditMonitorModal
        modal = EditMonitorModal(self.bot, self.monitor_id, self.original_name, self.selected_channel_id, self.selected_role_id, current_color=self.current_color)
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
            discord.SelectOption(label=self.bot.get_feedback("ui_option_current_ch"), value="current", emoji="📍"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_ch"), value="create", emoji="➕"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_ch"), value="manual", emoji="🆔"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none"), value="none", emoji="❌")
        ]
        self.channel_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_default_ch"), options=ch_options, row=1)
        self.channel_select.callback = self.channel_callback
        self.add_item(self.channel_select)

        # 3. Default Ping Role
        role_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none"), value="none", emoji="🔇"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role"), value="create", emoji="➕"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role"), value="manual", emoji="🆔")
        ]
        self.role_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_default_role"), options=role_options, row=2)
        self.role_select.callback = self.role_callback
        self.add_item(self.role_select)

        # 4. Admin Role
        admin_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role"), value="create", emoji="➕"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role"), value="manual", emoji="🆔"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none"), value="none", emoji="❌")
        ]
        self.admin_role_select = discord.ui.Select(placeholder=self.bot.get_feedback("setup_admin_role_select", guild_id=self.guild_id), options=admin_options, row=3)
        self.admin_role_select.callback = self.admin_role_callback
        self.add_item(self.admin_role_select)

        # 5. Master/Templates/Save footer
        master_guilds = self.bot.config.get("master_guild_ids", [])
        if self.guild_id in master_guilds:
            master_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_master_settings"), style=discord.ButtonStyle.secondary, row=4)
            master_btn.callback = self.master_callback
            self.add_item(master_btn)

        template_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_templates"), style=discord.ButtonStyle.secondary, row=4)
        template_btn.callback = self.template_callback
        self.add_item(template_btn)

        save_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_save"), style=discord.ButtonStyle.success, row=4)
        save_btn.callback = self.save_callback
        self.add_item(save_btn)

    async def create_embed(self):
        embed = discord.Embed(title=self.bot.get_feedback("ui_setup_title"), color=discord.Color.blue())
        embed.add_field(name="Nyelv", value=self.new_lang.upper(), inline=True)
        embed.add_field(name="Alapértelmezett Csatorna", value=self.ch_display_name, inline=True)
        embed.add_field(name="Alapértelmezett Ping Rang", value=self.role_display_name, inline=True)
        embed.add_field(name="Admin Rang", value=self.admin_role_display_name, inline=True)
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
            self.ch_display_name = f"#{interaction.channel.name} (Jelenlegi)"
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

    async def master_callback(self, interaction: discord.Interaction):
        view = MasterSetupView(self.bot, self.guild_id, self.settings)
        await interaction.response.send_message("Master szintű beállítások:", view=view, ephemeral=True)

    async def template_callback(self, interaction: discord.Interaction):
        from ui.views.select_views import AlertTemplateSelectView
        view = AlertTemplateSelectView(self.bot, self.guild_id, self.settings)
        await interaction.response.send_message("Válaszd ki a platformot:", view=view, ephemeral=True)

    async def save_callback(self, interaction: discord.Interaction):
        # We only update the core settings here, master settings are updated in MasterSetupView
        await database.update_guild_settings(
            self.guild_id, self.new_lang, self.new_ch, self.new_role, 
            admin_role_id=self.new_admin_role
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

class MasterSetupView(discord.ui.View):
    def __init__(self, bot, guild_id, settings):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.settings = settings
        self.new_master_role = settings.get("master_role_id", 0)
        self.new_admin_ch = settings.get("admin_channel_id", 0)
        
        # Display Names for Embed
        self.master_role_display_name = bot.get_feedback("ui_option_none")
        if self.new_master_role:
            r = discord.utils.get(bot.guilds, id=self.guild_id).get_role(self.new_master_role) if bot.guilds else None
            self.master_role_display_name = f"@{r.name}" if r else f"ID: {self.new_master_role}"
            
        self.admin_ch_display_name = bot.get_feedback("ui_option_none")
        if self.new_admin_ch:
            ch = bot.get_channel(self.new_admin_ch)
            self.admin_ch_display_name = f"#{ch.name}" if ch else f"ID: {self.new_admin_ch}"

        self.update_components()

    def update_components(self):
        self.clear_items()
        
        # 1. Master Role
        master_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_role"), value="create", emoji="➕"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_role"), value="manual", emoji="🆔"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none"), value="none", emoji="❌")
        ]
        self.master_role_select = discord.ui.Select(placeholder=self.bot.get_feedback("setup_master_role_select", guild_id=self.guild_id), options=master_options, row=0)
        self.master_role_select.callback = self.master_role_callback
        self.add_item(self.master_role_select)

        # 2. Admin Channel
        ch_options = [
            discord.SelectOption(label=self.bot.get_feedback("ui_option_current_ch"), value="current", emoji="📍"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_create_ch"), value="create", emoji="➕"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_manual_ch"), value="manual", emoji="🆔"),
            discord.SelectOption(label=self.bot.get_feedback("ui_option_none"), value="none", emoji="❌")
        ]
        self.admin_ch_select = discord.ui.Select(placeholder=self.bot.get_feedback("setup_admin_channel_select", guild_id=self.guild_id), options=ch_options, row=1)
        self.admin_ch_select.callback = self.admin_ch_callback
        self.add_item(self.admin_ch_select)

        save_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_save"), style=discord.ButtonStyle.success, row=2)
        save_btn.callback = self.save_callback
        self.add_item(save_btn)

    async def create_embed(self):
        embed = discord.Embed(title=self.bot.get_feedback("ui_master_setup_title"), color=discord.Color.dark_red())
        embed.add_field(name="Master Admin Rang", value=self.master_role_display_name, inline=True)
        embed.add_field(name="Admin Log Csatorna", value=self.admin_ch_display_name, inline=True)
        return embed

    async def check_readiness(self, interaction: discord.Interaction):
        embed = await self.create_embed()
        if interaction.response.is_done():
            await interaction.edit_original_response(embed=embed, view=self)
        else:
            await interaction.response.edit_message(embed=embed, view=self)

    async def master_role_callback(self, interaction: discord.Interaction):
        val = self.master_role_select.values[0]
        if val == "none":
            self.new_master_role = 0
            self.master_role_display_name = self.bot.get_feedback("ui_option_none")
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewRoleModal
            await interaction.response.send_modal(NewRoleModal(self.bot, self, id_attr="new_master_role", display_attr="master_role_display_name"))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="role", id_attr="new_master_role", display_attr="master_role_display_name"))

    async def admin_ch_callback(self, interaction: discord.Interaction):
        val = self.admin_ch_select.values[0]
        if val == "current":
            self.new_admin_ch = interaction.channel.id
            self.admin_ch_display_name = f"#{interaction.channel.name} (Jelenlegi)"
            await self.check_readiness(interaction)
        elif val == "create":
            from ui.modals import NewChannelModal
            await interaction.response.send_modal(NewChannelModal(self.bot, self, id_attr="new_admin_ch", display_attr="admin_ch_display_name"))
        elif val == "manual":
            from ui.modals import ManualInputModal
            await interaction.response.send_modal(ManualInputModal(self.bot, self, mode="channel", id_attr="new_admin_ch", display_attr="admin_ch_display_name"))
        elif val == "none":
            self.new_admin_ch = 0
            self.admin_ch_display_name = self.bot.get_feedback("ui_option_none")
            await self.check_readiness(interaction)

    async def save_callback(self, interaction: discord.Interaction):
        await database.update_guild_settings(
            self.guild_id, 
            master_role_id=self.new_master_role,
            admin_channel_id=self.new_admin_ch
        )
        # Update cache
        current = self.bot.guild_settings_cache.get(self.guild_id, {})
        current.update({
            "master_role_id": self.new_master_role,
            "admin_channel_id": self.new_admin_ch
        })
        self.bot.guild_settings_cache[self.guild_id] = current
        await interaction.response.edit_message(content=self.bot.get_feedback("ui_modal_master_save_success"), view=None)
