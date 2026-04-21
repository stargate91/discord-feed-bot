import discord
from discord.ext import commands
from discord import app_commands
from logger import log
import database
from ui.views.help_views import HelpView


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
    
    async def autocomplete_purge_channels(self, interaction: discord.Interaction, current: str):
        """Autocomplete only channels that have a monitor configured in this guild."""
        monitors = await database.get_monitors_for_guild(interaction.guild_id)
        channel_ids = {m["discord_channel_id"] for m in monitors if m.get("discord_channel_id")}
        
        choices = []
        for ch_id in channel_ids:
            channel = interaction.guild.get_channel(ch_id)
            if not channel:
                # Try fetching if not in cache
                try: channel = await interaction.guild.fetch_channel(ch_id)
                except: continue
                
            if channel and isinstance(channel, discord.TextChannel):
                if current.lower() in channel.name.lower():
                    choices.append(app_commands.Choice(name=f"#{channel.name}", value=str(ch_id)))
        
        return choices[:25]

    @app_commands.command(name="purge", description="Purge messages from a monitored channel")
    @app_commands.describe(channel_id="Which channel to clean up? (Only monitored channels list)", count="How many posts to delete? (Leave empty for all)")
    @app_commands.autocomplete(channel_id=autocomplete_purge_channels)
    async def purge(self, interaction: discord.Interaction, channel_id: str, count: int = None):
        """[Admin] Deletes messages from a specific monitored channel."""
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return

        target_channel = interaction.guild.get_channel(int(channel_id))
        if not target_channel or not isinstance(target_channel, discord.TextChannel):
            # Try fetch
            try: target_channel = await interaction.guild.fetch_channel(int(channel_id))
            except: 
                await interaction.response.send_message(self.bot.get_feedback("error_channel_not_found", guild_id=interaction.guild_id), ephemeral=True)
                return

        await interaction.response.defer(ephemeral=True)
        
        try:
            # Send immediate response as it might take time
            try:
                await interaction.response.send_message(self.bot.get_feedback("purge_started", channel=target_channel.name, guild_id=interaction.guild_id), ephemeral=True)
            except:
                pass

            total_deleted = 0
            chunk_size = 100
            
            log.info(f"Admin {interaction.user} started robust purge in #{target_channel.name} (Guild: {interaction.guild_id})")
            
            while count is None or total_deleted < count:
                current_limit = chunk_size
                if count is not None:
                    remaining = count - total_deleted
                    if remaining <= 0: break
                    current_limit = min(chunk_size, remaining)
                
                try:
                    # purge() in d.py can throw NotFound if a message disappears during the loop
                    deleted = await target_channel.purge(limit=current_limit)
                    if not deleted:
                        break
                    
                    total_deleted += len(deleted)
                    log.info(f"Purge progress: {total_deleted} messages deleted from #{target_channel.name}...")
                    
                    if len(deleted) < current_limit:
                        break
                except discord.NotFound:
                    # If we hit an Unknown Message, just retry the next batch
                    log.warning(f"Purge encountered 404 (Unknown Message) in #{target_channel.name}, continuing...")
                    continue
                except Exception as e:
                    log.error(f"Error during purge chunk in #{target_channel.name}: {e}")
                    break
            
            msg = self.bot.get_feedback("purge_success", count=total_deleted, channel=target_channel.name, guild_id=interaction.guild_id)
            try:
                await interaction.followup.send(msg, ephemeral=True)
            except discord.HTTPException:
                # Token expired (takes too long), send to channel instead
                await interaction.channel.send(msg)
            
            log.info(f"Robust purge completed: {total_deleted} messages deleted from #{target_channel.name}")
            
        except discord.Forbidden:
            log.error(f"Purge failed in #{target_channel.name}: Forbidden", exc_info=True)
            err_msg = self.bot.get_feedback("purge_error", error="Missing Permissions", guild_id=interaction.guild_id)
            try:
                await interaction.followup.send(err_msg, ephemeral=True)
            except:
                await interaction.channel.send(err_msg)
        except Exception as e:
            log.error(f"Purge failed in #{target_channel.name}: {e}", exc_info=True)
            err_msg = self.bot.get_feedback("purge_error", error=str(e), guild_id=interaction.guild_id)
            try:
                await interaction.followup.send(err_msg, ephemeral=True)
            except:
                await interaction.channel.send(err_msg)

    @app_commands.command(name="help", description="Show the bot documentation and command list")
    async def show_help(self, interaction: discord.Interaction):
        """Displays a categorized help menu with bot commands and support links."""
        await interaction.response.defer(ephemeral=True)
        
        # Load guild translations just in case (already usually done in bot, but safe)
        from core.bot import FeedBot
        if isinstance(self.bot, FeedBot):
            # This triggers a refresh if needed
            self.bot.get_feedback("help_title", guild_id=interaction.guild_id)

        view = HelpView(self.bot, interaction.guild_id or 0)
        await interaction.followup.send(view=view, ephemeral=True)

