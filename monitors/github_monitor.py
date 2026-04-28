import discord
import aiohttp
from core.base_monitor import BaseMonitor
from logger import log
import database as db
import asyncio
from datetime import datetime, timezone

class GitHubMonitor(BaseMonitor):
    def __init__(self, bot, config):
        super().__init__(bot, config)
        raw_path = config.get("repo_path") or config.get("repo")  # owner/repo or url
        
        # Handle full URL input
        if isinstance(raw_path, str) and "github.com/" in raw_path:
            try:
                parts = raw_path.split("github.com/")[-1].strip("/").split("/")
                self.repo_path = f"{parts[0]}/{parts[1]}"
            except Exception:
                self.repo_path = raw_path
        else:
            self.repo_path = raw_path
            
        self.api_url = f"https://api.github.com/repos/{self.repo_path}/releases"

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
        
        token = self.bot.config.get("github_token")
        if token:
            headers["Authorization"] = f"Bearer {token}"
            log.debug(f"Using GitHub token for {self.repo_path}")
        
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

    async def fetch_new_items(self):
        """Check for new GitHub releases."""
        if not self.repo_path:
            return []

        releases = await self.fetch_releases()
        if not releases:
            return []

        # Process in reverse chronological order (oldest first)
        all_candidates = []
        for release in releases:
            release_id = str(release.get("id"))
            if not release_id: continue
            
            all_candidates.append(release)

        return list(reversed(all_candidates))

    async def process_item(self, release):
        formatted = self._format_release(release)
        await self.send_update(
            content=formatted["content"],
            embed=formatted["embed"],
            view=formatted["view"]
        )

    def get_item_id(self, release):
        return str(release.get("id"))

    async def mark_items_published(self, items):
        for release in items:
            release_id = self.get_item_id(release)
            if release_id != "None":
                title = release.get("name") or release.get("tag_name") or "New Release"
                author = release.get("author", {}).get("login", "Unknown")
                await db.mark_as_published(
                    release_id, "github", self.api_url,
                    guild_id=self.guild_id,
                    title=f"{self.repo_path}: {title}",
                    author_name=author
                )

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
        """Helper to format a GitHub release into standard output mapping using V2 Components."""
        tag_name = release.get("tag_name", "Unknown")
        name = release.get("name") or tag_name
        html_url = release.get("html_url")
        body = release.get("body", "")
        published_at = release.get("published_at")
        author = release.get("author", {}).get("login", "Unknown")
        
        # Truncate body if needed
        if len(body) > 1000:
            body = body[:997] + "..."
            
        alert_text = self.get_alert_message({
            "name": self.repo_path,
            "title": name,
            "url": html_url,
            "author": author
        })
        
        ts = None
        if published_at:
            try:
                # published_at format: 2024-04-18T12:34:56Z
                dt = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
                ts = int(dt.replace(tzinfo=timezone.utc).timestamp())
            except:
                pass
                
        from core.ui_layouts import generate_github_layout
        content, layout = generate_github_layout(
            bot=self.bot,
            guild_id=self.guild_id,
            alert_text=alert_text,
            repo_name=self.repo_path,
            title=name,
            url=html_url,
            description=body,
            author=author,
            published_ts=ts,
            accent_color=self.get_color(0x24292e),
            image_url=self.get_image_url()
        )
        
        return {
            "content": content,
            "embed": None,
            "view": layout
        }
