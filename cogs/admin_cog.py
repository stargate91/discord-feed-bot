import discord
from discord.ext import commands
from discord import app_commands
from logger import log
import database



def is_admin():
    async def predicate(ctx):
        if not ctx.bot.is_bot_admin(ctx.author):
            await ctx.send(ctx.bot.get_feedback("error_no_permission", guild_id=ctx.guild.id))
            return False
            
        master_guilds = ctx.bot.config.get("master_guilds", {})
        if str(ctx.guild.id) in master_guilds:
            admin_ch_id = master_guilds.get(str(ctx.guild.id), 0)
            if admin_ch_id != 0 and ctx.channel.id != admin_ch_id:
                return False
            
        return True
    return commands.check(predicate)

def is_master_only():
    async def predicate(interaction: discord.Interaction):
        if not getattr(interaction.client, "is_master_admin", lambda u: False)(interaction.user):
            await interaction.response.send_message(interaction.client.get_feedback("error_no_permission"), ephemeral=True)
            return False
        return True
    return app_commands.check(predicate)

class AdminCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    # --- Prefix Commands ---

    @commands.command(name="sync")
    @commands.guild_only()
    @is_admin()
    async def sync(self, ctx, spec: str | None = None):
        """[Admin] Sync slash commands manually (guild/global/copy)."""
        await ctx.send(self.bot.get_feedback("syncing_wait"))
        
        if spec == "global":
            synced = await self.bot.tree.sync()
            msg = self.bot.get_feedback("sync_success_global", count=len(synced))
            await ctx.send(msg)
        elif spec == "copy":
            self.bot.tree.copy_global_to(guild=ctx.guild)
            synced = await self.bot.tree.sync(guild=ctx.guild)
            msg = self.bot.get_feedback("sync_success_copy", count=len(synced))
            await ctx.send(msg)
        else:
            synced = await self.bot.tree.sync(guild=ctx.guild)
            msg = self.bot.get_feedback("sync_success_guild", count=len(synced))
            await ctx.send(msg)

    @commands.command(name="clear_commands", aliases=["command_clear"])
    @commands.guild_only()
    @is_admin()
    async def clear_commands(self, ctx):
        """[Admin] Emergency clear of all slash commands."""
        await ctx.send(self.bot.get_feedback("syncing_wait"))
        self.bot.tree.clear_commands(guild=None)
        await self.bot.tree.sync(guild=None)
        self.bot.tree.clear_commands(guild=ctx.guild)
        await self.bot.tree.sync(guild=ctx.guild)
        await ctx.send(self.bot.get_feedback("clear_commands_success"))
        
    # --- Slash Commands ---
    
    @app_commands.command(name="dashboard", description="Manage your bot settings and monitors")
    async def show_dashboard(self, interaction: discord.Interaction):
        """Sends a link to the web dashboard and support server."""
        await interaction.response.defer(ephemeral=True)
        
        from core.ui_layouts import generate_dashboard_layout
        layout = generate_dashboard_layout(self.bot, interaction.guild_id)
        
        await interaction.followup.send(view=layout, ephemeral=True)

async def setup(bot):
    await bot.add_cog(AdminCog(bot))

