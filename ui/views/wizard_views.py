import discord
import database
from ui.modals import (
    AddStatusModal, 
    StatusSettingsModal, 
    AddMonitorWizardStepTwoModal,
    EditMonitorModal
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
        self.selected_channel_id = None
        self.selected_role_id = 0
        self.selected_type = None

        settings = self.bot.guild_settings_cache.get(self.guild_id, {})
        has_default_ch = settings.get("default_channel_id")

        ph_channel = bot.get_feedback("add_monitor_channel_select", guild_id=self.guild_id)
        if ph_channel == "add_monitor_channel_select": 
            ph_channel = "1. Válassz célcsatornát..." if not has_default_ch else "1. Célcsatorna (Vagy hagyd üresen az alaphoz)"
            
        self.channel_select = discord.ui.ChannelSelect(
            placeholder=ph_channel, channel_types=[discord.ChannelType.text, discord.ChannelType.news],
            min_values=0, max_values=1
        )
        self.channel_select.callback = self.channel_callback
        self.add_item(self.channel_select)

        ph_role = bot.get_feedback("add_monitor_role_select", guild_id=self.guild_id)
        if ph_role == "add_monitor_role_select": ph_role = "2. Válassz ping rolt (opcionális)..."
        self.role_select = discord.ui.RoleSelect(placeholder=ph_role, min_values=0, max_values=1)
        self.role_select.callback = self.role_callback
        self.add_item(self.role_select)

        options = [
            discord.SelectOption(label=bot.get_feedback("ui_platform_youtube"), value="youtube"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_rss"), value="rss"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_tiktok"), value="tiktok"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_instagram"), value="instagram"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_epic_games"), value="epic_games"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_steam_free"), value="steam_free"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_gog_free"), value="gog_free"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_reddit"), value="reddit"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_twitter"), value="twitter"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_stream"), value="stream"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_steam_news"), value="steam_news"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_movie"), value="movie"),
            discord.SelectOption(label=bot.get_feedback("ui_platform_tv_series"), value="tv_series"),
        ]
        self.type_select = discord.ui.Select(placeholder=bot.get_feedback("ui_ph_platform"), options=options, min_values=1, max_values=1)
        self.type_select.callback = self.type_callback
        self.add_item(self.type_select)

        self.next_btn = discord.ui.Button(label=bot.get_feedback("ui_btn_monitor_next_settings"), style=discord.ButtonStyle.success, disabled=True, row=4)
        self.next_btn.callback = self.next_callback
        self.add_item(self.next_btn)

    async def check_readiness(self, interaction: discord.Interaction):
        settings = self.bot.guild_settings_cache.get(self.guild_id, {})
        has_channel = self.selected_channel_id or settings.get("default_channel_id")
        self.next_btn.disabled = not (has_channel and self.selected_type)
        await interaction.response.edit_message(view=self)

    async def channel_callback(self, interaction: discord.Interaction):
        self.selected_channel_id = self.channel_select.values[0].id if self.channel_select.values else None
        await self.check_readiness(interaction)

    async def role_callback(self, interaction: discord.Interaction):
        self.selected_role_id = self.role_select.values[0].id if self.role_select.values else 0
        await self.check_readiness(interaction)

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
    def __init__(self, bot, monitor_id, original_name, current_color=""):
        super().__init__(timeout=300)
        self.bot = bot
        self.monitor_id = monitor_id
        self.original_name = original_name
        self.current_color = current_color
        self.selected_channel_id = None
        self.selected_role_id = 0

        self.channel_select = discord.ui.ChannelSelect(
            placeholder=bot.get_feedback("ui_ph_edit_ch"), channel_types=[discord.ChannelType.text, discord.ChannelType.news],
            min_values=1, max_values=1
        )
        self.channel_select.callback = self.channel_callback
        self.add_item(self.channel_select)

        self.role_select = discord.ui.RoleSelect(placeholder=bot.get_feedback("ui_ph_edit_role"), min_values=0, max_values=1)
        self.role_select.callback = self.role_callback
        self.add_item(self.role_select)

        self.next_btn = discord.ui.Button(label=bot.get_feedback("ui_btn_monitor_next_name"), style=discord.ButtonStyle.primary, disabled=True, row=2)
        self.next_btn.callback = self.next_btn_callback
        self.add_item(self.next_btn)

    async def channel_callback(self, interaction: discord.Interaction):
        self.selected_channel_id = self.channel_select.values[0].id
        self.next_btn.disabled = False
        await interaction.response.edit_message(view=self)

    async def role_callback(self, interaction: discord.Interaction):
        self.selected_role_id = self.role_select.values[0].id if self.role_select.values else 0
        await interaction.response.edit_message(view=self)

    async def next_btn_callback(self, interaction: discord.Interaction):
        modal = EditMonitorModal(self.bot, self.monitor_id, self.original_name, self.selected_channel_id, self.selected_role_id, current_color=self.current_color)
        await interaction.response.send_modal(modal)


