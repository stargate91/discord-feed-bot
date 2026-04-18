import discord
import aiohttp
from core.base_monitor import BaseMonitor
from logger import log
import database
import asyncio
from datetime import datetime

class GitHubMonitor(BaseMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.repo_path = config.get("repo_path")  # owner/repo
        self.api_url = f"https://api.github.com/repos/{self.repo_path}/releases"
        self.is_first_run = True

    def get_shared_key(self):
        return f"github:{self.repo_path}"

    async def fetch_releases(self):
        """Fetch releases from GitHub API."""
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            return shared_data

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Discord-Feed-Bot"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.bot.monitor_manager.set_shared_data(self.get_shared_key(), data)
                        return data
                    elif response.status == 404:
                        log.warning(f"GitHub repository not found: {self.repo_path}")
                        return []
                    else:
                        log.error(f"GitHub API error for {self.repo_path}: {response.status}")
                        return []
        except Exception as e:
            log.error(f"Failed to fetch GitHub releases for {self.repo_path}: {e}")
            return []

    async def check_for_updates(self):
        """Check for new GitHub releases."""
        if not self.repo_path:
            return

        releases = await self.fetch_releases()
        if not releases:
            return

        # Process in reverse chronological order (oldest first)
        new_releases = []
        for release in reversed(releases):
            release_id = str(release.get("id"))
            if not release_id:
                continue

            if not await database.is_published(release_id, "github"):
                if self.is_first_run:
                    log.debug(f"Seeding database with existing GitHub release: {release_id}")
                    await database.mark_as_published(release_id, "github", self.api_url)
                else:
                    new_releases.append(release)
        
        for release in new_releases:
            formatted = self._format_release(release)
            await self.send_update(
                content=formatted["content"],
                embed=formatted["embed"],
                view=formatted["view"]
            )
            await database.mark_as_published(str(release.get("id")), "github", self.api_url)

        if self.is_first_run:
            self.is_first_run = False

    async def get_latest_item(self):
        items = await self.get_latest_items(1)
        return items[0] if items else None

    async def get_latest_items(self, count=1):
        releases = await self.fetch_releases()
        if not releases:
            return [{"empty": True}]
        
        # Newest are first in GitHub API, take top N and reverse for chronological order
        latest = releases[:count]
        latest.reverse()
        
        results = []
        for release in latest:
            results.append(self._format_release(release))
        return results

    def _format_release(self, release):
        """Helper to format a GitHub release into standard output mapping."""
        tag_name = release.get("tag_name", "Unknown")
        name = release.get("name") or tag_name
        html_url = release.get("html_url")
        body = release.get("body", "")
        published_at = release.get("published_at")
        author = release.get("author", {}).get("login", "Unknown")
        
        # Truncate body if needed
        if len(body) > 1000:
            body = body[:997] + "..."
            
        embed = discord.Embed(
            title=f"{self.repo_path} - {name}",
            url=html_url,
            description=body,
            color=self.get_color(0x24292e)  # GitHub Dark Grey
        )
        
        if published_at:
            try:
                # published_at format: 2024-04-18T12:34:56Z
                dt = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
                embed.timestamp = dt
                ts = int(dt.timestamp())
                embed.add_field(name=self.bot.get_feedback("field_published_at", guild_id=self.guild_id), value=f"<t:{ts}:f> (<t:{ts}:R>)", inline=False)
            except:
                pass
                
        embed.set_author(name=author)
        embed.set_footer(text=self.bot.get_feedback("footer_github", guild_id=self.guild_id))
        
        alert_text = self.get_alert_message({
            "name": self.repo_path,
            "title": name,
            "url": html_url
        })
        
        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_github", guild_id=self.guild_id)
        view.add_item(discord.ui.Button(label=btn_label, url=html_url, style=discord.ButtonStyle.link))
        
        return {
            "content": alert_text,
            "embed": embed,
            "view": view
        }
