import discord
import database
from ui.modals import (
    AddMonitorWizardStepTwoModal,
    EditMonitorModal
)
from ui.views.select_views import AlertTemplateSelectLayout
from core.emojis import ICON_LOCATION, ICON_SETTINGS, ICON_ADD, ICON_ID, ICON_MUTE, ICON_DOT, ICON_CLOSE

class AddMonitorWizardLayout(discord.ui.LayoutView):
    def __init__(self, bot, interaction):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = interaction.guild_id or 0
        self.trigger_interaction = interaction
        
        self.selected_channels = []
        self.selected_roles = []
        self.selected_type = None
        self.selected_genres = []
        
        self.channel_display_name = bot.get_feedback("ui_status_not_selected", guild_id=self.guild_id)
        self.role_display_name = bot.get_feedback("ui_status_no_ping", guild_id=self.guild_id)

        self.update_components()

    def update_components(self):
        self.clear_items()
        
        # 1. Native Channel Select
        self.channel_select = discord.ui.ChannelSelect(
            placeholder=self.bot.get_feedback("add_monitor_channel_select", guild_id=self.guild_id),
            channel_types=[discord.ChannelType.text, discord.ChannelType.news],
            min_values=0, max_values=10
        )
        self.channel_select.callback = self.channel_callback

        # 2. Native Role Select
        self.role_select = discord.ui.RoleSelect(
            placeholder=self.bot.get_feedback("add_monitor_role_select", guild_id=self.guild_id),
            min_values=0, max_values=10
        )
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

        # 4. Next Button
        self.next_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_monitor_next_settings", guild_id=self.guild_id), style=discord.ButtonStyle.success, disabled=True)
        self.next_btn.callback = self.next_callback

        title_text = self.bot.get_feedback("ui_monitor_add_step_1", guild_id=self.guild_id)
        platform_name = self.selected_type.upper() if self.selected_type else self.bot.get_feedback("ui_status_not_selected", guild_id=self.guild_id)
        
        MOVIE_GENRES = {28:"Action", 12:"Adventure", 16:"Animation", 35:"Comedy", 80:"Crime", 99:"Documentary", 18:"Drama", 10751:"Family", 14:"Fantasy", 36:"History", 27:"Horror", 10402:"Music", 9648:"Mystery", 10749:"Romance", 878:"Sci-Fi", 10770:"TV Movie", 53:"Thriller", 10752:"War", 37:"Western", 9999:"Anime"}
        TV_GENRES = {10759:"Action & Adventure", 16:"Animation", 35:"Comedy", 80:"Crime", 99:"Documentary", 18:"Drama", 10751:"Family", 10762:"Kids", 9648:"Mystery", 10763:"News", 10764:"Reality", 10765:"Sci-Fi & Fantasy", 10766:"Soap", 10767:"Talk", 10768:"War & Politics", 37:"Western", 9999:"Anime"}

        genre_str = ""
        if self.selected_type in ["movie", "tv_series"]:
            genre_dict = MOVIE_GENRES if self.selected_type == "movie" else TV_GENRES
            if self.selected_genres:
                g_names = []
                for g in self.selected_genres:
                    loc_key = f"genre_{g}"
                    label = self.bot.get_feedback(loc_key, guild_id=self.guild_id)
                    if isinstance(label, str) and label.startswith("Missing key"):
                        label = genre_dict.get(int(g)) or str(g)
                    g_names.append(str(label))
                genre_str = f"\n**Szűrők:** {', '.join(g_names)}"
            else:
                genre_str = f"\n**Szűrők:** Mind (Nincs szűrés)"

        settings_text = (
            f"### **{title_text}**\n"
            f"*Tipp: Ha választás nélkül mész tovább, az adott csatorna lesz a cél, és senkit nem pingel!*\n\n"
            f"**{self.bot.get_feedback('ui_label_target_ch', guild_id=self.guild_id)}:** {self.channel_display_name}\n"
            f"**{self.bot.get_feedback('ui_label_ping_role', guild_id=self.guild_id)}:** {self.role_display_name}\n"
            f"**{self.bot.get_feedback('field_type', guild_id=self.guild_id)}:** {platform_name}{genre_str}"
        )


        container_items = [
            discord.ui.TextDisplay(settings_text),
            discord.ui.Separator(),
            discord.ui.ActionRow(self.channel_select),
            discord.ui.ActionRow(self.role_select),
            discord.ui.ActionRow(self.type_select)
        ]

        if self.selected_type in ["movie", "tv_series"]:
            options = []
            genre_dict = MOVIE_GENRES if self.selected_type == "movie" else TV_GENRES
            for gid, gname in genre_dict.items():
                loc_key = f"genre_{gid}"
                label = self.bot.get_feedback(loc_key, guild_id=self.guild_id)
                if isinstance(label, str) and label.startswith("Missing key"):
                    label = gname
                options.append(discord.SelectOption(label=label, value=str(gid)))
            
            self.genre_select = discord.ui.Select(
                placeholder=self.bot.get_feedback("ui_ph_genres", guild_id=self.guild_id),
                options=options,
                min_values=0,
                max_values=len(options)
            )
            self.genre_select.callback = self.genre_callback
            
            # Restore previously selected genres if any exist and are still valid
            valid_values = [str(g) for g in genre_dict.keys()]
            self.selected_genres = [g for g in self.selected_genres if g in valid_values]
            if self.selected_genres:
                for option in self.genre_select.options:
                    if option.value in self.selected_genres:
                        option.default = True
            
            container_items.append(discord.ui.ActionRow(self.genre_select))

        container_items.append(discord.ui.ActionRow(self.next_btn))
        
        self.add_item(discord.ui.Container(*container_items, accent_color=0x40C4FF))

    async def genre_callback(self, interaction: discord.Interaction):
        self.selected_genres = self.genre_select.values
        await interaction.response.edit_message(view=self)

    async def check_readiness(self, interaction: discord.Interaction):
        if self.selected_type not in ["movie", "tv_series"]:
            self.selected_genres = []

        self.update_components()
        self.next_btn.disabled = not self.selected_type

        if interaction.response.is_done():
            await interaction.edit_original_response(view=self)
        else:
            await interaction.response.edit_message(view=self)

    async def channel_callback(self, interaction: discord.Interaction):
        self.selected_channels = [ch.id for ch in self.channel_select.values]
        if self.selected_channels:
            ch_names = ", ".join([f"#{ch.name}" for ch in self.channel_select.values])
            self.channel_display_name = ch_names
        else:
            self.channel_display_name = self.bot.get_feedback("ui_status_not_selected", guild_id=self.guild_id)
        
        await self.check_readiness(interaction)

    async def role_callback(self, interaction: discord.Interaction):
        self.selected_roles = [r.id for r in self.role_select.values]
        if self.selected_roles:
            r_names = ", ".join([f"@{r.name}" for r in self.role_select.values])
            self.role_display_name = r_names
        else:
            self.role_display_name = self.bot.get_feedback("ui_status_no_ping", guild_id=self.guild_id)
        
        await self.check_readiness(interaction)

    async def type_callback(self, interaction: discord.Interaction):
        self.selected_type = self.type_select.values[0]
        await self.check_readiness(interaction)

    async def next_callback(self, interaction: discord.Interaction):
        ch_ids = self.selected_channels if self.selected_channels else [self.trigger_interaction.channel.id]
        role_ids = self.selected_roles if self.selected_roles else []
        
        from ui.modals import AddMonitorWizardStepTwoModal
        modal = AddMonitorWizardStepTwoModal(self.bot, self.selected_type, ch_ids, role_ids, target_genres=self.selected_genres)
        await interaction.response.send_modal(modal)


