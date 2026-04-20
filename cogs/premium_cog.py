import discord
from discord.ext import commands
from discord import app_commands
import database
from logger import log

class PremiumCog(commands.GroupCog, name="premium"):
    def __init__(self, bot):
        self.bot = bot
        super().__init__()

    @app_commands.command(name="check", description="Check the premium status of this server")
    async def premium_check(self, interaction: discord.Interaction):
        guild_id = interaction.guild_id
        if not guild_id:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return

        is_prem = self.bot.is_premium(guild_id)
        
        if is_prem:
            settings = self.bot.guild_settings_cache.get(guild_id, {})
            p_until = settings.get("premium_until")
            
            # If there's no expiration date but is_prem is true, it might be a master guild
            if not p_until:
                await interaction.response.send_message(self.bot.get_feedback("premium_check_lifetime"), ephemeral=True)
            else:
                # Format to discord timestamp
                discord_ts = f"<t:{int(p_until.timestamp())}:F>"
                await interaction.response.send_message(self.bot.get_feedback("premium_check_active", date=discord_ts), ephemeral=True)
        else:
            await interaction.response.send_message(self.bot.get_feedback("premium_check_inactive"), ephemeral=True)

    @app_commands.command(name="activate", description="Activate a premium code for this server")
    @app_commands.describe(code="Premium code (e.g. PREM-XXXX...)")
    @app_commands.default_permissions(administrator=True)
    @app_commands.checks.cooldown(5, 600.0, key=lambda i: i.guild_id)
    async def premium_activate(self, interaction: discord.Interaction, code: str):
        # ... (implementation preserved)
        guild_id = interaction.guild_id
        if not guild_id:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return
            
        await interaction.response.defer(ephemeral=True)
        
        success, result = await database.redeem_premium_code(code.upper().strip(), guild_id)
        
        if not success:
            await interaction.followup.send(self.bot.get_feedback("premium_activate_error"), ephemeral=True)
            return
            
        # Update local cache immediately
        current_settings = self.bot.guild_settings_cache.get(guild_id, {})
        current_settings["premium_until"] = result
        self.bot.guild_settings_cache[guild_id] = current_settings
        
        discord_ts = f"<t:{int(result.timestamp())}:F>"
        # Notice if it's the 2099 date, treat as lifetime visually if we want, but formatting the date is fine
        if result.year >= 2099:
             await interaction.followup.send(self.bot.get_feedback("premium_activate_success_lifetime"), ephemeral=True)
        else:
             await interaction.followup.send(self.bot.get_feedback("premium_activate_success", date=discord_ts), ephemeral=True)

    @app_commands.command(name="buy", description="Purchase premium for this server via Stripe")
    async def premium_buy(self, interaction: discord.Interaction):
        guild_id = interaction.guild_id
        if not guild_id:
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return

        from ui.views.premium_views import PremiumPurchaseView
        view = PremiumPurchaseView(self.bot, guild_id)
        
        embed = discord.Embed(
            title="Premium Tagság Vásárlása",
            description=(
                "Fejleszd a szerveredet prémiummá és oldd fel az összes korlátot!\n\n"
                "**Válassz egy csomagot:**"
            ),
            color=0x40C4FF
        )
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

    async def cog_app_command_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.CommandOnCooldown):
            msg = self.bot.get_feedback("premium_cooldown_error", retry_after=int(error.retry_after))
            if interaction.response.is_done():
                await interaction.followup.send(msg, ephemeral=True)
            else:
                await interaction.response.send_message(msg, ephemeral=True)
        else:
            log.error(f"Error in PremiumCog: {error}")
            fallback = self.bot.get_feedback("error_generic") if hasattr(self.bot, "get_feedback") else "An error occurred."
            if not interaction.response.is_done():
                await interaction.response.send_message(fallback, ephemeral=True)

async def setup(bot):
    await bot.add_cog(PremiumCog(bot))
