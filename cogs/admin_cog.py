import discord
from discord.ext import commands
from discord import app_commands
from logger import log

def is_admin():
    async def predicate(ctx):
        if ctx.bot.is_bot_admin(ctx.author):
            return True
        await ctx.send(ctx.bot.get_feedback("error_no_permission", guild_id=ctx.guild.id))
        return False
    return commands.check(predicate)

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

    @commands.command(name="clear_commands")
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

class MasterCog(commands.GroupCog, name="master"):
    def __init__(self, bot):
        self.bot = bot
        super().__init__()

    @app_commands.command(name="settings", description="Globális beállítások módosítása (csak master szerveren)")
    @app_commands.describe(
        admin_channel="Globális admin log csatorna",
        refresh_interval="Monitor lekérdezési ritmus (perc)"
    )
    async def master_settings(
        self,
        interaction: discord.Interaction, 
        admin_channel: discord.TextChannel = None, 
        refresh_interval: app_commands.Range[int, 1, 1440] = None
    ):
        config_changed = False
        details = []
        
        if admin_channel:
            self.bot.config["admin_channel_id"] = admin_channel.id
            config_changed = True
            details.append(f"- Admin csatorna: <#{admin_channel.id}>")
            
        if refresh_interval:
            self.bot.config["refresh_interval_minutes"] = refresh_interval
            self.bot.monitor_manager.refresh_interval = refresh_interval * 60
            self.bot.restart_monitor_task()
            config_changed = True
            details.append(f"- Monitor frissítés: **{refresh_interval} perc**")
            
        if config_changed:
            self.bot.save_config()
            msg = self.bot.get_feedback("master_settings_success", guild_id=interaction.guild_id) + "\n" + "\n".join(details)
        else:
            ac_id = self.bot.config.get('admin_channel_id', 0)
            r_i = self.bot.config.get('refresh_interval_minutes', 10)
            msg = (self.bot.get_feedback("master_settings_info", guild_id=interaction.guild_id) + "\n" +
                   self.bot.get_feedback("master_field_admin_ch", id=ac_id, guild_id=interaction.guild_id) + "\n" +
                   self.bot.get_feedback("master_field_refresh", val=r_i, guild_id=interaction.guild_id))
        
        await interaction.response.send_message(msg, ephemeral=True)

async def setup(bot):
    await bot.add_cog(AdminCog(bot))
    await bot.add_cog(MasterCog(bot))
