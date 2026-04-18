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
            
        admin_ch_id = ctx.bot.config.get("admin_channel_id", 0)
        if admin_ch_id and ctx.channel.id != admin_ch_id:
            return False
            
        return True
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

class MasterCog(commands.GroupCog, name="master"):
    def __init__(self, bot):
        self.bot = bot
        super().__init__()

    @app_commands.command(name="admin-channel", description="Set the global admin log channel")
    @app_commands.describe(channel="Target channel (defaults to current if empty)")
    async def master_admin_channel(self, interaction: discord.Interaction, channel: discord.TextChannel = None):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        target_channel = channel or interaction.channel
        
        self.bot.config["admin_channel_id"] = target_channel.id
        await database.set_bot_setting("admin_channel_id", target_channel.id)
        
        await interaction.response.send_message(self.bot.get_feedback("master_admin_ch_success", id=target_channel.id, guild_id=interaction.guild_id), ephemeral=True)

    @app_commands.command(name="admin-role", description="Delegate master permissions to a specific role on this server")
    @app_commands.describe(role="Select the master role")
    async def master_admin_role(self, interaction: discord.Interaction, role: discord.Role):
        # Only Bot Owner can grant Master role
        if not (interaction.user.id == self.bot.owner_id or (self.bot.application and interaction.user.id == self.bot.application.owner.id)):
            await interaction.response.send_message(self.bot.get_feedback("master_admin_role_owner_only"), ephemeral=True)
            return
            
        await database.update_guild_settings(interaction.guild_id, master_role_id=role.id, bot=self.bot)
        await interaction.response.send_message(self.bot.get_feedback("master_admin_role_success", id=role.id), ephemeral=True)

    @app_commands.command(name="refresh-interval", description="Set the global monitor refresh interval")
    @app_commands.describe(minutes="How many minutes between checks? (1-1440)")
    async def master_refresh_interval(self, interaction: discord.Interaction, minutes: app_commands.Range[int, 1, 1440]):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        self.bot.config["refresh_interval_minutes"] = minutes
        self.bot.monitor_manager.refresh_interval = minutes * 60
        self.bot.restart_monitor_task()
        await database.set_bot_setting("refresh_interval_minutes", minutes)
        
        await interaction.response.send_message(self.bot.get_feedback("master_refresh_interval_success", val=minutes), ephemeral=True)

    async def autocomplete_language(self, interaction: discord.Interaction, current: str):
        choices = []
        for lang_code in self.bot.locales.keys():
            if current.lower() in lang_code.lower():
                choices.append(app_commands.Choice(name=lang_code.upper(), value=lang_code))
        return choices[:25]

    @app_commands.command(name="language", description="Set the global master feedback language")
    @app_commands.describe(lang_code="Language code (e.g., hu, en)")
    @app_commands.autocomplete(lang_code=autocomplete_language)
    async def master_language(self, interaction: discord.Interaction, lang_code: str):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return

        lang_code = lang_code.lower()
        if lang_code not in self.bot.locales:
            return await interaction.response.send_message(self.bot.get_feedback("master_lang_unknown", list=', '.join(self.bot.locales.keys())), ephemeral=True)

        self.bot.config["master_language"] = lang_code
        self.bot.language_data = self.bot.locales[lang_code]
        await database.set_bot_setting("master_language", lang_code)

        await interaction.response.send_message(self.bot.get_feedback("master_lang_success", lang_code=lang_code.upper()), ephemeral=True)

    # --- Status Commands ---
    
    status_group = app_commands.Group(name="status", description="Bot rich presence configuration (master)")

    @status_group.command(name="add", description="Add a new bot status to the rotation")
    @app_commands.describe(activity_type="Type of activity", text="Status text (use {count} for feed count)")
    @app_commands.choices(activity_type=[
        app_commands.Choice(name="Playing", value="playing"),
        app_commands.Choice(name="Watching", value="watching"),
        app_commands.Choice(name="Listening to", value="listening"),
        app_commands.Choice(name="Streaming", value="streaming"),
        app_commands.Choice(name="Competing in", value="competing")
    ])
    async def status_add(self, interaction: discord.Interaction, activity_type: app_commands.Choice[str], text: str):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        await database.add_bot_status(activity_type.value, text[:128])
        await interaction.response.send_message(self.bot.get_feedback("status_add_success", type=activity_type.name, text=text), ephemeral=True)

    @status_group.command(name="list", description="List all configured bot statuses")
    async def status_list(self, interaction: discord.Interaction):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        statuses = await database.get_bot_statuses()
        if not statuses:
            await interaction.response.send_message(self.bot.get_feedback("status_list_empty"), ephemeral=True)
            return
            
        lines = [f"`{s['id']}` - **{s['type'].capitalize()}** {s['text']}" for s in statuses]
        msg = self.bot.get_feedback("status_list_title") + "\n" + "\n".join(lines)
        await interaction.response.send_message(msg[:2000], ephemeral=True)

    async def autocomplete_status(self, interaction: discord.Interaction, current: str):
        statuses = await database.get_bot_statuses()
        choices = []
        for s in statuses:
            name_str = f"[{s['type']}] {s['text']}"
            if current.lower() in name_str.lower():
                choices.append(app_commands.Choice(name=name_str[:100], value=str(s['id'])))
        return choices[:25]

    @status_group.command(name="remove", description="Remove an existing bot status")
    @app_commands.describe(status_id="Status to delete")
    @app_commands.autocomplete(status_id=autocomplete_status)
    async def status_remove(self, interaction: discord.Interaction, status_id: str):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        if not status_id.isdigit():
            await interaction.response.send_message(self.bot.get_feedback("status_remove_invalid"), ephemeral=True)
            return
            
        await database.remove_bot_status(int(status_id))
        await interaction.response.send_message(self.bot.get_feedback("status_remove_success", id=status_id), ephemeral=True)

    @status_group.command(name="edit", description="Edit an existing bot status")
    @app_commands.describe(status_id="Status to edit", activity_type="New type", text="New text")
    @app_commands.autocomplete(status_id=autocomplete_status)
    @app_commands.choices(activity_type=[
        app_commands.Choice(name="Playing", value="playing"),
        app_commands.Choice(name="Watching", value="watching"),
        app_commands.Choice(name="Listening to", value="listening"),
        app_commands.Choice(name="Streaming", value="streaming"),
        app_commands.Choice(name="Competing in", value="competing")
    ])
    async def status_edit(self, interaction: discord.Interaction, status_id: str, activity_type: app_commands.Choice[str], text: str):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        if not status_id.isdigit():
            await interaction.response.send_message(self.bot.get_feedback("status_remove_invalid"), ephemeral=True)
            return
            
        await database.update_bot_status(int(status_id), activity_type.value, text[:128])
        await interaction.response.send_message(self.bot.get_feedback("status_edit_success", id=status_id, type=activity_type.name, text=text), ephemeral=True)

    @status_group.command(name="setup", description="Configure how the status changes")
    @app_commands.describe(mode="Status rotation mode", interval="Seconds per rotation")
    @app_commands.choices(mode=[
        app_commands.Choice(name="Random", value="random"),
        app_commands.Choice(name="Sequential", value="sequential")
    ])
    async def status_setup(self, interaction: discord.Interaction, mode: app_commands.Choice[str], interval: app_commands.Range[int, 10, 3600]):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        await database.set_bot_setting("status_rotation_mode", mode.value)
        await database.set_bot_setting("presence_interval_seconds", interval)
        self.bot.config["presence_interval_seconds"] = interval
        
        await interaction.response.send_message(self.bot.get_feedback("status_setup_success", mode=mode.name, val=interval), ephemeral=True)


async def setup(bot):
    await bot.add_cog(AdminCog(bot))
    await bot.add_cog(MasterCog(bot))
