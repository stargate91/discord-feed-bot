import discord
from discord.ext import commands
from discord import app_commands
from ui.views.wizard_views import SetupWizardView

class SetupCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    # --- Setup Wizard ---

    @app_commands.command(name="setup", description="Configure server defaults (Language, Channel, Role) via Interactive Wizard")
    @app_commands.default_permissions(administrator=True)
    async def setup_command(self, interaction: discord.Interaction):
        """[Admin] Interactive Setup Wizard for guild properties."""
        guild_id = interaction.guild_id or 0
        view = SetupWizardView(self.bot, guild_id)
        
        settings = self.bot.guild_settings_cache.get(guild_id, {"language": "en", "default_channel_id": None, "default_ping_role_id": None})
        lang = settings.get("language", "en")
        ch = settings.get("default_channel_id")
        role = settings.get("default_ping_role_id")
        
        not_set = self.bot.get_feedback("ui_setup_not_set", guild_id=guild_id)
        ch_mention = f"<#{ch}>" if ch else not_set
        role_mention = f"<@&{role}>" if role else not_set
        
        msg = (f"{self.bot.get_feedback('ui_setup_msg', guild_id=guild_id)}\n\n"
               f"{self.bot.get_feedback('ui_setup_current_vals', guild_id=guild_id)}\n"
               f"- {self.bot.get_feedback('ui_setup_lang_label', guild_id=guild_id)}: `{lang}`\n"
               f"- {self.bot.get_feedback('ui_setup_ch_label', guild_id=guild_id)}: {ch_mention}\n"
               f"- {self.bot.get_feedback('ui_setup_role_label', guild_id=guild_id)}: {role_mention}\n\n"
               f"{self.bot.get_feedback('ui_setup_save_info', guild_id=guild_id)}")
               
        await interaction.response.send_message(msg, view=view, ephemeral=True)

    # --- Granular Settings Group (/set) ---

    set_group = app_commands.Group(name="set", description="Configure individual server settings")

    # Autocomplete for language
    async def autocomplete_language(self, interaction: discord.Interaction, current: str):
        choices = []
        for lang_code in self.bot.locales.keys():
            if current.lower() in lang_code.lower():
                choices.append(app_commands.Choice(name=lang_code.upper(), value=lang_code))
        return choices[:25]

    @set_group.command(name="language", description="Set the feedback language for this server")
    @app_commands.describe(lang_code="Language code (e.g., hu, en)")
    @app_commands.autocomplete(lang_code=autocomplete_language)
    @app_commands.default_permissions(administrator=True)
    async def set_language(self, interaction: discord.Interaction, lang_code: str):
        guild_id = interaction.guild_id or 0
        lang_code = lang_code.lower()
        if lang_code not in self.bot.locales:
            return await interaction.response.send_message(self.bot.get_feedback("master_lang_unknown", list=', '.join(self.bot.locales.keys())), ephemeral=True)

        await database.update_guild_settings(guild_id, language=lang_code, bot=self.bot)
        await interaction.response.send_message(self.bot.get_feedback("ui_setup_lang_success", lang=lang_code.upper()), ephemeral=True)

    @set_group.command(name="default-channel", description="Set the default channel for notifications")
    @app_commands.describe(channel="Target channel for posts")
    @app_commands.default_permissions(administrator=True)
    async def set_default_channel(self, interaction: discord.Interaction, channel: discord.TextChannel):
        guild_id = interaction.guild_id or 0
        await database.update_guild_settings(guild_id, default_channel_id=channel.id, bot=self.bot)
        await interaction.response.send_message(self.bot.get_feedback("ui_setup_ch_success", id=channel.id), ephemeral=True)

    @set_group.command(name="default-ping-role", description="Set the default role to mention in notifications")
    @app_commands.describe(role="Select the role to be pinged")
    @app_commands.default_permissions(administrator=True)
    async def set_default_ping_role(self, interaction: discord.Interaction, role: discord.Role):
        guild_id = interaction.guild_id or 0
        await database.update_guild_settings(guild_id, default_ping_role_id=role.id, bot=self.bot)
        await interaction.response.send_message(self.bot.get_feedback("ui_setup_role_success", id=role.id), ephemeral=True)

    @set_group.command(name="admin-role", description="Set the role allowed to manage the bot on this server")
    @app_commands.describe(role="Select the server admin role")
    @app_commands.default_permissions(administrator=True)
    async def set_admin_role(self, interaction: discord.Interaction, role: discord.Role):
        guild_id = interaction.guild_id or 0
        await database.update_guild_settings(guild_id, admin_role_id=role.id, bot=self.bot)
        await interaction.response.send_message(self.bot.get_feedback("ui_setup_admin_role_success", id=role.id), ephemeral=True)

    @set_group.command(name="alert-templates", description="Set custom message templates for specific platforms")
    @app_commands.describe(platform="The platform to set the template for", template="Template string (supports {name}, {title}, {url}, and \\n)")
    @app_commands.choices(platform=[
        app_commands.Choice(name="YouTube", value="youtube"),
        app_commands.Choice(name="RSS Feed", value="rss"),
        app_commands.Choice(name="Epic Games", value="epic_games"),
        app_commands.Choice(name="Steam Free", value="steam_free"),
        app_commands.Choice(name="GOG Free", value="gog_free"),
        app_commands.Choice(name="Stream (Twitch/Kick)", value="stream"),
        app_commands.Choice(name="Steam News", value="steam_news"),
        app_commands.Choice(name="Movie", value="movie"),
        app_commands.Choice(name="TV Series", value="tv_series")
    ])
    @app_commands.default_permissions(administrator=True)
    async def set_alert_template(self, interaction: discord.Interaction, platform: app_commands.Choice[str], template: str):
        guild_id = interaction.guild_id or 0
        settings = self.bot.guild_settings_cache.get(guild_id, {})
        current_templates = settings.get("alert_templates", {}).copy()
        
        # Process \n and trim whitespace
        clean_template = template.replace("\\n", "\n").strip()
        
        if not clean_template:
            current_templates.pop(platform.value, None)
        else:
            current_templates[platform.value] = clean_template
            
        await database.update_guild_settings(guild_id, alert_templates=current_templates, bot=self.bot)
        await interaction.response.send_message(self.bot.get_feedback("ui_setup_template_success", platform=platform.name), ephemeral=True)

async def setup(bot):
    await bot.add_cog(SetupCog(bot))
