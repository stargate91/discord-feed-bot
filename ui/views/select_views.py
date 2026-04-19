import discord
from ui.modals import AlertTemplateModal
from core.emojis import (
    TYPE_YOUTUBE, TYPE_RSS, 
    TYPE_GAME, TYPE_STREAM
)

class AlertTemplateSelectLayout(discord.ui.LayoutView):
    def __init__(self, bot, guild_id, settings):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.settings = settings
        self.current_templates = settings.get("alert_templates", {})

        options = [
            discord.SelectOption(label="YouTube", value="youtube", emoji=TYPE_YOUTUBE),
            discord.SelectOption(label=self.bot.get_feedback("monitor_platform_rss", guild_id=self.guild_id), value="rss", emoji=TYPE_RSS),
            discord.SelectOption(label=self.bot.get_feedback("ui_platform_steam_game"), value="steam_news", emoji=TYPE_GAME),
            discord.SelectOption(label=self.bot.get_feedback("monitor_platform_stream", guild_id=self.guild_id), value="stream", emoji=TYPE_STREAM),
        ]

        self.select = discord.ui.Select(placeholder=self.bot.get_feedback("ui_setup_template_ph", guild_id=self.guild_id), options=options)
        self.select.callback = self.select_callback
        
        msg_text = self.bot.get_feedback("ui_setup_platform_select_msg", guild_id=self.guild_id)
        if msg_text == "ui_setup_platform_select_msg":
            msg_text = "Select a platform to configure."
            
        container_items = [
            discord.ui.TextDisplay(f"### **Templates**\n{msg_text}"),
            discord.ui.Separator(),
            discord.ui.ActionRow(self.select)
        ]
        
        self.add_item(discord.ui.Container(*container_items, accent_color=0x40C4FF))

    async def select_callback(self, interaction: discord.Interaction):
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
        msg = self.bot.get_feedback("ui_setup_template_save_msg", platform=platform.capitalize(), guild_id=self.guild_id)
        await interaction.followup.send(msg, ephemeral=True)
