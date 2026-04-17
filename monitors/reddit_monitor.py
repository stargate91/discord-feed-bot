import aiohttp
import discord
from core.base_monitor import BaseMonitor
from logger import log

# Reddit needs a unique, descriptive User-Agent or it will return 429
REDDIT_USER_AGENT = "Nova-FeedBot/1.0 (Discord Feed Monitor)"


import database

class RedditMonitor(BaseMonitor):
    """Monitor for new posts in a given subreddit via Reddit's public JSON API."""

    def __init__(self, bot, config):
        super().__init__(bot, config)
        self.subreddit = config.get("subreddit", "")
        self.sort = config.get("sort", "new")  # new, hot, top
        self.limit = config.get("limit", 10)
        self.api_url = f"https://www.reddit.com/r/{self.subreddit}/{self.sort}.json?limit={self.limit}"
        self.is_first_run = True

    def get_shared_key(self):
        return f"reddit:{self.subreddit}:{self.sort}"

    async def check_for_updates(self):
        """Fetch Reddit JSON API and look for new posts."""
        if not self.subreddit:
            log.warning(f"No subreddit configured for monitor: {self.name}")
            return

        # Check for shared data
        shared_data = self.bot.monitor_manager.get_shared_data(self.get_shared_key())
        if shared_data:
            data = shared_data
        else:
            try:
                headers = {"User-Agent": REDDIT_USER_AGENT}
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.api_url, headers=headers) as response:
                        if response.status != 200:
                            log.error(f"Reddit API returned {response.status} for r/{self.subreddit}")
                            return
                        data = await response.json()
                        if data:
                            self.bot.monitor_manager.set_shared_data(self.get_shared_key(), data)
            except Exception as e:
                log.error(f"Error fetching Reddit data for r/{self.subreddit}: {e}")
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
                    await database.mark_as_published(db_id, "reddit", self.api_url)
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
            score = post.get("score", 0)
            thumbnail = post.get("thumbnail", "")
            # Get a proper image if available
            image_url = None
            if post.get("post_hint") == "image":
                image_url = post.get("url")
            elif thumbnail and thumbnail.startswith("http"):
                image_url = thumbnail

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

            # Format alert
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
            await database.mark_as_published(db_id, "reddit", self.api_url)

        if self.is_first_run:
            log.info(f"Initial seed completed for Reddit r/{self.subreddit}. Monitoring active.")
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent post from the subreddit."""
        if not self.subreddit:
            return None

        try:
            headers = {"User-Agent": REDDIT_USER_AGENT}
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url, headers=headers) as response:
                    if response.status != 200:
                        return None
                    data = await response.json()
        except:
            return None

        posts = data.get("data", {}).get("children", [])
        if not posts:
            return {"empty": True}

        post = posts[0].get("data", {})
        title = post.get("title", "New Reddit Post")[:256]
        permalink = f"https://www.reddit.com{post.get('permalink', '')}"
        author = post.get("author", "Unknown")
        subreddit_name = post.get("subreddit_name_prefixed", f"r/{self.subreddit}")
        score = post.get("score", 0)

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
        if score:
            embed.add_field(
                name=self.bot.get_feedback("field_score", guild_id=self.guild_id),
                value=str(score),
                inline=True,
            )
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
