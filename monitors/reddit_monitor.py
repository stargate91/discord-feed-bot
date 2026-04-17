import aiohttp
import discord
import asyncio
import re
import time
from core.base_monitor import BaseMonitor
from logger import log
import database

# Reddit OAuth2 token cache (shared across all RedditMonitor instances)
_reddit_token_cache = {
    "access_token": None,
    "expires_at": 0
}

REDDIT_USER_AGENT = "Nova-FeedBot/2.0 (Discord Feed Monitor by /u/NovaFeedBot)"


async def get_reddit_oauth_token(client_id, client_secret):
    """Get or refresh a Reddit OAuth2 access token using client credentials."""
    global _reddit_token_cache

    # Return cached token if still valid (with 60s buffer)
    if _reddit_token_cache["access_token"] and time.time() < _reddit_token_cache["expires_at"] - 60:
        return _reddit_token_cache["access_token"]

    auth = aiohttp.BasicAuth(client_id, client_secret)
    headers = {"User-Agent": REDDIT_USER_AGENT}
    data = {"grant_type": "client_credentials"}

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://www.reddit.com/api/v1/access_token",
            auth=auth,
            headers=headers,
            data=data
        ) as resp:
            if resp.status != 200:
                log.error(f"Reddit OAuth token request failed with status {resp.status}")
                return None
            result = await resp.json()
            _reddit_token_cache["access_token"] = result.get("access_token")
            _reddit_token_cache["expires_at"] = time.time() + result.get("expires_in", 3600)
            log.debug("Reddit OAuth token acquired/refreshed successfully.")
            return _reddit_token_cache["access_token"]


async def fetch_reddit_posts(subreddit, sort, limit, client_id, client_secret):
    """Fetch posts from a subreddit using the Reddit OAuth2 API."""
    token = await get_reddit_oauth_token(client_id, client_secret)
    if not token:
        log.error("Cannot fetch Reddit posts: no OAuth token available.")
        return None

    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": REDDIT_USER_AGENT
    }
    url = f"https://oauth.reddit.com/r/{subreddit}/{sort}?limit={limit}&raw_json=1"

    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status == 401:
                # Token expired, clear cache and retry once
                _reddit_token_cache["access_token"] = None
                token = await get_reddit_oauth_token(client_id, client_secret)
                if not token:
                    return None
                headers["Authorization"] = f"Bearer {token}"
                async with session.get(url, headers=headers) as retry_resp:
                    if retry_resp.status != 200:
                        log.error(f"Reddit OAuth API returned {retry_resp.status} for r/{subreddit} (retry)")
                        return None
                    return await retry_resp.json()
            elif response.status != 200:
                log.error(f"Reddit OAuth API returned {response.status} for r/{subreddit}")
                return None
            return await response.json()


class RedditMonitor(BaseMonitor):
    """Monitor for new posts in a given subreddit via Reddit's OAuth2 API."""

    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.subreddit = config.get("subreddit", "")
        self.sort = config.get("sort", "new")  # new, hot, top
        self.limit = config.get("limit", 10)
        # Reddit OAuth credentials from bot config
        self.client_id = bot.config.get("reddit_client_id", "")
        self.client_secret = bot.config.get("reddit_client_secret", "")
        self.is_first_run = True

    def get_shared_key(self):
        return f"reddit:{self.subreddit}:{self.sort}"

    async def _fetch_posts(self):
        """Fetch posts, using shared data cache or making an API call."""
        if not self.client_id or not self.client_secret:
            log.warning(f"Reddit OAuth credentials not configured. Set reddit_client_id and reddit_client_secret in config.json")
            return None

        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            return shared_data

        data = await fetch_reddit_posts(
            self.subreddit, self.sort, self.limit,
            self.client_id, self.client_secret
        )
        if data:
            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), data)
        return data

    async def check_for_updates(self):
        """Check for new posts in the subreddit."""
        if not self.subreddit:
            log.warning(f"No subreddit configured for monitor: {self.name}")
            return

        data = await self._fetch_posts()
        if not data:
            return

        posts = data.get("data", {}).get("children", [])
        if not posts:
            return

        new_entries = []
        for post_wrapper in reversed(posts):
            post = post_wrapper.get("data", {})
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
            post_id = post.get("id", "")
            db_id = f"reddit_{post_id}"

            title = post.get("title", "New Reddit Post")[:256]
            permalink = f"https://www.reddit.com{post.get('permalink', '')}"
            author = post.get("author", "Unknown")
            subreddit_name = post.get("subreddit_name_prefixed", f"r/{self.subreddit}")

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

            embed.set_footer(text=f"u/{author} • Reddit")

            alert_text = self.get_alert_message({
                "name": subreddit_name,
                "title": title,
                "url": permalink,
                "author": author
            })

            view = discord.ui.View()
            btn_label = self.bot.get_feedback("btn_view_reddit", guild_id=self.guild_id)
            view.add_item(
                discord.ui.Button(
                    label=btn_label, url=permalink, style=discord.ButtonStyle.link
                )
            )

            await self.send_update(
                content=f"{alert_text}\n{permalink}", embed=embed, view=view
            )
            await database.mark_as_published(db_id, "reddit", f"r/{self.subreddit}")

        if self.is_first_run:
            log.info(f"Initial seed completed for Reddit r/{self.subreddit}. Monitoring active.")
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent post from the subreddit."""
        if not self.subreddit:
            return None

        if not self.client_id or not self.client_secret:
            log.warning("Reddit OAuth credentials not configured for manual check.")
            return None

        try:
            data = await fetch_reddit_posts(
                self.subreddit, self.sort, 1,
                self.client_id, self.client_secret
            )
        except Exception as e:
            log.error(f"Manual check failed for Reddit r/{self.subreddit}: {e}")
            return None

        if not data:
            return None

        posts = data.get("data", {}).get("children", [])
        if not posts:
            return {"empty": True}

        post = posts[0].get("data", {})
        title = post.get("title", "New Reddit Post")[:256]
        permalink = f"https://www.reddit.com{post.get('permalink', '')}"
        author = post.get("author", "Unknown")
        subreddit_name = post.get("subreddit_name_prefixed", f"r/{self.subreddit}")

        image_url = None
        if post.get("post_hint") == "image":
            image_url = post.get("url")
        elif post.get("thumbnail", "").startswith("http"):
            image_url = post.get("thumbnail")

        embed = discord.Embed(
            title=title,
            url=permalink,
            color=self.get_color(0xFF4500),
        )
        embed.set_author(name=subreddit_name)
        if image_url:
            embed.set_image(url=image_url)
        embed.set_footer(text=f"u/{author} • Reddit")

        alert_text = self.bot.get_feedback("new_reddit_alert", guild_id=self.guild_id)
        ping = f"{self.ping_role} " if self.ping_role else ""

        view = discord.ui.View()
        btn_label = self.bot.get_feedback("btn_view_reddit", guild_id=self.guild_id)
        view.add_item(
            discord.ui.Button(
                label=btn_label, url=permalink, style=discord.ButtonStyle.link
            )
        )

        return {
            "content": f"{ping}{alert_text}\n{permalink}",
            "embed": embed,
            "view": view,
        }
