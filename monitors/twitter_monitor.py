import feedparser
import discord
import re
import asyncio
from core.base_monitor import BaseMonitor
from logger import log


class TwitterMonitor(BaseMonitor):
    """Monitor for tweets from a Twitter/X user via a Nitter RSS proxy."""

    def __init__(self, bot, config, db, language_data):
        super().__init__(bot, config, db)
        self.username = config.get("username", "")
        self.nitter_instance = config.get(
            "nitter_instance", "https://nitter.privacydev.net"
        )
        self.feed_url = f"{self.nitter_instance.rstrip('/')}/{self.username}/rss"
        self.lang = language_data
        self.is_first_run = True

    async def check_for_updates(self):
        """Fetch the Nitter RSS feed and look for new tweets."""
        if not self.username:
            log.warning(f"No Twitter username configured for monitor: {self.name}")
            return

        try:
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(
                None, lambda: feedparser.parse(self.feed_url)
            )
        except Exception as e:
            log.error(f"Failed to fetch Nitter RSS for @{self.username}: {e}")
            return

        if not hasattr(feed, "entries") or not feed.entries:
            log.debug(f"No entries found in Nitter feed for @{self.username}")
            return

        new_entries = []
        for entry in reversed(feed.entries):
            entry_id = entry.get("id") or entry.get("link")
            if not entry_id:
                continue

            db_id = f"twitter_{entry_id}"
            if not await self.db.is_published(db_id, "twitter"):
                if self.is_first_run:
                    log.debug(f"Seeding Twitter post from @{self.username}")
                    await self.db.mark_as_published(db_id, "twitter", self.feed_url)
                else:
                    new_entries.append(entry)
                    log.info(
                        f"New tweet detected from @{self.username}: {entry.get('title', '')[:50]}"
                    )

        for entry in new_entries:
            entry_id = entry.get("id") or entry.get("link")
            db_id = f"twitter_{entry_id}"

            # Nitter links need to be converted to real Twitter links
            nitter_link = entry.get("link", "")
            twitter_link = self._nitter_to_twitter(nitter_link)

            # Extract tweet text (strip HTML tags)
            raw_content = entry.get("summary", entry.get("title", ""))
            tweet_text = self._clean_html(raw_content)[:280]

            # Try to find an image in the content
            image_url = self._extract_image(raw_content)

            embed = discord.Embed(
                description=tweet_text,
                url=twitter_link,
                color=0x1DA1F2,  # Twitter Blue
            )
            embed.set_author(
                name=f"@{self.username}",
                url=f"https://x.com/{self.username}",
            )

            if image_url:
                embed.set_image(url=image_url)

            embed.set_footer(text="X (Twitter)")

            alert_text = self.lang.get("new_twitter_alert", "Új tweet érkezett!")
            ping = f"{self.ping_role} " if self.ping_role else ""

            view = discord.ui.View()
            btn_label = self.lang.get("btn_view_twitter", "Megtekintés X-en")
            view.add_item(
                discord.ui.Button(
                    label=btn_label, url=twitter_link, style=discord.ButtonStyle.link
                )
            )

            await self.send_update(
                content=f"{ping}{alert_text}\n{twitter_link}",
                embed=embed,
                view=view,
            )
            await self.db.mark_as_published(db_id, "twitter", self.feed_url)

        if self.is_first_run:
            log.info(
                f"Initial seed completed for Twitter @{self.username}. Monitoring active."
            )
            self.is_first_run = False

    async def get_latest_item(self):
        """Fetch the most recent tweet from the user's Nitter feed."""
        if not self.username:
            return None

        try:
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(
                None, lambda: feedparser.parse(self.feed_url)
            )
        except:
            return None

        if not hasattr(feed, "entries") or not feed.entries:
            return {"empty": True}

        entry = feed.entries[0]
        nitter_link = entry.get("link", "")
        twitter_link = self._nitter_to_twitter(nitter_link)

        raw_content = entry.get("summary", entry.get("title", ""))
        tweet_text = self._clean_html(raw_content)[:280]
        image_url = self._extract_image(raw_content)

        embed = discord.Embed(
            description=tweet_text,
            url=twitter_link,
            color=0x1DA1F2,
        )
        embed.set_author(
            name=f"@{self.username}",
            url=f"https://x.com/{self.username}",
        )
        if image_url:
            embed.set_image(url=image_url)
        embed.set_footer(text="X (Twitter)")

        alert_text = self.lang.get("new_twitter_alert", "Új tweet érkezett!")
        ping = f"{self.ping_role} " if self.ping_role else ""

        view = discord.ui.View()
        btn_label = self.lang.get("btn_view_twitter", "Megtekintés X-en")
        view.add_item(
            discord.ui.Button(
                label=btn_label, url=twitter_link, style=discord.ButtonStyle.link
            )
        )

        return {
            "content": f"{ping}{alert_text}\n{twitter_link}",
            "embed": embed,
            "view": view,
        }

    def _nitter_to_twitter(self, nitter_url):
        """Convert a Nitter URL back to a real Twitter/X URL."""
        if not nitter_url:
            return f"https://x.com/{self.username}"
        # Replace the nitter instance domain with x.com
        for prefix in [self.nitter_instance, "https://nitter.net"]:
            if nitter_url.startswith(prefix):
                return nitter_url.replace(prefix, "https://x.com", 1)
        return nitter_url

    def _clean_html(self, html_text):
        """Strip HTML tags from a string."""
        clean = re.sub(r"<[^>]+>", "", html_text)
        clean = clean.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        clean = clean.replace("&#39;", "'").replace("&quot;", '"')
        return clean.strip()

    def _extract_image(self, html_content):
        """Try to extract an image URL from HTML content."""
        match = re.search(r'<img [^>]*src="([^"]+)"', html_content)
        if match:
            url = match.group(1)
            # Convert nitter image proxy URLs to direct if possible
            if "/pic/" in url and self.nitter_instance in url:
                return url  # Nitter proxied image, still works
            return url
        return None
