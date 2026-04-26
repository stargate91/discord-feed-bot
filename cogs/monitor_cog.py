import discord
from discord.ext import commands
from discord import app_commands
from logger import log
import database
from core.emojis import (
    STATUS_SUCCESS, STATUS_ERROR
)

class MonitorCog(commands.GroupCog, name="monitor"):
    def __init__(self, bot):
        self.bot = bot
        super().__init__()

    # Monitor configuration moved to web dashboard
    # add, edit, remove, list, start, stop commands removed

    @app_commands.command(name="check", description="Manual check and send the latest content")
    @app_commands.describe(monitor_name="Which feed should the bot check?")
    async def monitor_check(self, interaction: discord.Interaction, monitor_name: str):
        """[Admin] Manually fetches and sends the latest entry from a feed."""
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        target_monitor = None
        if self.bot.monitor_manager:
            for m in self.bot.monitor_manager.monitors:
                if m.name == monitor_name:
                    m_guild_id = getattr(m, 'guild_id', 0)
                    if m_guild_id == interaction.guild_id:
                        target_monitor = m
                        break
                    elif m_guild_id == 0:
                        target_monitor = m
        
        if not target_monitor:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found", guild_id=interaction.guild_id), ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)
        try:
            data = await target_monitor.get_latest_item()
            if data:
                if data.get("empty"):
                    platform = getattr(target_monitor, "platform", "unknown")
                    msg_key = f"check_empty_{platform}"
                    # Fallback to generic if specific not found
                    if self.bot.get_feedback(msg_key, guild_id=interaction.guild_id) == msg_key:
                        msg_key = "check_no_active_offers"
                    await interaction.followup.send(self.bot.get_feedback(msg_key, name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)
                else:
                    view = data.get("view")
                    content = data.get("content")
                    embed = data.get("embed")
                    
                    # Detect V2 LayoutView
                    is_v2 = view and (hasattr(view, "_is_v2") or type(view).__name__ == "LayoutView")
                    
                    if is_v2 and content:
                        # Message 1: Alert Text
                        await interaction.followup.send(content=content, ephemeral=True, suppress_embeds=True)
                        # Message 2: V2 Layout
                        await interaction.followup.send(view=view, ephemeral=True)
                    else:
                        await interaction.followup.send(content=content, embed=embed, view=view, ephemeral=True)

                    await interaction.followup.send(self.bot.get_feedback("check_success", name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)
            else:
                await interaction.followup.send(self.bot.get_feedback("error_no_content", name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)
        except Exception as e:
            log.error(f"Error in /check command for {monitor_name}: {e}", exc_info=True)
            await interaction.followup.send(self.bot.get_feedback("error_monitor_check", error=str(e), guild_id=interaction.guild_id), ephemeral=True)

    @app_commands.command(name="repost", description="Resend the latest items to the original channel")
    @app_commands.describe(monitor_name="Which monitor's feed should be reposted?", count="Number of items to repost (1-10)")
    async def monitor_repost(self, interaction: discord.Interaction, monitor_name: str, count: int = 1):
        """[Admin] Resends the last N items to the monitor's original channel."""
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
            
        guild_id = interaction.guild_id or 0
        if not self.bot.has_feature(guild_id, "repost"):
            embed = discord.Embed(
                title="✨ Nova Premium",
                description=self.bot.get_feedback("error_premium_only_repost", guild_id=guild_id),
                color=0x7b2cbf
            )
            view = discord.ui.View()
            btn_label, btn_emoji = self.bot.parse_emoji_text(self.bot.get_feedback("btn_web_dashboard", guild_id=guild_id))
            view.add_item(discord.ui.Button(
                label=btn_label, 
                emoji=btn_emoji, 
                url="https://novafeeds.xyz/premium", 
                style=discord.ButtonStyle.link
            ))
            await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
            return

        count = max(1, min(count, 10))
        target_monitor = None
        if self.bot.monitor_manager:
            for m in self.bot.monitor_manager.monitors:
                if m.name == monitor_name:
                    m_guild_id = getattr(m, 'guild_id', 0)
                    if m_guild_id == interaction.guild_id:
                        target_monitor = m
                        break
                    elif m_guild_id == 0:
                        target_monitor = m
        
        if not target_monitor:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found", guild_id=interaction.guild_id), ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)
        try:
            import asyncio
            items = await target_monitor.get_latest_items(count)
            
            if not items:
                await interaction.followup.send(self.bot.get_feedback("error_no_content", name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)
                return

            sent_count = 0
            for item in items:
                if not item: continue
                
                # Check if item explicitly marked as empty (e.g., no active giveaways)
                if item.get("empty"):
                    continue
                    
                await target_monitor.send_update(
                    content=item.get("content"),
                    embed=item.get("embed"),
                    view=item.get("view")
                )
                sent_count += 1
                await asyncio.sleep(1.0) # Rate limit protection for reposts
            
            if sent_count > 0:
                await interaction.followup.send(self.bot.get_feedback("repost_success", count=sent_count, name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)
            else:
                # If we have items but all were 'empty'
                platform = getattr(target_monitor, "platform", "unknown")
                msg_key = f"check_empty_{platform}"
                if self.bot.get_feedback(msg_key, guild_id=interaction.guild_id) == msg_key:
                    msg_key = "check_no_active_offers"
                await interaction.followup.send(self.bot.get_feedback(msg_key, name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)
            
        except Exception as e:
            log.error(f"Error in /repost command for {monitor_name}: {e}", exc_info=True)
            await interaction.followup.send(self.bot.get_feedback("error_monitor_check", error=str(e), guild_id=interaction.guild_id), ephemeral=True)

    @app_commands.command(name="preview", description="Preview how alerts look for a monitor")
    @app_commands.describe(monitor_name="Which monitor should be previewed?")
    async def monitor_preview(self, interaction: discord.Interaction, monitor_name: str):
        """[Admin] Shows a sample/mock preview of an alert from the monitor."""
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
            
        target_monitor = None
        if self.bot.monitor_manager:
            for m in self.bot.monitor_manager.monitors:
                if m.name == monitor_name:
                    m_guild_id = getattr(m, 'guild_id', 0)
                    if m_guild_id == interaction.guild_id:
                        target_monitor = m
                        break
                    elif m_guild_id == 0:
                        target_monitor = m
        
        if not target_monitor:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found", guild_id=interaction.guild_id), ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)
        try:
            previews = await target_monitor.get_preview()
            if not previews:
                await interaction.followup.send(self.bot.get_feedback("error_no_content", name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)
                return
                
            for i, p_data in enumerate(previews):
                view = p_data.get("view")
                content = p_data.get("content")
                embed = p_data.get("embed")
                
                is_v2 = view and (hasattr(view, "_is_v2") or type(view).__name__ == "LayoutView")
                
                if is_v2 and content:
                    await interaction.followup.send(content=content, ephemeral=True, suppress_embeds=True)
                    await interaction.followup.send(view=view, ephemeral=True)
                else:
                    await interaction.followup.send(content=content, embed=embed, view=view, ephemeral=True)

            
            await interaction.followup.send(self.bot.get_feedback("preview_success", name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)
        except Exception as e:
            log.error(f"Error in /preview command for {monitor_name}: {e}", exc_info=True)
            await interaction.followup.send(self.bot.get_feedback("error_monitor_check", error=str(e), guild_id=interaction.guild_id), ephemeral=True)


    # Autocomplete remains for check/repost/preview commands

    # --- Autocomplete Helpers ---
    async def _monitor_name_autocomplete(self, interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
        choices = []
        guild_id = interaction.guild_id or 0
        
        # Get monitors for this guild from DB (more reliable than manager for all types)
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        
        for m_cfg in monitors_cfg:
            name = m_cfg.get("name", "")
            if current.lower() in name.lower():
                choices.append(app_commands.Choice(name=name, value=name))
                
        return choices[:25]

    @monitor_check.autocomplete("monitor_name")
    @monitor_repost.autocomplete("monitor_name")
    @monitor_preview.autocomplete("monitor_name")
    async def monitor_name_autocomplete_wrapper(self, interaction: discord.Interaction, current: str):
        return await self._monitor_name_autocomplete(interaction, current)

async def setup(bot):
    await bot.add_cog(MonitorCog(bot))
