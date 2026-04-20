import discord
from ui.modals import AlertTemplateModal
from core.emojis import (
    TYPE_YOUTUBE, TYPE_RSS,
    TYPE_EPIC, TYPE_STEAM, TYPE_GOG,
    TYPE_STREAM, TYPE_TMDB_MOVIE, TYPE_TMDB_TV,
    TYPE_CRYPTO, TYPE_GITHUB, TYPE_UNKNOWN
)

class AlertTemplateSelectLayout(discord.ui.LayoutView):
    def __init__(self, bot, guild_id, settings, force_lang=None):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.settings = settings
        self.force_lang = force_lang
        self.current_templates = settings.get("alert_templates", {})

        platforms = [
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

        options = []
        for loc_key, val, icon in platforms:
            if loc_key == "YouTube":
                label = "YouTube"
            else:
                label = self.bot.get_feedback(loc_key, guild_id=self.guild_id, force_lang=self.force_lang)
            
            clean_label, _ = self.bot.parse_emoji_text(label)
            options.append(discord.SelectOption(label=clean_label, value=val, emoji=icon))

        self.select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_setup_template_ph", guild_id=self.guild_id, force_lang=self.force_lang), options=options)
        self.select.callback = self.select_callback
        
        msg_text = self.bot.get_feedback("ui_setup_platform_select_msg", guild_id=self.guild_id, force_lang=self.force_lang)
        if msg_text == "ui_setup_platform_select_msg":
            msg_text = "Select a platform to configure."
            
        title_text = self.bot.get_feedback("ui_btn_templates", guild_id=self.guild_id, force_lang=self.force_lang)
        if title_text == "ui_btn_templates":
            title_text = "Templates"

        container_items = [
            discord.ui.TextDisplay(f"### **{title_text}**\n{msg_text}"),
            discord.ui.Separator(),
            discord.ui.ActionRow(self.select)
        ]
        
        self.add_item(discord.ui.Container(*container_items, accent_color=0x40C4FF))

    async def select_callback(self, interaction: discord.Interaction):
        if not self.bot.has_feature(self.guild_id, "alert_template"):
            await interaction.response.send_message(self.bot.get_feedback("error_premium_only_feature", guild_id=self.guild_id), ephemeral=True)
            return

        platform = self.select.values[0]
        current = self.current_templates.get(platform, "")
        modal = AlertTemplateModal(self.bot, platform, current)
        await interaction.response.send_modal(modal)
        await modal.wait()
        
        if not modal.template_input.value or not modal.template_input.value.strip():
            self.current_templates.pop(platform, None)
        else:
            self.current_templates[platform] = modal.template_input.value.strip()

        # Update in-memory settings for the main SetupWizardView to save later
        self.settings["alert_templates"] = self.current_templates
        msg = self.bot.get_feedback("ui_setup_template_save_msg", platform=platform.capitalize(), guild_id=self.guild_id, force_lang=self.force_lang)
        await interaction.followup.send(msg, ephemeral=True)
