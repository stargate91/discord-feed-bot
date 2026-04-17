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
            await database.set_bot_setting("admin_channel_id", admin_channel.id) # Save to DB
            config_changed = True
            details.append(f"- Admin csatorna: <#{admin_channel.id}>")
            
        if refresh_interval:
            self.bot.config["refresh_interval_minutes"] = refresh_interval
            self.bot.monitor_manager.refresh_interval = refresh_interval * 60
            self.bot.restart_monitor_task()
            await database.set_bot_setting("refresh_interval_minutes", refresh_interval) # Save to DB
            config_changed = True
            details.append(f"- Monitor frissítés: **{refresh_interval} perc**")
            
        if config_changed:
            msg = self.bot.get_feedback("master_settings_success", guild_id=interaction.guild_id) + "\n" + "\n".join(details)
        else:
            ac_id = self.bot.config.get('admin_channel_id', 0)
            r_i = self.bot.config.get('refresh_interval_minutes', 10)
            msg = (self.bot.get_feedback("master_settings_info", guild_id=interaction.guild_id) + "\n" +
                   self.bot.get_feedback("master_field_admin_ch", id=ac_id, guild_id=interaction.guild_id) + "\n" +
                   self.bot.get_feedback("master_field_refresh", val=r_i, guild_id=interaction.guild_id))
        
        await interaction.response.send_message(msg, ephemeral=True)

    @app_commands.command(name="admin-channel", description="Set the global admin log channel")
    @app_commands.describe(channel="Célcsatorna (üresen hagyva az aktuálisat állítja be)")
    async def master_admin_channel(self, interaction: discord.Interaction, channel: discord.TextChannel = None):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        target_channel = channel or interaction.channel
        
        self.bot.config["admin_channel_id"] = target_channel.id
        await database.set_bot_setting("admin_channel_id", target_channel.id)
        
        await interaction.response.send_message(f"✅ Globális Admin Log csatorna beállítva: <#{target_channel.id}>", ephemeral=True)

    @app_commands.command(name="admin-role", description="Mester hozzáférés delegálása egy specifikus rangnak ezen a szerveren")
    @app_commands.describe(role="Válaszd ki a mester rangot")
    async def master_admin_role(self, interaction: discord.Interaction, role: discord.Role):
        # Csak az eredeti Bot Owner adhat ki Master rangot! (Különben bárki felhatalmazhatná magát, ha valahogy Master lesz)
        if not (interaction.user.id == self.bot.owner_id or (self.bot.application and interaction.user.id == self.bot.application.owner.id)):
            await interaction.response.send_message("❌ Ezt a parancsot csak a Bot Készítője használhatja biztonsági okokból!", ephemeral=True)
            return
            
        await database.update_guild_settings(interaction.guild_id, master_role_id=role.id, bot=self.bot)
        await interaction.response.send_message(f"👑 Mester jogosultság sikeresen delegálva a következő rangnak: <@&{role.id}>", ephemeral=True)

    @app_commands.command(name="refresh-interval", description="Globális monitor lekérdezési ritmus beállítása")
    @app_commands.describe(minutes="Hány percenként ellenőrizze a bot az új posztokat? (1-1440)")
    async def master_refresh_interval(self, interaction: discord.Interaction, minutes: app_commands.Range[int, 1, 1440]):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        self.bot.config["refresh_interval_minutes"] = minutes
        self.bot.monitor_manager.refresh_interval = minutes * 60
        self.bot.restart_monitor_task()
        await database.set_bot_setting("refresh_interval_minutes", minutes)
        
        await interaction.response.send_message(f"🔄 Globális monitor frissítési idő beállítva: **{minutes} perc**", ephemeral=True)

    async def autocomplete_language(self, interaction: discord.Interaction, current: str):
        choices = []
        for lang_code in self.bot.locales.keys():
            if current.lower() in lang_code.lower():
                choices.append(app_commands.Choice(name=lang_code.upper(), value=lang_code))
        return choices[:25]

    @app_commands.command(name="language", description="Set the global master feedback language")
    @app_commands.describe(lang_code="Nyelv kódja (pl. hu, en)")
    @app_commands.autocomplete(lang_code=autocomplete_language)
    async def master_language(self, interaction: discord.Interaction, lang_code: str):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return

        lang_code = lang_code.lower()
        if lang_code not in self.bot.locales:
            return await interaction.response.send_message(f"❌ Ismeretlen nyelv. Elérhető: {', '.join(self.bot.locales.keys())}", ephemeral=True)

        self.bot.config["master_language"] = lang_code
        self.bot.language_data = self.bot.locales[lang_code]
        await database.set_bot_setting("master_language", lang_code)

        await interaction.response.send_message(f"🌍 Master (Global) nyelv sikeresen beállítva: **{lang_code.upper()}**\n\n*(Ettől függetlenül az UI és a per parancsok a Discordon lokálisak maradnak.)*", ephemeral=True)

    # --- Status Commands ---
    
    status_group = app_commands.Group(name="status", description="Bot rich presence kofiguráció (master)")

    @status_group.command(name="add", description="Add a new bot status to the rotation")
    @app_commands.describe(activity_type="Tevékenység típusa", text="Státusz szövege (használható: {count})")
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
        await interaction.response.send_message(f"✅ Státusz hozzáadva: **{activity_type.name} {text}**", ephemeral=True)

    @status_group.command(name="list", description="List all configured bot statuses")
    async def status_list(self, interaction: discord.Interaction):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        statuses = await database.get_bot_statuses()
        if not statuses:
            await interaction.response.send_message("Nincsenek beállítva egyedi státuszok.", ephemeral=True)
            return
            
        lines = [f"`{s['id']}` - **{s['type'].capitalize()}** {s['text']}" for s in statuses]
        msg = "### Beállított Bot Státuszok\n" + "\n".join(lines)
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
    @app_commands.describe(status_id="A törlendő státusz")
    @app_commands.autocomplete(status_id=autocomplete_status)
    async def status_remove(self, interaction: discord.Interaction, status_id: str):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        if not status_id.isdigit():
            await interaction.response.send_message("❌ Érvénytelen azonosító.", ephemeral=True)
            return
            
        await database.remove_bot_status(int(status_id))
        await interaction.response.send_message(f"🗑️ Státusz (ID: {status_id}) törölve.", ephemeral=True)

    @status_group.command(name="edit", description="Edit an existing bot status")
    @app_commands.describe(status_id="Szerkesztendő státusz", activity_type="Új típus", text="Új szöveg")
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
            await interaction.response.send_message("❌ Érvénytelen azonosító.", ephemeral=True)
            return
            
        await database.update_bot_status(int(status_id), activity_type.value, text[:128])
        await interaction.response.send_message(f"✏️ Státusz (ID: {status_id}) frissítve erre: **{activity_type.name} {text}**", ephemeral=True)

    @status_group.command(name="setup", description="Configure how the status changes")
    @app_commands.describe(mode="Státusz léptetési mód (sorban vagr random)", interval="Másodperc frissítésenként")
    @app_commands.choices(mode=[
        app_commands.Choice(name="Random", value="random"),
        app_commands.Choice(name="Sequential (Egymás után)", value="sequential")
    ])
    async def status_setup(self, interaction: discord.Interaction, mode: app_commands.Choice[str], interval: app_commands.Range[int, 10, 3600]):
        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission"), ephemeral=True)
            return
            
        await database.set_bot_setting("status_rotation_mode", mode.value)
        await database.set_bot_setting("presence_interval_seconds", interval)
        self.bot.config["presence_interval_seconds"] = interval
        
        await interaction.response.send_message(f"⚙️ Státusz konfiguráció frissítve:\n- Mód: **{mode.name}**\n- Váltás: **{interval} mp**", ephemeral=True)


async def setup(bot):
    await bot.add_cog(AdminCog(bot))
    await bot.add_cog(MasterCog(bot))
