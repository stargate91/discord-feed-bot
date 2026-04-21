import discord
from ui.modals import AlertTemplateModal
from core.emojis import (
    TYPE_YOUTUBE, TYPE_RSS,
    TYPE_EPIC, TYPE_STEAM, TYPE_GOG,
    TYPE_STREAM, TYPE_TMDB_MOVIE, TYPE_TMDB_TV,
    TYPE_CRYPTO, TYPE_GITHUB, NAV_BACK, NAV_NEXT
)

class AlertTemplateDashboardLayout(discord.ui.LayoutView):
    def __init__(self, bot, guild_id, settings, force_lang=None):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.settings = settings
        self.force_lang = force_lang
        self.current_templates = settings.get("alert_templates", {})
        self.page = 0
        self.page_size = 6
        
        self.platforms = [
            ("YouTube", "youtube", TYPE_YOUTUBE),
            ("monitor_platform_rss", "rss", TYPE_RSS),
            ("ui_platform_steam_game", "steam_news", TYPE_STEAM),
            ("monitor_platform_stream", "stream", TYPE_STREAM),
            ("monitor_platform_epic", "epic_games", TYPE_EPIC),
            ("monitor_platform_steam_free", "steam_free", TYPE_STEAM),
            ("monitor_platform_gog_free", "gog_free", TYPE_GOG),
            ("monitor_platform_movie", "movie", TYPE_TMDB_MOVIE),
            ("monitor_platform_tv", "tv_series", TYPE_TMDB_TV),
            ("ui_platform_crypto", "crypto", TYPE_CRYPTO),
            ("ui_platform_github", "github", TYPE_GITHUB),
        ]
        
        self.update_view()

    def update_view(self):
        self.clear_items()
        
        # 1. Calculate Pagination
        start = self.page * self.page_size
        end = start + self.page_size
        page_items = self.platforms[start:end]
        total_pages = (len(self.platforms) + self.page_size - 1) // self.page_size
        
        # 2. Header
        title_text = self.bot.get_feedback("ui_btn_templates", guild_id=self.guild_id, force_lang=self.force_lang)
        page_indicator = self.bot.get_feedback("ui_dashboard_page", current=self.page + 1, total=total_pages, guild_id=self.guild_id, force_lang=self.force_lang)
        
        container_items = [
            discord.ui.TextDisplay(f"### **{title_text}** ({page_indicator})"),
            discord.ui.Separator()
        ]
        
        # 3. Sections for each platform
        for loc_key, val, icon in page_items:
            if loc_key == "YouTube":
                label_text = f"{icon} YouTube"
            else:
                raw_label = self.bot.get_feedback(loc_key, guild_id=self.guild_id, force_lang=self.force_lang)
                label_text = f"{icon} {self.bot.parse_emoji_text(raw_label)[0]}"
            
            current_val = self.current_templates.get(val, "")
            if not current_val:
                desc = self.bot.get_feedback("ui_template_placeholder", guild_id=self.guild_id, force_lang=self.force_lang)
            else:
                desc = current_val[:100] + "..." if len(current_val) > 100 else current_val
            
            # Edit Button for this specific platform
            edit_label = self.bot.get_feedback("ui_btn_edit", guild_id=self.guild_id, force_lang=self.force_lang)
            btn = discord.ui.Button(label=edit_label, style=discord.ButtonStyle.secondary)
            
            # Create a closure for the callback
            def make_callback(platform_val, current_template):
                async def callback(interaction: discord.Interaction):
                    if not self.bot.has_feature(self.guild_id, "alert_template"):
                        await interaction.response.send_message(self.bot.get_feedback("error_premium_only_feature", guild_id=self.guild_id), ephemeral=True)
                        return
                        
                    modal = AlertTemplateModal(self.bot, platform_val, current_template)
                    await interaction.response.send_modal(modal)
                    await modal.wait()
                    
                    if modal.template_input.value and modal.template_input.value.strip():
                        self.current_templates[platform_val] = modal.template_input.value.strip()
                    else:
                        self.current_templates.pop(platform_val, None)
                    
                    self.settings["alert_templates"] = self.current_templates
                    self.update_view()
                    await interaction.edit_original_response(view=self)
                    
                return callback
            
            btn.callback = make_callback(val, current_val)
            
            container_items.append(discord.ui.Section(
                label=label_text,
                description=desc,
                accessory=btn
            ))

        self.add_item(discord.ui.Container(*container_items, accent_color=0x40C4FF))
        
        # 4. Navigation ActionRow
        nav_items = []
        if total_pages > 1:
            back_btn = discord.ui.Button(emoji=NAV_BACK, style=discord.ButtonStyle.secondary, disabled=(self.page == 0))
            back_btn.callback = self.prev_page
            
            next_btn = discord.ui.Button(emoji=NAV_NEXT, style=discord.ButtonStyle.secondary, disabled=(self.page >= total_pages - 1))
            next_btn.callback = self.next_page
            
            nav_items.extend([back_btn, next_btn])
            
        if nav_items:
            self.add_item(discord.ui.ActionRow(*nav_items))

    async def prev_page(self, interaction: discord.Interaction):
        self.page -= 1
        self.update_view()
        await interaction.response.edit_message(view=self)

    async def next_page(self, interaction: discord.Interaction):
        self.page += 1
        self.update_view()
        await interaction.response.edit_message(view=self)
