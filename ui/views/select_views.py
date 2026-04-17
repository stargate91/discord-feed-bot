import discord
from ui.modals import AlertTemplateModal

class AlertTemplateSelectView(discord.ui.View):
    def __init__(self, bot, guild_id, settings):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.settings = settings
        self.current_templates = settings.get("alert_templates", {})

        options = [
            discord.SelectOption(label="YouTube", value="youtube", emoji="📺"),
            discord.SelectOption(label="RSS", value="rss", emoji="🔗"),
            discord.SelectOption(label="TikTok", value="tiktok", emoji="🎵"),
            discord.SelectOption(label="Instagram", value="instagram", emoji="📸"),
            discord.SelectOption(label="Steam Játék", value="steam_news", emoji="🎮"),
            discord.SelectOption(label="Stream", value="stream", emoji="📡"),
            discord.SelectOption(label="Reddit", value="reddit", emoji="🟠"),
            discord.SelectOption(label="Twitter/X", value="twitter", emoji="🐦"),
        ]

        self.select = discord.ui.Select(placeholder="Válassz platformot a sablonhoz...", options=options)
        self.select.callback = self.select_callback
        self.add_item(self.select)

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
        await interaction.followup.send(f"✅ {platform.capitalize()} sablon ideiglenesen mentve. **Ne felejts el a 'Beállítások Mentése' gombra kattintani a főmenüben!**", ephemeral=True)
