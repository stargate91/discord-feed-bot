import discord
from discord.ext import commands
from discord import app_commands
from ui.views.wizard_views import SetupWizardView

class SetupCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="setup", description="Szerver alapértelmezések beállítása (Nyelv, Csatorna, Role)")
    @app_commands.default_permissions(administrator=True)
    async def setup_command(self, interaction: discord.Interaction):
        """[Admin] Interactive Setup Wizard for guild properties."""
        guild_id = interaction.guild_id or 0
        view = SetupWizardView(self.bot, guild_id)
        
        settings = self.bot.guild_settings_cache.get(guild_id, {"language": "hu", "default_channel_id": None, "default_ping_role_id": None})
        lang = settings.get("language", "hu")
        ch = settings.get("default_channel_id")
        role = settings.get("default_ping_role_id")
        
        ch_mention = f"<#{ch}>" if ch else "Nincs beállítva"
        role_mention = f"<@&{role}>" if role else "Nincs beállítva"
        
        msg = (f"**🔧 Szerver Beállítások (Setup)**\n\n"
               f"**Jelenlegi:**\n"
               f"- Nyelv: `{lang}`\n"
               f"- Alap csatorna: {ch_mention}\n"
               f"- Alap role: {role_mention}\n\n"
               f"A lenyíló menükből válaszd ki a változtatni kívánt értékeket, majd nyomj a mentésre!")
               
        await interaction.response.send_message(msg, view=view, ephemeral=True)

async def setup(bot):
    await bot.add_cog(SetupCog(bot))
