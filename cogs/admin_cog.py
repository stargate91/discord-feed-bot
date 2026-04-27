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

        # Security check: Ensure channel is monitored
        monitors = await database.get_monitors_for_guild(interaction.guild_id)
        monitored_channel_ids = {str(m.get("discord_channel_id", "")) for m in monitors}
        
        if str(target_channel.id) not in monitored_channel_ids:
            err_msg = self.bot.get_feedback("error_purge_not_monitored", guild_id=interaction.guild_id)
            if err_msg == "error_purge_not_monitored": # Fallback
                err_msg = "<:xfilledcircle:1495830088523059341> You can only purge channels that are assigned to a monitor."
            await interaction.response.send_message(err_msg, ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)
        
        # 0. Bot Permission Check
        bot_member = interaction.guild.me
        if not target_channel.permissions_for(bot_member).manage_messages:
            err_msg = self.bot.get_feedback("purge_error", error="Bot Missing 'Manage Messages' Permission", guild_id=interaction.guild_id)
            await interaction.followup.send(err_msg, ephemeral=True)
            return

        try:
            # Send immediate response as it might take time
            await interaction.followup.send(self.bot.get_feedback("purge_started", channel=target_channel.name, guild_id=interaction.guild_id), ephemeral=True)

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

    @app_commands.command(name="dashboard", description="Manage your bot settings and monitors")
    async def show_dashboard(self, interaction: discord.Interaction):
        """Sends a link to the web dashboard and support server."""
        await interaction.response.defer(ephemeral=True)
        
        from core.ui_layouts import generate_dashboard_layout
        layout = generate_dashboard_layout(self.bot, interaction.guild_id)
        
        await interaction.followup.send(view=layout, ephemeral=True)

async def setup(bot):
    await bot.add_cog(AdminCog(bot))

