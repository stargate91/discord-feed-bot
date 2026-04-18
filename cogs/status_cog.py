import discord
import random
import asyncio
from discord.ext import commands, tasks
from discord import app_commands
from logger import log
import database

class StatusCog(commands.Cog, name="status"):
    def __init__(self, bot):
        self.bot = bot
        self.current_index = 0
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
            
            log.debug(f"Rotating presence... Monitors found: {monitor_count}, DB Statuses: {len(db_statuses)}")
            
            if db_statuses:
                mode = await database.get_bot_setting("status_rotation_mode", "random")
                
                if mode == "sequential":
                    if self.current_index >= len(db_statuses):
                        self.current_index = 0
                    status_obj = db_statuses[self.current_index]
                    self.current_index = (self.current_index + 1) % len(db_statuses)
                else:
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
                statuses = self.bot.language_data.get("dynamic_status", ["{count} feeds"])
                
                mode = await database.get_bot_setting("status_rotation_mode", "random")
                if mode == "sequential":
                    if self.current_index >= len(statuses):
                        self.current_index = 0
                    status_text = statuses[self.current_index].replace("{count}", str(monitor_count))
                    self.current_index = (self.current_index + 1) % len(statuses)
                else:
                    status_text = random.choice(statuses).replace("{count}", str(monitor_count))
                    
                activity_type = discord.ActivityType.watching
            
            log.info(f"Setting presence to: {activity_type.name} {status_text}")
            activity = discord.Activity(type=activity_type, name=status_text)
            await self.bot.change_presence(activity=activity, status=discord.Status.online)
            
            # Update loop interval based on config
            new_interval = int(await database.get_bot_setting("presence_interval_seconds", self.bot.config.get("presence_interval_seconds", 60)))
            if self.status_rotation.seconds != new_interval:
                log.debug(f"Changing presence rotation interval to {new_interval}s")
                self.status_rotation.change_interval(seconds=new_interval)

        except Exception as e:
            log.error(f"Error in status_rotation task: {e}", exc_info=True)



async def setup(bot):
    await bot.add_cog(StatusCog(bot))
