import discord
from discord.ext import commands
from discord import app_commands
from ui.views.wizard_views import SetupWizardView

class SetupCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="setup", description="Configure server defaults (Language, Channel, Role)")
    @app_commands.default_permissions(administrator=True)
    async def setup_command(self, interaction: discord.Interaction):
        """[Admin] Interactive Setup Wizard for guild properties."""
        guild_id = interaction.guild_id or 0
        view = SetupWizardView(self.bot, guild_id)
        
        settings = self.bot.guild_settings_cache.get(guild_id, {"language": "hu", "default_channel_id": None, "default_ping_role_id": None})
        lang = settings.get("language", "hu")
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

async def setup(bot):
    await bot.add_cog(SetupCog(bot))
