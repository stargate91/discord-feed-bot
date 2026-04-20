import discord
from discord.ext import commands
from discord import app_commands
from ui.views.wizard_views import AddMonitorWizardLayout, EditMonitorWizardLayout
from logger import log
import database
from core.emojis import (
    TYPE_YOUTUBE, TYPE_RSS,
    TYPE_EPIC, TYPE_STEAM, TYPE_GOG,
    TYPE_STREAM, TYPE_TMDB_MOVIE, TYPE_TMDB_TV,
    TYPE_CRYPTO, TYPE_GITHUB, TYPE_UNKNOWN,
    STATUS_SUCCESS, STATUS_ERROR
)

class MonitorCog(commands.GroupCog, name="monitor"):
    def __init__(self, bot):
        self.bot = bot
        super().__init__()

    @app_commands.command(name="add", description="Add a new monitor to the system")
    async def monitor_add(self, interaction: discord.Interaction):
        """[Admin] Opens the monitor wizard to configure new feeds."""
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
            
        # Tier Limit Check
        guild_id = interaction.guild_id or 0
        _, _, _, max_monitors, _, _ = self.bot.get_guild_tier_limits(guild_id)
        current_monitors = await database.get_monitors_for_guild(guild_id)
        
        if len(current_monitors) >= max_monitors:
            await interaction.response.send_message(self.bot.get_feedback("error_premium_limit_monitors", limit=max_monitors, guild_id=guild_id), ephemeral=True)
            return

        view = AddMonitorWizardLayout(self.bot, interaction)
        await interaction.response.send_message(view=view, ephemeral=True)

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
                    send_kwargs = {
                        "content": data.get("content"),
                        "embed": data.get("embed"),
                        "ephemeral": True
                    }
                    if data.get("view"):
                        send_kwargs["view"] = data.get("view")
                        
                    await interaction.followup.send(**send_kwargs)
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
            await interaction.response.send_message(self.bot.get_feedback("error_premium_only_repost", guild_id=guild_id), ephemeral=True)
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


    @app_commands.command(name="list", description="List active and inactive monitors")
    async def monitor_list(self, interaction: discord.Interaction):
        """[Admin] List all configured monitors with their status."""
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        
        if not monitors_cfg:
            await interaction.response.send_message(self.bot.get_feedback("list_monitors_empty", guild_id=interaction.guild_id), ephemeral=True)
            return
        
        type_emojis = {
            "youtube": TYPE_YOUTUBE,
            "rss": TYPE_RSS,
            "epic_games": TYPE_EPIC,
            "steam_free": TYPE_STEAM,
            "gog_free": TYPE_GOG,
            "stream": TYPE_STREAM,
            "steam_news": TYPE_STEAM,
            "movie": TYPE_TMDB_MOVIE,
            "tv_series": TYPE_TMDB_TV,
            "crypto": TYPE_CRYPTO,
            "github": TYPE_GITHUB
        }
        
        lines = []
        for m_cfg in monitors_cfg:
            m_type = m_cfg.get("type", "unknown")
            emoji = type_emojis.get(m_type, TYPE_UNKNOWN)
            
            status_key = "ui_status_enabled" if m_cfg.get("enabled", True) else "ui_status_disabled"
            status_text = self.bot.get_feedback(status_key, guild_id=guild_id)
            
            ch_str = " ".join([f"<#{c}>" for c in m_cfg.get("target_channels", [])])
            if not ch_str:
                ch_str = self.bot.get_feedback("ui_status_not_selected", guild_id=guild_id)
            lines.append(f"**{emoji} {m_cfg.get('name', '??')}**\n{status_text} • `{m_type}` • {ch_str}")
            
        pages_data = []
        chunk_size = 10
        for i in range(0, len(lines), chunk_size):
            pages_data.append("\n\n".join(lines[i:i+chunk_size]))
            
        from ui.views.list_views import MonitorListPaginatedView
        view = MonitorListPaginatedView(self.bot, guild_id, pages_data, len(monitors_cfg))
        await interaction.response.send_message(view=view, ephemeral=True)

    @app_commands.command(name="stop", description="Suspend an existing monitor")
    @app_commands.describe(monitor_name="Which monitor should be paused?")
    async def monitor_stop(self, interaction: discord.Interaction, monitor_name: str):
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        target = next((m for m in monitors_cfg if m.get("name") == monitor_name), None)
        
        if not target:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found", guild_id=interaction.guild_id), ephemeral=True)
            return
            
        await database.update_monitor_status(target["id"], guild_id, False)
        if self.bot.monitor_manager:
            for m in self.bot.monitor_manager.monitors:
                if m.name == monitor_name and getattr(m, 'guild_id', None) == guild_id:
                    m.enabled = False
        await interaction.response.send_message(self.bot.get_feedback("ui_monitor_stop_msg", name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)

    @app_commands.command(name="start", description="Restart a suspended monitor")
    @app_commands.describe(monitor_name="Which monitor should be restarted?")
    async def monitor_start(self, interaction: discord.Interaction, monitor_name: str):
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        target = next((m for m in monitors_cfg if m.get("name") == monitor_name), None)
        
        if not target:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found", guild_id=interaction.guild_id), ephemeral=True)
            return
            
        await database.update_monitor_status(target["id"], guild_id, True)
        if self.bot.monitor_manager:
            for m in self.bot.monitor_manager.monitors:
                if m.name == monitor_name and getattr(m, 'guild_id', None) == guild_id:
                    m.enabled = True
        await interaction.response.send_message(self.bot.get_feedback("ui_monitor_restart_msg", name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)

    @app_commands.command(name="remove", description="Remove a monitor from the system")
    @app_commands.describe(
        monitor_name="Which monitor should be removed?", 
        all_monitors="Remove ALL monitors for this server? (Premium Only)"
    )
    async def monitor_remove(self, interaction: discord.Interaction, monitor_name: str = None, all_monitors: bool = False):
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return

        guild_id = interaction.guild_id or 0

        # Handle Bulk Remove
        if all_monitors:
            if not self.bot.has_feature(guild_id, "bulk_delete"):
                await interaction.response.send_message(self.bot.get_feedback("error_premium_only_feature", guild_id=guild_id), ephemeral=True)
                return
            
            await database.remove_all_monitors(guild_id)
            if self.bot.monitor_manager:
                self.bot.monitor_manager.monitors = [m for m in self.bot.monitor_manager.monitors if getattr(m, 'guild_id', None) != guild_id]
            
            await interaction.response.send_message(self.bot.get_feedback("remove_all_monitors_success", guild_id=guild_id), ephemeral=True)
            return

        # Handle Single Remove
        if not monitor_name:
            await interaction.response.send_message(self.bot.get_feedback("error_remove_missing_target", guild_id=guild_id), ephemeral=True)
            return

        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        target = next((m for m in monitors_cfg if m.get("name") == monitor_name), None)
        
        if not target:
            await interaction.response.send_message(self.bot.get_feedback("remove_monitor_not_found", name=monitor_name, guild_id=interaction.guild_id), ephemeral=True)
            return
        
        await database.remove_monitor(target["id"], guild_id)
        if self.bot.monitor_manager:
            self.bot.monitor_manager.monitors = [m for m in self.bot.monitor_manager.monitors if m.name != monitor_name or getattr(m, 'guild_id', None) != guild_id]
        
        await interaction.response.send_message(self.bot.get_feedback("remove_monitor_success", name=monitor_name, type=target.get('type','?'), guild_id=interaction.guild_id), ephemeral=True)

    @app_commands.command(name="edit", description="Edit an existing monitor")
    @app_commands.describe(monitor_name="Which monitor should be edited?")
    async def monitor_edit(self, interaction: discord.Interaction, monitor_name: str):
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        target = next((m for m in monitors_cfg if m.get("name") == monitor_name), None)
        
        if not target:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found", guild_id=interaction.guild_id), ephemeral=True)
            return
            
        m_type = target.get("type", "unknown")
        current_genres = target.get("target_genres", [])
        steam_patch = target.get("steam_patch_only", None)
        
        from ui.views.wizard_views import EditMonitorWizardLayout
        view = EditMonitorWizardLayout(self.bot, target["id"], monitor_name, m_type, current_color=target.get("embed_color", ""), current_genres=current_genres, steam_patch_only=steam_patch, interaction=interaction)
        await interaction.response.send_message(view=view, ephemeral=True)

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
    @monitor_stop.autocomplete("monitor_name")
    @monitor_start.autocomplete("monitor_name")
    @monitor_remove.autocomplete("monitor_name")
    @monitor_edit.autocomplete("monitor_name")
    async def monitor_name_autocomplete_wrapper(self, interaction: discord.Interaction, current: str):
        return await self._monitor_name_autocomplete(interaction, current)

async def setup(bot):
    await bot.add_cog(MonitorCog(bot))
