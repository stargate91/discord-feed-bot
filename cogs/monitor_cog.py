import discord
from discord.ext import commands
from discord import app_commands
from ui.views.wizard_views import AddMonitorWizardView, EditMonitorWizardView
from logger import log
import database

class MonitorCog(commands.GroupCog, name="monitor"):
    def __init__(self, bot):
        self.bot = bot
        super().__init__()

    @app_commands.command(name="add", description="Új monitor hozzáadása a rendszerhez")
    async def monitor_add(self, interaction: discord.Interaction):
        """[Admin] Megnyitja a monitor varázslót új feed-ek beállításához."""
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
            
        view = AddMonitorWizardView(self.bot, interaction)
        msg = self.bot.get_feedback("ui_monitor_add_msg")
        await interaction.response.send_message(msg, view=view, ephemeral=True)

    @app_commands.command(name="check", description="Manuális ellenőrzés és legutóbbi tartalom küldése")
    @app_commands.describe(monitor_name="Melyik feed-et ellenőrizze a bot?")
    async def monitor_check(self, interaction: discord.Interaction, monitor_name: str):
        """[Admin] Manuálisan lekéri és elküldi a legfrissebb bejegyzést egy feed-ből."""
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        target_monitor = None
        if self.bot.monitor_manager:
            for m in self.bot.monitor_manager.monitors:
                if m.name == monitor_name:
                    target_monitor = m
                    break
        
        if not target_monitor:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found"), ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)
        try:
            data = await target_monitor.get_latest_item()
            if data:
                if data.get("empty"):
                    await interaction.followup.send(self.bot.get_feedback("check_no_active_offers", name=monitor_name), ephemeral=True)
                else:
                    await interaction.followup.send(content=data.get("content"), embed=data.get("embed"), view=data.get("view"), ephemeral=True)
                    await interaction.followup.send(self.bot.get_feedback("check_success", name=monitor_name), ephemeral=True)
            else:
                await interaction.followup.send(self.bot.get_feedback("error_no_content", name=monitor_name), ephemeral=True)
        except Exception as e:
            log.error(f"Error in /check command for {monitor_name}: {e}", exc_info=True)
            await interaction.followup.send(f"Hiba történt: {e}", ephemeral=True)

    @monitor_check.autocomplete("monitor_name")
    async def monitor_autocomplete(self, interaction: discord.Interaction, current: str):
        choices = []
        if self.bot.monitor_manager:
            for m in self.bot.monitor_manager.monitors:
                if current.lower() in m.name.lower():
                    choices.append(app_commands.Choice(name=m.name, value=m.name))
        return choices[:25]

    @app_commands.command(name="list", description="Aktív és inaktív monitorok listázása")
    async def monitor_list(self, interaction: discord.Interaction):
        """[Admin] List all configured monitors with their status."""
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        
        if not monitors_cfg:
            await interaction.response.send_message(self.bot.get_feedback("list_monitors_empty"), ephemeral=True)
            return
        
        embed = discord.Embed(title=self.bot.get_feedback("list_monitors_title"), color=0x5865F2)
        type_emojis = {"youtube": "📺", "rss": "🔗", "tiktok": "🎵", "instagram": "📸", "epic_games": "🎮", "steam_free": "♨️", "gog_free": "💜", "reddit": "🟠", "twitter": "🐦", "stream": "📡"}
        
        for m_cfg in monitors_cfg:
            m_type = m_cfg.get("type", "unknown")
            emoji = type_emojis.get(m_type, "❓")
            status = "✅" if m_cfg.get("enabled", True) else "❌"
            embed.add_field(name=f"{emoji} {m_cfg.get('name', '??')}", value=f"{status} `{m_type}` • <#{m_cfg.get('discord_channel_id', 0)}>", inline=False)
        
        embed.set_footer(text=self.bot.get_feedback("list_monitors_footer", count=len(monitors_cfg)))
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="stop", description="Létező monitor felfüggesztése")
    @app_commands.describe(monitor_name="Melyik monitort szüneteltessük?")
    async def monitor_stop(self, interaction: discord.Interaction, monitor_name: str):
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        target = next((m for m in monitors_cfg if m.get("name") == monitor_name), None)
        
        if not target:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found"), ephemeral=True)
            return
            
        await database.update_monitor_status(target["id"], guild_id, False)
        if self.bot.monitor_manager:
            for m in self.bot.monitor_manager.monitors:
                if m.name == monitor_name and getattr(m, 'guild_id', None) == guild_id:
                    m.enabled = False
        await interaction.response.send_message(self.bot.get_feedback("ui_monitor_stop_msg", name=monitor_name), ephemeral=True)

    @monitor_stop.autocomplete("monitor_name")
    async def stop_autocomplete(self, interaction: discord.Interaction, current: str):
        choices = []
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        for m_cfg in monitors_cfg:
            if m_cfg.get("enabled", True) and current.lower() in m_cfg.get("name", "").lower():
                choices.append(app_commands.Choice(name=m_cfg.get("name"), value=m_cfg.get("name")))
        return choices[:25]

    @app_commands.command(name="start", description="Felfüggesztett monitor újraindítása")
    async def monitor_start(self, interaction: discord.Interaction, monitor_name: str):
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        target = next((m for m in monitors_cfg if m.get("name") == monitor_name), None)
        
        if not target:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found"), ephemeral=True)
            return
            
        await database.update_monitor_status(target["id"], guild_id, True)
        if self.bot.monitor_manager:
            for m in self.bot.monitor_manager.monitors:
                if m.name == monitor_name and getattr(m, 'guild_id', None) == guild_id:
                    m.enabled = True
        await interaction.response.send_message(self.bot.get_feedback("ui_monitor_restart_msg", name=monitor_name), ephemeral=True)

    @monitor_start.autocomplete("monitor_name")
    async def start_autocomplete(self, interaction: discord.Interaction, current: str):
        choices = []
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        for m_cfg in monitors_cfg:
            if not m_cfg.get("enabled", True) and current.lower() in m_cfg.get("name", "").lower():
                choices.append(app_commands.Choice(name=m_cfg.get("name"), value=m_cfg.get("name")))
        return choices[:25]

    @app_commands.command(name="remove", description="Monitor eltávolítása a rendszerből")
    async def monitor_remove(self, interaction: discord.Interaction, monitor_name: str):
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        target = next((m for m in monitors_cfg if m.get("name") == monitor_name), None)
        
        if not target:
            await interaction.response.send_message(self.bot.get_feedback("remove_monitor_not_found", name=monitor_name), ephemeral=True)
            return
        
        await database.remove_monitor(target["id"], guild_id)
        if self.bot.monitor_manager:
            self.bot.monitor_manager.monitors = [m for m in self.bot.monitor_manager.monitors if m.name != monitor_name or getattr(m, 'guild_id', None) != guild_id]
        
        await interaction.response.send_message(self.bot.get_feedback("remove_monitor_success", name=monitor_name, type=target.get('type','?')), ephemeral=True)

    @monitor_remove.autocomplete("monitor_name")
    async def remove_autocomplete(self, interaction: discord.Interaction, current: str):
        try:
            choices = []
            guild_id = interaction.guild_id or 0
            if guild_id == 0:
                return []
                
            monitors_cfg = await database.get_monitors_for_guild(guild_id)
            for m_cfg in monitors_cfg:
                name = m_cfg.get("name", "")
                if current.lower() in name.lower():
                    choices.append(app_commands.Choice(name=name, value=name))
            return choices[:25]
        except Exception as e:
            log.error(f"Error in remove_autocomplete: {e}")
            return []

    @app_commands.command(name="edit", description="Létező monitor szerkesztése")
    async def monitor_edit(self, interaction: discord.Interaction, monitor_name: str):
        if not self.bot.is_bot_admin(interaction.user):
            await interaction.response.send_message(self.bot.get_feedback("error_no_permission", guild_id=interaction.guild_id), ephemeral=True)
            return
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        target = next((m for m in monitors_cfg if m.get("name") == monitor_name), None)
        
        if not target:
            await interaction.response.send_message(self.bot.get_feedback("error_monitor_not_found"), ephemeral=True)
            return
            
        view = EditMonitorWizardView(self.bot, target["id"], monitor_name, current_color=target.get("embed_color", ""), interaction=interaction)
        await interaction.response.send_message(self.bot.get_feedback("ui_monitor_edit_title", name=monitor_name), view=view, ephemeral=True)

    @monitor_edit.autocomplete("monitor_name")
    async def edit_autocomplete(self, interaction: discord.Interaction, current: str):
        choices = []
        guild_id = interaction.guild_id or 0
        monitors_cfg = await database.get_monitors_for_guild(guild_id)
        for m_cfg in monitors_cfg:
            if current.lower() in m_cfg.get("name", "").lower():
                choices.append(app_commands.Choice(name=m_cfg.get("name"), value=m_cfg.get("name")))
        return choices[:25]

async def setup(bot):
    await bot.add_cog(MonitorCog(bot))
