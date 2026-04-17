import aiohttp
import discord
import re
from core.base_monitor import BaseMonitor
from logger import log
import database

# Pullpush API - a free, public Reddit data mirror that doesn't block VPS IPs
PULLPUSH_API_URL = "https://api.pullpush.io/reddit/search/submission/"
PULLPUSH_USER_AGENT = "Nova-FeedBot/2.0 (Discord Feed Monitor)"


class RedditMonitor(BaseMonitor):
    """Monitor for new posts in a given subreddit via Pullpush API (Reddit mirror)."""

    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.subreddit = config.get("subreddit", "")
        self.sort = config.get("sort", "new")  # new, hot, top
        self.limit = config.get("limit", 10)
        self.is_first_run = True

    def get_shared_key(self):
        return f"reddit:{self.subreddit}:{self.sort}"

    async def _fetch_posts(self, limit=None):
        """Fetch posts from Pullpush API."""
        if not self.subreddit:
            return None

        use_limit = limit or self.limit
        url = f"{PULLPUSH_API_URL}?subreddit={self.subreddit}&size={use_limit}&sort=desc&sort_type=created_utc"
        headers = {"User-Agent": PULLPUSH_USER_AGENT}

        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key()) if limit is None else None
        if shared_data:
            return shared_data

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status != 200:
                        log.error(f"Pullpush API returned {response.status} for r/{self.subreddit}")
                        return None
                    data = await response.json()
                    if data and limit is None:
                        self.bot.monitor_manager.set_shared_data(self.get_shared_key(), data)
                    return data
        except Exception as e:
            log.error(f"Error fetching Pullpush data for r/{self.subreddit}: {e}")
            return None

    async def check_for_updates(self):
        """Check for new posts in the subreddit."""
        if not self.subreddit:
            log.warning(f"No subreddit configured for monitor: {self.name}")
            return

        data = await self._fetch_posts()
        if not data:
            return

        posts = data.get("data", [])
        if not posts:
            return

        new_entries = []
        for post in reversed(posts):
            post_id = post.get("id", "")
            if not post_id:
                continue

            db_id = f"reddit_{post_id}"
            if not await database.is_published(db_id, "reddit"):
                if self.is_first_run:
                    log.debug(f"Seeding Reddit post: {post.get('title', '')[:60]}")
                    await database.mark_as_published(db_id, "reddit", f"r/{self.subreddit}")
                else:
                    new_entries.append(post)
                    log.info(f"New Reddit post detected: {post.get('title', '')[:60]}")

        for post in new_entries:
            embed, view, permalink = self._build_embed(post)

            alert_text = self.get_alert_message({
                "name": post.get("subreddit_name_prefixed", f"r/{self.subreddit}"),
                "title": post.get("title", ""),
                "url": permalink,
                "author": post.get("author", "Unknown")
            })

            await self.send_update(
                content=f"{alert_text}\n{permalink}", embed=embed, view=view
            )
            await database.mark_as_published(f"reddit_{post.get('id', '')}", "reddit", f"r/{self.subreddit}")

        if self.is_first_run:
            log.info(f"Initial seed completed for Reddit r/{self.subreddit}. Monitoring active.")
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent post from the subreddit."""
        if not self.subreddit:
            return None

        try:
            data = await self._fetch_posts(limit=1)
        except Exception as e:
            log.error(f"Manual check failed for Reddit r/{self.subreddit}: {e}")
            return None

        if not data:
            return None

        posts = data.get("data", [])
        if not posts:
            return {"empty": True}

        post = posts[0]
        embed, view, permalink = self._build_embed(post)

        alert_text = self.bot.get_feedback("new_reddit_alert", guild_id=self.guild_id)
        ping = f"{self.ping_role} " if self.ping_role else ""

        return {
            "content": f"{ping}{alert_text}\n{permalink}",
            "embed": embed,
            "view": view,
        }

    def _build_embed(self, post):
        """Build a Discord embed from a Reddit post."""
        title = post.get("title", "New Reddit Post")[:256]
        permalink = f"https://www.reddit.com{post.get('permalink', '')}"
        author = post.get("author", "Unknown")
        subreddit_name = post.get("subreddit_name_prefixed", f"r/{self.subreddit}")
        score = post.get("score", 0)

        # Get image
        image_url = None
        if post.get("post_hint") == "image":
            image_url = post.get("url")
        elif post.get("thumbnail", "").startswith("http"):
            image_url = post.get("thumbnail")

        embed = discord.Embed(
            title=title,
            url=permalink,
            color=self.get_color(0xFF4500)  # Reddit Orange
        )
        embed.set_author(name=subreddit_name)

        if image_url:
            embed.set_image(url=image_url)

        if score:
            embed.add_field(
                name=self.bot.get_feedback("field_score", guild_id=self.guild_id),
                value=str(score),
                inline=True,
            )

        embed.set_footer(text=f"u/{author} • Reddit")

        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_reddit", guild_id=self.guild_id)
        view.add_item(
            discord.ui.Button(
                label=btn_label, url=permalink, style=discord.ButtonStyle.link
            )
        )

        return embed, view, permalink