class EditMonitorWizardLayout(discord.ui.LayoutView):
    def __init__(self, bot, monitor_id, original_name, monitor_type, current_color="", current_genres=None, steam_patch_only=None, interaction=None):
        super().__init__(timeout=300)
        self.bot = bot
        self.monitor_id = monitor_id
        self.original_name = original_name
        self.monitor_type = monitor_type
        self.current_color = current_color
        self.current_genres = current_genres or []
        self.steam_patch_only = steam_patch_only
        self.guild_id = interaction.guild_id if interaction else 0
        self.trigger_interaction = interaction
        
        self.selected_channels = []
        self.selected_roles = []
        self.selected_genres = [str(g) for g in self.current_genres] if self.current_genres else []
        
        self.channel_display_name = bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id)
        self.role_display_name = bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id)
        
        self.update_components()

    def update_components(self):
        self.clear_items()
        
        self.channel_select = discord.ui.ChannelSelect(
            placeholder=self.bot.get_feedback("ui_ph_edit_ch_short", guild_id=self.guild_id),
            channel_types=[discord.ChannelType.text, discord.ChannelType.news],
            min_values=0, max_values=10
        )
        self.channel_select.callback = self.channel_callback

        self.role_select = discord.ui.RoleSelect(
            placeholder=self.bot.get_feedback("ui_ph_edit_role_short", guild_id=self.guild_id),
            min_values=0, max_values=10
        )
        self.role_select.callback = self.role_callback

        self.clear_ch_btn = discord.ui.Button(label="Csatornák Törlése 🗑️", style=discord.ButtonStyle.danger)
        self.clear_ch_btn.callback = self.clear_ch_callback

        self.clear_role_btn = discord.ui.Button(label="Ping Törlése 🗑️", style=discord.ButtonStyle.danger)
        self.clear_role_btn.callback = self.clear_role_callback

        self.next_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_monitor_next_name", guild_id=self.guild_id), style=discord.ButtonStyle.primary, disabled=False)
        self.next_btn.callback = self.next_btn_callback
        
        title_text = self.bot.get_feedback("ui_monitor_edit_step_1", name=self.original_name, guild_id=self.guild_id)
        
        genre_str = ""
        if self.monitor_type in ["movie", "tv_series"]:
            MOVIE_GENRES = {28:"Action", 12:"Adventure", 16:"Animation", 35:"Comedy", 80:"Crime", 99:"Documentary", 18:"Drama", 10751:"Family", 14:"Fantasy", 36:"History", 27:"Horror", 10402:"Music", 9648:"Mystery", 10749:"Romance", 878:"Sci-Fi", 10770:"TV Movie", 53:"Thriller", 10752:"War", 37:"Western", 9999:"Anime"}
            TV_GENRES = {10759:"Action & Adventure", 16:"Animation", 35:"Comedy", 80:"Crime", 99:"Documentary", 18:"Drama", 10751:"Family", 10762:"Kids", 9648:"Mystery", 10763:"News", 10764:"Reality", 10765:"Sci-Fi & Fantasy", 10766:"Soap", 10767:"Talk", 10768:"War & Politics", 37:"Western", 9999:"Anime"}
            genre_dict = MOVIE_GENRES if self.monitor_type == "movie" else TV_GENRES
            
            if self.selected_genres:
                g_names = []
                for g in self.selected_genres:
                    loc_key = f"genre_{g}"
                    label = self.bot.get_feedback(loc_key, guild_id=self.guild_id)
                    if isinstance(label, str) and label.startswith("Missing key"):
                        label = genre_dict.get(int(g)) or str(g)
                    g_names.append(str(label))
                genre_str = f"\n**Szűrők:** {', '.join(g_names)}"
            else:
                genre_str = f"\n**Szűrők:** Mind (Nincs szűrés)"

        settings_text = (
            f"### **{title_text}**\n"
            f"*Tipp: Ha üresen hagysz egy menüt és úgy mész tovább, a bot megtartja a korábbi beállítást!*\n"
            f"*Ha törölni akarsz minden eddigi beállítást (nullázni), használd a Piros gombokat!*\n\n"
            f"**{self.bot.get_feedback('ui_label_new_target_ch', guild_id=self.guild_id)}:** {self.channel_display_name}\n"
            f"**{self.bot.get_feedback('ui_label_new_ping_role', guild_id=self.guild_id)}:** {self.role_display_name}{genre_str}"
        )
        
        container_items = [
            discord.ui.TextDisplay(settings_text),
            discord.ui.Separator(),
            discord.ui.ActionRow(self.channel_select),
            discord.ui.ActionRow(self.role_select)
        ]
        
        if self.monitor_type in ["movie", "tv_series"]:
            options = []
            genre_dict = MOVIE_GENRES if self.monitor_type == "movie" else TV_GENRES
            for gid, gname in genre_dict.items():
                loc_key = f"genre_{gid}"
                label = self.bot.get_feedback(loc_key, guild_id=self.guild_id)
                if isinstance(label, str) and label.startswith("Missing key"):
                    label = gname
                options.append(discord.SelectOption(label=label, value=str(gid)))
            
            self.genre_select = discord.ui.Select(
                placeholder=self.bot.get_feedback("ui_ph_genres", guild_id=self.guild_id),
                options=options,
                min_values=0,
                max_values=len(options)
            )
            self.genre_select.callback = self.genre_callback
            
            # Pre-select matching genres
            valid_values = [str(g) for g in genre_dict.keys()]
            if self.selected_genres:
                self.selected_genres = [g for g in self.selected_genres if g in valid_values]
                for option in self.genre_select.options:
                    if option.value in self.selected_genres:
                        option.default = True
            
            container_items.append(discord.ui.ActionRow(self.genre_select))
            
        container_items.append(discord.ui.ActionRow(self.clear_ch_btn, self.clear_role_btn, self.next_btn))
        
        self.add_item(discord.ui.Container(*container_items, accent_color=0x40C4FF))

    async def genre_callback(self, interaction: discord.Interaction):
        self.selected_genres = self.genre_select.values
        await interaction.response.edit_message(view=self)

    async def check_readiness(self, interaction: discord.Interaction):
        self.update_components()
        if interaction.response.is_done():
            await interaction.edit_original_response(view=self)
        else:
            await interaction.response.edit_message(view=self)

    async def channel_callback(self, interaction: discord.Interaction):
        self.selected_channels = [ch.id for ch in self.channel_select.values]
        if self.selected_channels:
            ch_names = ", ".join([f"#{ch.name}" for ch in self.channel_select.values])
            self.channel_display_name = ch_names
        else:
            self.channel_display_name = self.bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id)
        
        await self.check_readiness(interaction)

    async def role_callback(self, interaction: discord.Interaction):
        self.selected_roles = [r.id for r in self.role_select.values]
        if self.selected_roles:
            r_names = ", ".join([f"@{r.name}" for r in self.role_select.values])
            self.role_display_name = r_names
        else:
            self.role_display_name = self.bot.get_feedback("ui_status_unchanged", guild_id=self.guild_id)
            
        await self.check_readiness(interaction)

    async def clear_ch_callback(self, interaction: discord.Interaction):
        self.selected_channels = [-1]
        self.channel_display_name = "Törlésre jelölve! 🗑️"
        await self.check_readiness(interaction)

    async def clear_role_callback(self, interaction: discord.Interaction):
        self.selected_roles = [-1]
        self.role_display_name = "Törlésre jelölve! 🗑️"
        await self.check_readiness(interaction)

    async def next_btn_callback(self, interaction: discord.Interaction):
        from ui.modals import EditMonitorModal
        # [] means keep existing
        modal = EditMonitorModal(self.bot, self.monitor_id, self.original_name, self.selected_channels, self.selected_roles, current_color=self.current_color, steam_patch_only=self.steam_patch_only if self.monitor_type == "steam_news" else None, target_genres=self.selected_genres if self.monitor_type in ["movie", "tv_series"] else None)
        await interaction.response.send_modal(modal)