class MasterCog(commands.GroupCog, name="master"):
    def __init__(self, bot):
        self.bot = bot
        super().__init__()



    @app_commands.command(name="refresh-interval", description="Set the global monitor refresh interval")
    @app_commands.describe(minutes="How many minutes between checks? (1-1440)")
    @is_master_only()
    async def master_refresh_interval(self, interaction: discord.Interaction, minutes: app_commands.Range[int, 1, 1440]):
        self.bot.config["refresh_interval_minutes"] = minutes
        self.bot.monitor_manager.refresh_interval = minutes * 60
        self.bot.restart_monitor_task()
        await database.set_bot_setting("refresh_interval_minutes", minutes)
        
        await interaction.response.send_message(self.bot.get_feedback("master_refresh_interval_success", val=minutes), ephemeral=True)



    @app_commands.command(name="generate-premium", description="Generate a new premium code (Master Admin only)")
    @app_commands.describe(days="Duration in days (0 for lifetime)", uses="How many times can it be redeemed?")
    @is_master_only()
    async def master_generate_premium(self, interaction: discord.Interaction, days: int, uses: int = 1):
        import secrets
        import string
        
        # Generate format PREM-XXXX-YYYY-ZZZZ-WWWW
        chars = string.ascii_uppercase + string.digits
        parts = [''.join(secrets.choice(chars) for _ in range(4)) for _ in range(4)]
        code = "PREM-" + "-".join(parts)
        
        await database.create_premium_code(code, days, uses)
        await interaction.response.send_message(self.bot.get_feedback("master_premium_gen_success", code=code, days=days, uses=uses), ephemeral=True)

    @app_commands.command(name="list-premium", description="List generated premium codes (Master Admin only)")
    @app_commands.describe(filter_type="Filter by usage")
    @app_commands.choices(filter_type=[
        app_commands.Choice(name="All", value="all"),
        app_commands.Choice(name="Used", value="used"),
        app_commands.Choice(name="Unused", value="unused")
    ])
    @is_master_only()
    async def master_list_premium(self, interaction: discord.Interaction, filter_type: app_commands.Choice[str]):
        codes = await database.get_premium_codes(filter_type.value)
        if not codes:
            await interaction.response.send_message(self.bot.get_feedback("master_premium_list_empty"), ephemeral=True)
            return

        lines = []
        for r in codes:
            code, days, max_uses, used_count, created_at = r
            duration = "Lifetime" if days == 0 else f"{days} days"
            lines.append(f"`{code}` | {duration} | Uses: {used_count}/{max_uses}")

        msg = self.bot.get_feedback("master_premium_list_title", filter=filter_type.name) + "\n" + "\n".join(lines)
        if len(msg) > 2000:
            msg = msg[:1996] + "..."
        await interaction.response.send_message(msg, ephemeral=True)

    async def autocomplete_premium_code(self, interaction: discord.Interaction, current: str):
        codes = await database.get_premium_codes("all")
        choices = []
        for r in codes:
            code = r['code']
            if current.lower() in code.lower():
                choices.append(app_commands.Choice(name=code, value=code))
        return choices[:25]

    @app_commands.command(name="delete-premium", description="Delete a premium code completely (Master Admin only)")
    @app_commands.describe(code="Premium code to delete")
    @app_commands.autocomplete(code=autocomplete_premium_code)
    @is_master_only()
    async def master_delete_premium(self, interaction: discord.Interaction, code: str):
        await database.delete_premium_code(code)
        await interaction.response.send_message(self.bot.get_feedback("master_premium_delete_success", code=code), ephemeral=True)

    @app_commands.command(name="revoke-premium", description="Revoke premium access from a server (Master Admin only)")
    @app_commands.describe(guild_id="Guild ID to revoke premium from")
    @is_master_only()
    async def master_revoke_premium(self, interaction: discord.Interaction, guild_id: str):
        if not guild_id.isdigit():
            await interaction.response.send_message(self.bot.get_feedback("master_premium_revoke_error"), ephemeral=True)
            return
            
        g_id = int(guild_id)
        await database.revoke_guild_premium(g_id)
        
        # Invalidate cache
        if g_id in self.bot.guild_settings_cache:
            self.bot.guild_settings_cache[g_id]["premium_until"] = None
            
        await interaction.response.send_message(self.bot.get_feedback("master_premium_revoke_success", guild_id=guild_id), ephemeral=True)

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
    @is_master_only()
    async def status_add(self, interaction: discord.Interaction, activity_type: app_commands.Choice[str], text: str):
        await database.add_bot_status(activity_type.value, text[:128])
        await interaction.response.send_message(self.bot.get_feedback("status_add_success", type=activity_type.name, text=text), ephemeral=True)

    @status_group.command(name="list", description="List all configured bot statuses")
    @is_master_only()
    async def status_list(self, interaction: discord.Interaction):
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
    @is_master_only()
    async def status_remove(self, interaction: discord.Interaction, status_id: str):
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
    @is_master_only()
    async def status_edit(self, interaction: discord.Interaction, status_id: str, activity_type: app_commands.Choice[str], text: str):
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
    @is_master_only()
    async def status_setup(self, interaction: discord.Interaction, mode: app_commands.Choice[str], interval: app_commands.Range[int, 10, 3600]):
        await database.set_bot_setting("status_rotation_mode", mode.value)
        await database.set_bot_setting("presence_interval_seconds", interval)
        self.bot.config["presence_interval_seconds"] = interval
        
        await interaction.response.send_message(self.bot.get_feedback("status_setup_success", mode=mode.name, val=interval), ephemeral=True)


async def setup(bot):
    await bot.add_cog(AdminCog(bot))
    await bot.add_cog(MasterCog(bot))
