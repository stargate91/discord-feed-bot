import discord
import random
import asyncio
from discord.ext import commands, tasks
from discord import app_commands
from ui.views.wizard_views import StatusWizardView
from logger import log
import database

class StatusCog(commands.GroupCog, name="status"):
    def __init__(self, bot):
        self.bot = bot
        super().__init__()
        self.status_rotation.start()

    def cog_unload(self):
        self.status_rotation.cancel()

    @tasks.loop(seconds=60)
    async def status_rotation(self):
        """Periodically update the bot's rich presence."""
        if not self.bot.is_ready():
            return

        try:
            # Get current monitor count
            monitor_count = len(self.bot.monitor_manager.monitors) if self.bot.monitor_manager else 0
            
            # Fetch from DB
            db_statuses = await database.get_bot_statuses()
            
            if db_statuses:
                status_obj = random.choice(db_statuses)
                status_text = status_obj["text"].replace("{count}", str(monitor_count))
                s_type = status_obj["type"].lower()
                
                type_map = {
                    "playing": discord.ActivityType.playing,
                    "watching": discord.ActivityType.watching,
                    "listening": discord.ActivityType.listening,
                    "streaming": discord.ActivityType.streaming,
                    "competing": discord.ActivityType.competing
                }
                activity_type = type_map.get(s_type, discord.ActivityType.watching)
            else:
                # Fallback to language file
                statuses = self.bot.language_data.get("dynamic_status", ["Watching {count} feed(s)"])
                status_text = random.choice(statuses).replace("{count}", str(monitor_count))
                activity_type = discord.ActivityType.watching
            
            activity = discord.Activity(type=activity_type, name=status_text)
            await self.bot.change_presence(activity=activity, status=discord.Status.online)
            
            # Update loop interval based on config
            new_interval = self.bot.config.get("presence_interval_seconds", 60)
            if self.status_rotation.seconds != new_interval:
                self.status_rotation.change_interval(seconds=new_interval)

        except Exception as e:
            log.error(f"Error in status_rotation task: {e}")

    @app_commands.command(name="manage", description="Bot státusz vezérlőpult megnyitása")
    async def status_manage(self, interaction: discord.Interaction):
        """[Master Admin Only] Open the status management wizard."""
        master_guilds = self.bot.config.get("master_guild_ids", [])
        if interaction.guild_id not in master_guilds:
            await interaction.response.send_message(self.bot.get_feedback("error_master_only", guild_id=interaction.guild_id), ephemeral=True)
            return

        if not self.bot.is_master_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
            
        view = StatusWizardView(self.bot)
        statuses = await database.get_bot_statuses()
        view.update_components(statuses)
        embed = await view.create_embed()
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

async def setup(bot):
    await bot.add_cog(StatusCog(bot))
