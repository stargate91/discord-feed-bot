import feedparser
import aiohttp
import discord
import asyncio
import re
from core.base_monitor import BaseMonitor
from logger import log
import database

# Standard browser User-Agent to avoid being blocked
REDDIT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


async def fetch_reddit_rss(url):
    """Fetch Reddit RSS with the over18 cookie to bypass NSFW age gates."""
    cookies = {"over18": "1"}
    headers = {"User-Agent": REDDIT_USER_AGENT}
    async with aiohttp.ClientSession(cookies=cookies) as session:
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                log.error(f"Reddit RSS returned status {response.status} for {url}")
                return None
            raw = await response.text()
            return feedparser.parse(raw)


class RedditMonitor(BaseMonitor):
    """Monitor for new posts in a given subreddit via Reddit's public RSS feed."""

    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.subreddit = config.get("subreddit", "")
        self.sort = config.get("sort", "new")  # new, hot, top
        # old.reddit.com is far less aggressive with IP blocking than www.reddit.com
        self.rss_url = f"https://old.reddit.com/r/{self.subreddit}/.rss?sort={self.sort}"
        self.is_first_run = True

    def get_shared_key(self):
        return f"reddit_rss:{self.subreddit}:{self.sort}"

    async def check_for_updates(self):
        """Fetch Reddit RSS feed and look for new posts."""
        if not self.subreddit:
            log.warning(f"No subreddit configured for monitor: {self.name}")
            return

        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            feed = shared_data
        else:
            try:
                feed = await fetch_reddit_rss(self.rss_url)
                if feed and hasattr(feed, 'entries') and feed.entries:
                    self.bot.monitor_manager.set_shared_data(self.get_shared_key(), feed)
            except Exception as e:
                log.error(f"Error fetching Reddit RSS for r/{self.subreddit}: {e}")
                return

        if not feed or not hasattr(feed, 'entries') or not feed.entries:
            return

        new_entries = []
        for entry in reversed(feed.entries):
            entry_id = entry.get("id", "")
            if not entry_id:
                continue

            db_id = f"reddit_{entry_id.split('/')[-1]}" if "/" in entry_id else f"reddit_{entry_id}"

            if not await database.is_published(db_id, "reddit"):
                if self.is_first_run:
                    log.debug(f"Seeding Reddit RSS post: {entry.get('title', '')[:60]}")
                    await database.mark_as_published(db_id, "reddit", self.rss_url)
                else:
                    new_entries.append(entry)
                    log.info(f"New Reddit post detected (RSS): {entry.get('title', '')[:60]}")

        for entry in new_entries:
            entry_id = entry.get("id", "")
            db_id = f"reddit_{entry_id.split('/')[-1]}" if "/" in entry_id else f"reddit_{entry_id}"

            title = entry.get("title", "New Reddit Post")[:256]
            link = entry.get("link", "")
            author = entry.get("author", "Unknown")
            subreddit_name = f"r/{self.subreddit}"

            embed = discord.Embed(
                title=title,
                url=link,
                color=self.get_color(0xFF4500)  # Reddit Orange
            )
            embed.set_author(name=subreddit_name)

            # RSS Thumbnail handling
            image_url = self._extract_image(entry)
            if image_url:
                embed.set_image(url=image_url)

            embed.set_footer(text=f"{author} • Reddit")

            alert_text = self.get_alert_message({
                "name": subreddit_name,
                "title": title,
                "url": link,
                "author": author
            })

            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_reddit", guild_id=self.guild_id)
            view.add_item(
                discord.ui.Button(
                    label=btn_label, url=link, style=discord.ButtonStyle.link
                )
            )

            await self.send_update(
                content=f"{alert_text}\n{link}", embed=embed, view=view
            )
            await database.mark_as_published(db_id, "reddit", self.rss_url)

        if self.is_first_run:
            log.info(f"Initial seed completed for Reddit RSS r/{self.subreddit}. Monitoring active.")
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent post from the subreddit via RSS."""
        if not self.subreddit:
            return None

        try:
            feed = await fetch_reddit_rss(self.rss_url)
        except Exception as e:
            log.error(f"Manual check failed for Reddit RSS {self.name}: {e}")
            return None

        if not feed or not hasattr(feed, 'entries') or not feed.entries:
            log.warning(f"No entries found in Reddit RSS for r/{self.subreddit}. URL: {self.rss_url}")
            return {"empty": True}

        entry = feed.entries[0]
        title = entry.get("title", "New Reddit Post")[:256]
        link = entry.get("link", "")
        author = entry.get("author", "Unknown")
        subreddit_name = f"r/{self.subreddit}"

        embed = discord.Embed(
            title=title,
            url=link,
            color=self.get_color(0xFF4500),
        )
        embed.set_author(name=subreddit_name)

        image_url = self._extract_image(entry)
        if image_url:
            embed.set_image(url=image_url)

        embed.set_footer(text=f"{author} • Reddit")

        alert_text = self.bot.get_feedback("new_reddit_alert", guild_id=self.guild_id)
        ping = f"{self.ping_role} " if self.ping_role else ""

        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_reddit", guild_id=self.guild_id)
        view.add_item(
            discord.ui.Button(
                label=btn_label, url=link, style=discord.ButtonStyle.link
            )
        )

        return {
            "content": f"{ping}{alert_text}\n{link}",
            "embed": embed,
            "view": view,
        }

    @staticmethod
    def _extract_image(entry):
        """Extract thumbnail/image URL from an RSS entry."""
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            return entry.media_thumbnail[0]["url"]
        if hasattr(entry, 'content'):
            content_value = entry.content[0].get('value', '')
            img_match = re.search(r'<img [^>]*src="([^"]+)"', content_value)
            if img_match:
                return img_match.group(1)
        return None