class SetupWizardLayout(discord.ui.LayoutView):
    def __init__(self, bot, guild_id):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.settings = bot.guild_settings_cache.get(guild_id, {"language": "hu", "admin_role_id": 0, "alert_templates": {}})
        
        # Internal State
        self.new_lang = self.settings.get("language", "hu")
        self.new_admin_role = self.settings.get("admin_role_id", 0)
        
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

        # 2. Admin Role (Native)
        self.admin_role_select = discord.ui.RoleSelect(
            placeholder=self.bot.get_feedback("setup_admin_role_select", guild_id=self.guild_id, force_lang=self.new_lang),
            min_values=0, max_values=1
        )
        self.admin_role_select.callback = self.admin_role_callback

        # 3. Interval/Templates/Save options
        interval_btn = discord.ui.Button(label=self.bot.get_feedback("ui_setup_interval_btn", guild_id=self.guild_id, force_lang=self.new_lang), style=discord.ButtonStyle.primary)
        interval_btn.callback = self.interval_callback

        template_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_templates", guild_id=self.guild_id, force_lang=self.new_lang), style=discord.ButtonStyle.secondary)
        template_btn.callback = self.template_callback

        save_btn = discord.ui.Button(label=self.bot.get_feedback("ui_btn_save", guild_id=self.guild_id, force_lang=self.new_lang), style=discord.ButtonStyle.success)
        save_btn.callback = self.save_callback

        # Build Container layout items
        title_text = self.bot.get_feedback("ui_setup_title", guild_id=self.guild_id, force_lang=self.new_lang)
        if title_text == "ui_setup_title":
            title_text = "Bot Setup" # Fallback if missing
            
        current_interval = self.bot.get_guild_refresh_interval(self.guild_id)
        interval_label = self.bot.get_feedback('ui_setup_interval_label', guild_id=self.guild_id, force_lang=self.new_lang)
        
        settings_text = (
            f"### **{title_text}**\n"
            f"**{self.bot.get_feedback('ui_setup_lang_label', guild_id=self.guild_id, force_lang=self.new_lang)}:** {self.new_lang.upper()}\n"
            f"**{self.bot.get_feedback('ui_setup_admin_role_label', guild_id=self.guild_id, force_lang=self.new_lang)}:** {self.admin_role_display_name}\n"
            f"**{interval_label}:** {current_interval}"
        )
        
        container_items = [
            discord.ui.TextDisplay(settings_text),
            discord.ui.Separator(),
            discord.ui.ActionRow(self.lang_select),
            discord.ui.ActionRow(self.admin_role_select),
            discord.ui.ActionRow(interval_btn, template_btn, save_btn)
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

    async def admin_role_callback(self, interaction: discord.Interaction):
        if self.admin_role_select.values:
            r = self.admin_role_select.values[0]
            self.new_admin_role = r.id
            self.admin_role_display_name = f"@{r.name}"
        else:
            self.new_admin_role = 0
            self.admin_role_display_name = self.bot.get_feedback("ui_option_none", guild_id=self.guild_id, force_lang=self.new_lang)
            
        await self.check_readiness(interaction)

    async def template_callback(self, interaction: discord.Interaction):
        from ui.views.select_views import AlertTemplateSelectLayout
        view = AlertTemplateSelectLayout(self.bot, self.guild_id, self.settings, force_lang=self.new_lang)
        await interaction.response.send_message(view=view, ephemeral=True)

    async def interval_callback(self, interaction: discord.Interaction):
        from ui.modals import RefreshIntervalModal
        modal = RefreshIntervalModal(self.bot, self.guild_id)
        await interaction.response.send_modal(modal)

    async def save_callback(self, interaction: discord.Interaction):
        await database.update_guild_settings(
            self.guild_id, 
            language=self.new_lang,
            admin_role_id=self.new_admin_role,
            bot=self.bot
        )
        current = self.bot.guild_settings_cache.get(self.guild_id, {})
        current.update({
            "language": self.new_lang, 
            "admin_role_id": self.new_admin_role
        })
        self.bot.guild_settings_cache[self.guild_id] = current
        success_view = discord.ui.LayoutView()
        success_view.add_item(discord.ui.TextDisplay(self.bot.get_feedback("setup_save_success", guild_id=self.guild_id)))
        await interaction.response.edit_message(view=success_view)