class SetupWizardView(discord.ui.View):
    def __init__(self, bot, guild_id):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.settings = bot.guild_settings_cache.get(guild_id, {"language": "hu", "default_channel_id": None, "default_ping_role_id": None, "alert_templates": {}})
        self.new_lang = self.settings.get("language", "hu")
        self.new_ch = self.settings.get("default_channel_id")
        self.new_role = self.settings.get("default_ping_role_id")
        self.new_admin_role = self.settings.get("admin_role_id")
        self.new_admin_ch = self.settings.get("admin_channel_id")

        lang_options = []
        for code, data in bot.locales.items():
            lang_options.append(discord.SelectOption(label=data.get("language_name", code.upper()), value=code, default=(code == self.new_lang)))
        
        self.lang_select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_ph_lang"), options=lang_options, row=0)
        self.lang_select.callback = self.lang_callback
        self.add_item(self.lang_select)

        self.channel_select = discord.ui.ChannelSelect(placeholder=self.bot.get_feedback("ui_ph_default_ch"), channel_types=[discord.ChannelType.text, discord.ChannelType.news], row=1)
        self.channel_select.callback = self.channel_callback
        self.add_item(self.channel_select)

        self.role_select = discord.ui.RoleSelect(placeholder=self.bot.get_feedback("ui_ph_default_role"), row=2)
        self.role_select.callback = self.role_callback
        self.add_item(self.role_select)

        self.admin_role_select = discord.ui.RoleSelect(placeholder=self.bot.get_feedback("setup_admin_role_select", guild_id=self.guild_id), row=3)
        self.admin_role_select.callback = self.admin_role_callback
        self.add_item(self.admin_role_select)

        master_guilds = self.bot.config.get("master_guild_ids", [])
        if guild_id in master_guilds:
            master_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_master_settings"), style=discord.ButtonStyle.secondary, row=4)
            master_btn.callback = self.master_callback
            self.add_item(master_btn)

        template_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_templates"), style=discord.ButtonStyle.secondary, row=4)
        template_btn.callback = self.template_callback
        self.add_item(template_btn)

        save_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_save"), style=discord.ButtonStyle.success, row=4)
        save_btn.callback = self.save_callback
        self.add_item(save_btn)

    async def lang_callback(self, interaction: discord.Interaction):
        self.new_lang = self.lang_select.values[0]
        await interaction.response.defer()

    async def channel_callback(self, interaction: discord.Interaction):
        self.new_ch = self.channel_select.values[0].id if self.channel_select.values else None
        await interaction.response.defer()

    async def role_callback(self, interaction: discord.Interaction):
        self.new_role = self.role_select.values[0].id if self.role_select.values else None
        await interaction.response.defer()

    async def admin_role_callback(self, interaction: discord.Interaction):
        self.new_admin_role = self.admin_role_select.values[0].id if self.admin_role_select.values else 0
        await interaction.response.defer()

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

        self.master_role_select = discord.ui.RoleSelect(placeholder=bot.get_feedback("setup_master_role_select", guild_id=guild_id), row=0)
        self.master_role_select.callback = self.master_role_callback
        self.add_item(self.master_role_select)

        self.admin_ch_select = discord.ui.ChannelSelect(placeholder=bot.get_feedback("setup_admin_channel_select", guild_id=guild_id), channel_types=[discord.ChannelType.text], row=1)
        self.admin_ch_select.callback = self.admin_ch_callback
        self.add_item(self.admin_ch_select)

        save_btn = discord.ui.Button(label=bot.get_feedback("ui_btn_save"), style=discord.ButtonStyle.success, row=2)
        save_btn.callback = self.save_callback
        self.add_item(save_btn)

    async def master_role_callback(self, interaction: discord.Interaction):
        self.new_master_role = self.master_role_select.values[0].id if self.master_role_select.values else 0
        await interaction.response.defer()

    async def admin_ch_callback(self, interaction: discord.Interaction):
        self.new_admin_ch = self.admin_ch_select.values[0].id if self.admin_ch_select.values else 0
        await interaction.response.defer()

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
