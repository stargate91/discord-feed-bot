import aiohttp
import discord
import json
import os
import time
from logger import log
from core.base_monitor import BaseMonitor
import database as db
from core.emojis import (
    STATUS_SUCCESS, STATUS_ERROR,
    CRYPTO_UP, CRYPTO_DOWN, CRYPTO_BULLET_FILLED, CRYPTO_BULLET_EMPTY, CRYPTO_CHART_COLORFUL
)

class CryptoMonitor(BaseMonitor):
    def __init__(self, bot, m_config):
        super().__init__(bot, m_config)
        self.type = "crypto"
        # Format: "BTC:100000, ETH:5000"
        self.input_data = m_config.get("source_id") or m_config.get("symbols", "")
        self.targets = self._parse_targets(self.input_data)
        self.last_prices = {} # symbol -> price
        self.coin_id_map = {} # symbol -> coingecko_id
        
        # Paths for caching
        self.cache_dir = "data"
        self.cache_file = os.path.join(self.cache_dir, "coingecko_coins.json")

    def _parse_targets(self, input_str):
        targets = {}
        if not input_str: return targets
        parts = [p.strip() for p in input_str.split(",")]
        for p in parts:
            if ":" in p:
                sym, val = p.split(":", 1)
                try:
                    targets[sym.upper().strip()] = float(val.strip())
                except ValueError:
                    continue
        return targets

    async def _update_coin_map(self):
        """Fetch and cache the coin list from CoinGecko to map symbols to IDs."""
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)

        # Cache for 24 hours
        if os.path.exists(self.cache_file):
            file_age = time.time() - os.path.getmtime(self.cache_file)
            if file_age < 86400:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._process_coin_list(data)
                    return

        log.info("Fetching fresh coin list from CoinGecko...")
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get("https://api.coingecko.com/api/v3/coins/list") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        with open(self.cache_file, 'w', encoding='utf-8') as f:
                            json.dump(data, f)
                        self._process_coin_list(data)
                    else:
                        log.error(f"Failed to fetch CoinGecko list: {resp.status}")
            except Exception as e:
                log.error(f"Error fetching CoinGecko list: {e}")

    def _process_coin_list(self, data):
        # We prefer shorter IDs or specific ones for common coins to avoid mismatches
        priority_mismatch = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "SOL": "solana",
            "ADA": "cardano",
            "DOT": "polkadot",
            "XRP": "ripple",
            "DOGE": "dogecoin",
            "BNB": "binancecoin"
        }
        
        mapping = {}
        for coin in data:
            sym = coin["symbol"].upper()
            cid = coin["id"]
            
            # Simple heuristic: if multiple IDs for same symbol, keep the one that matches our priority 
            # or the one that is likely the 'main' one (shorter ID often = more established)
            if sym not in mapping or len(cid) < len(mapping[sym]):
                mapping[sym] = cid
        
        # Override with known priorities
        for sym, cid in priority_mismatch.items():
            if sym in mapping:
                mapping[sym] = cid
            else:
                # Add if missing (unlikely)
                mapping[sym] = cid
                
        self.coin_id_map = mapping

    async def fetch_new_items(self):
        if not self.targets:
            return []

        if not self.coin_id_map:
            await self._update_coin_map()

        symbols = list(self.targets.keys())
        ids_to_fetch = []
        for sym in symbols:
            cid = self.coin_id_map.get(sym)
            if cid:
                ids_to_fetch.append(cid)
            else:
                log.warning(f"CryptoMonitor: Could not find CoinGecko ID for symbol {sym}")

        if not ids_to_fetch:
            return []

        ids_str = ",".join(ids_to_fetch)
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids_str}&vs_currencies=usd"
        
        items_to_process = []
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        prices_data = await resp.json()
                        items_to_process = await self._cache_and_detect_crossings(prices_data)
                    elif resp.status == 429:
                        log.warning("CryptoMonitor: CoinGecko rate limit reached (429).")
                    else:
                        log.error(f"CryptoMonitor: API error {resp.status}")
            except Exception as e:
                log.error(f"CryptoMonitor check error: {e}")

        return items_to_process

    async def _cache_and_detect_crossings(self, prices_data):
        events = []
        for sym, threshold in self.targets.items():
            cid = self.coin_id_map.get(sym)
            if not cid or cid not in prices_data:
                continue
            
            current_price = float(prices_data[cid]["usd"])
            prev_price = self.last_prices.get(sym)
            
            if prev_price is not None:
                crossed_up = prev_price <= threshold < current_price
                crossed_down = prev_price >= threshold > current_price
                
                if crossed_up or crossed_down:
                    diff = ((current_price - threshold) / threshold) * 100
                    percent_str = f"{diff:+.2f}%"
                    
                    hour_bucket = int(time.time() // 3600)
                    direction = "up" if crossed_up else "down"
                    monitor_id = self.config.get("id", "0")
                    pub_id = f"crypto_{monitor_id}_{sym}_{threshold}_{direction}_{hour_bucket}"
                    events.append({
                        "sym": sym,
                        "cid": cid,
                        "current_price": current_price,
                        "threshold": threshold,
                        "direction": direction,
                        "percent_str": percent_str,
                        "pub_id": pub_id
                    })
            
            self.last_prices[sym] = current_price
        return events

    async def process_item(self, event):
        await self._send_alert(
            event["sym"],
            event["cid"],
            event["current_price"], 
            event["threshold"], 
            event["direction"], 
            event["percent_str"]
        )

    def get_item_id(self, event):
        return event.get("pub_id")

    async def mark_items_published(self, items):
        for event in items:
            pub_id = self.get_item_id(event)
            if pub_id:
                title = f"{event['sym']} {event['direction'].upper()} {event['percent_str']}"
                await db.mark_as_published(
                    pub_id, "crypto", 
                    feed_url=f"https://www.coingecko.com/en/coins/{event['cid']}",
                    guild_id=self.guild_id,
                    title=title,
                    author_name="Crypto Tracker"
                )

    async def _send_alert(self, symbol, cid, current_price, threshold, direction, percent_str):
        # Placeholders for alert message
        dir_emoji = CRYPTO_UP if direction == "up" else CRYPTO_DOWN
        
        # Internal message for description
        msg = self.bot.get_feedback("new_crypto_alert", guild_id=self.guild_id).format(
            name=symbol,
            price=f"{current_price:,.2f}",
            threshold=f"{threshold:,.2f}",
            direction=dir_emoji,
            percent=percent_str
        )

        accent_color = self.get_color() # Uses original fallback config default
        title = self.bot.get_feedback("ui_crypto_alert_title", sym=symbol, guild_id=self.guild_id)
        
        view = discord.ui.LayoutView()
        container_items = []
        
        crypto_emoji = "<:crypto:1495846010197381160>"
        # 1. Header with crypto emoji
        container_items.append(discord.ui.TextDisplay(f"### {crypto_emoji} {title}"))
        container_items.append(discord.ui.Separator())
        
        # 2. Main Alert Message with dynamic direction arrow
        container_items.append(discord.ui.TextDisplay(f"{dir_emoji} {msg}"))
        
        # 3. Meta Data & Button
        meta_lines = [
            f"**{self.bot.get_feedback('ui_crypto_field_price', guild_id=self.guild_id)}:** {current_price:,.2f} USD",
            f"**{self.bot.get_feedback('ui_crypto_field_target', guild_id=self.guild_id)}:** {threshold:,.2f} USD",
            f"**{self.bot.get_feedback('ui_crypto_field_diff', guild_id=self.guild_id)}:** {percent_str}"
        ]
        meta_text = "\n".join(meta_lines)
        
        if cid:
            c_label = self.bot.get_feedback("btn_view_coingecko", guild_id=self.guild_id)
            cg_url = f"https://www.coingecko.com/en/coins/{cid}"
            btn = discord.ui.Button(label=c_label, url=cg_url, style=discord.ButtonStyle.link)
            container_items.append(discord.ui.Section(discord.ui.TextDisplay(meta_text), accessory=btn))
        else:
            container_items.append(discord.ui.TextDisplay(meta_text))
            
        # 4. Branding
        settings = self.bot.guild_settings_cache.get(self.guild_id, {})
        custom_branding = settings.get("custom_branding")
        if custom_branding != "":
            container_items.append(discord.ui.Separator())
            if custom_branding:
                container_items.append(discord.ui.TextDisplay(custom_branding))
            else:
                container_items.append(discord.ui.TextDisplay(self.bot.get_feedback("branding_delivered_by", guild_id=self.guild_id)))

        view.add_item(discord.ui.Container(*container_items, accent_color=accent_color))
        
        # Send Pings and Layout separately
        pings = self.ping_role
        if pings:
            await self.send_update(content=pings)
            
        await self.send_update(view=view)
        log.info(f"Crypto Alert sent for {symbol} ({direction})")

    async def get_latest_item(self):
        """Fetch current prices for all targets and return a summary for manual check."""
        if not self.targets:
            return {"empty": True}

        if not self.coin_id_map:
            await self._update_coin_map()

        symbols = list(self.targets.keys())
        ids_to_fetch = [self.coin_id_map.get(sym) for sym in symbols if self.coin_id_map.get(sym)]
        
        if not ids_to_fetch:
            return None

        ids_str = ",".join(ids_to_fetch)
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids_str}&vs_currencies=usd"
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        prices_data = await resp.json()
                        
                        crypto_emoji = "<:crypto:1495846010197381160>"
                        title = self.bot.get_feedback("crypto_price_check", name=self.name, guild_id=self.guild_id)
                        accent_color = self.get_color()
                        
                        summary_lines = []
                        valid_count = 0
                        
                        container_items = [
                            discord.ui.TextDisplay(f"### {crypto_emoji} {title}"),
                            discord.ui.Separator()
                        ]

                        for sym, threshold in self.targets.items():
                            cid = self.coin_id_map.get(sym)
                            if cid and cid in prices_data:
                                current_price = float(prices_data[cid]["usd"])
                                diff = ((current_price - threshold) / threshold) * 100
                                dir_emoji = CRYPTO_UP if diff >= 0 else CRYPTO_DOWN
                                
                                fmt_price = f"{current_price:,.2f}"
                                fmt_diff = f"{diff:+.2f}"
                                
                                line = f"{dir_emoji} **{sym}**: {fmt_price} USD ({fmt_diff}% a küszöbtől)"
                                summary_lines.append(line)
                                valid_count += 1
                        
                        if valid_count == 0:
                            return {"content": self.bot.get_feedback("crypto_no_data", guild_id=self.guild_id), "view": None}

                        container_items.append(discord.ui.TextDisplay("\n".join(summary_lines)))
                        
                        view = discord.ui.LayoutView()
                        view.add_item(discord.ui.Container(*container_items, accent_color=accent_color))
                        
                        return {
                            "view": view
                        }
                    elif resp.status == 429:
                        return {"content": self.bot.get_feedback("crypto_rate_limited", guild_id=self.guild_id), "embed": None}
                    else:
                        return {"content": self.bot.get_feedback("crypto_api_error", status=resp.status, guild_id=self.guild_id), "embed": None}
            except Exception as e:
                log.error(f"Crypto get_latest_item error: {e}")
                return {"content": self.bot.get_feedback("crypto_technical_error", error=str(e), guild_id=self.guild_id), "embed": None}
    async def get_preview(self):
        """Show a simulated alert for one of the coins."""
        if not self.targets:
            return None
            
        sym = list(self.targets.keys())[0]
        if not self.coin_id_map:
            await self._update_coin_map()
            
        threshold = self.targets[sym]
        current_price = threshold * 1.05 # Mock 5% increase
        dir_emoji = CRYPTO_UP
        percent_str = "+5.00%"
        cid = self.coin_id_map.get(sym)
        
        # Header for the mock alert
        mock_header = self.bot.get_feedback("ui_crypto_mock_header", guild_id=self.guild_id)
        if mock_header == "ui_crypto_mock_header":
            mock_header = " `[ MOCK ALERT SIMULÁCIÓ ]` "
            
        # 1. Format the alert message (same logic as _send_alert)
        alert_msg = self.get_alert_message({
            "name": sym,
            "price": f"{current_price:,.2f}",
            "threshold": f"{threshold:,.2f}",
            "direction": dir_emoji,
            "percent": percent_str
        })
        
        # 2. Format the layout message (same logic as _send_alert)
        msg = self.bot.get_feedback("new_crypto_alert", guild_id=self.guild_id).format(
            name=sym,
            price=f"{current_price:,.2f}",
            threshold=f"{threshold:,.2f}",
            direction=dir_emoji,
            percent=percent_str
        )

        accent_color = self.get_color()
        title = self.bot.get_feedback("ui_crypto_alert_title", sym=sym, guild_id=self.guild_id)
        
        view = discord.ui.LayoutView()
        container_items = []
        
        container_items.append(discord.ui.TextDisplay(f"### {crypto_emoji} {title}"))
        container_items.append(discord.ui.Separator())
        
        container_items.append(discord.ui.TextDisplay(f"{dir_emoji} {msg}"))
        
        meta_lines = [
            f"**{self.bot.get_feedback('ui_crypto_field_price', guild_id=self.guild_id)}:** {current_price:,.2f} USD",
            f"**{self.bot.get_feedback('ui_crypto_field_target', guild_id=self.guild_id)}:** {threshold:,.2f} USD",
            f"**{self.bot.get_feedback('ui_crypto_field_diff', guild_id=self.guild_id)}:** {percent_str}"
        ]
        meta_text = "\n".join(meta_lines)
        
        if cid:
            c_label = self.bot.get_feedback("btn_view_coingecko", guild_id=self.guild_id)
            cg_url = f"https://www.coingecko.com/en/coins/{cid}"
            btn = discord.ui.Button(label=c_label, url=cg_url, style=discord.ButtonStyle.link)
            container_items.append(discord.ui.Section(discord.ui.TextDisplay(meta_text), accessory=btn))
        else:
            container_items.append(discord.ui.TextDisplay(meta_text))
            
        settings = self.bot.guild_settings_cache.get(self.guild_id, {})
        custom_branding = settings.get("custom_branding")
        if custom_branding != "":
            container_items.append(discord.ui.Separator())
            if custom_branding:
                container_items.append(discord.ui.TextDisplay(custom_branding))
            else:
                container_items.append(discord.ui.TextDisplay(self.bot.get_feedback("branding_delivered_by", guild_id=self.guild_id)))

        view.add_item(discord.ui.Container(*container_items, accent_color=accent_color))
        
        # Message 1: Simulation Header and Pings (if set)
        pings = self.ping_role
        content_parts = [mock_header]
        if pings:
            content_parts.append(pings)
        
        return [
            {"content": "\n".join(content_parts)},
            {"view": view}
        ]
