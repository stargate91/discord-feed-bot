import aiohttp
import discord
import json
import os
import time
from logger import log
from core.base_monitor import BaseMonitor
import database

class CryptoMonitor(BaseMonitor):
    def __init__(self, bot, m_config):
        super().__init__(bot, m_config)
        self.type = "crypto"
        # Format: "BTC:100000, ETH:5000"
        self.input_data = m_config.get("source_id", "")
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

    async def check_for_updates(self):
        if not self.targets:
            return

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
            return

        ids_str = ",".join(ids_to_fetch)
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids_str}&vs_currencies=usd"
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        prices_data = await resp.json()
                        await self._process_prices(prices_data)
                    elif resp.status == 429:
                        log.warning("CryptoMonitor: CoinGecko rate limit reached (429).")
                    else:
                        log.error(f"CryptoMonitor: API error {resp.status}")
            except Exception as e:
                log.error(f"CryptoMonitor check error: {e}")

    async def _process_prices(self, prices_data):
        for sym, threshold in self.targets.items():
            cid = self.coin_id_map.get(sym)
            if not cid or cid not in prices_data:
                continue
            
            current_price = float(prices_data[cid]["usd"])
            prev_price = self.last_prices.get(sym)
            
            if prev_price is not None:
                # Detect crossing
                crossed_up = prev_price <= threshold < current_price
                crossed_down = prev_price >= threshold > current_price
                
                if crossed_up or crossed_down:
                    # diff = (current - threshold) / threshold * 100
                    diff = ((current_price - threshold) / threshold) * 100
                    percent_str = f"{diff:+.2f}%"
                    
                    hour_bucket = int(time.time() // 3600)
                    direction = "up" if crossed_up else "down"
                    monitor_id = self.config.get("id", "0")
                    pub_id = f"crypto_{monitor_id}_{sym}_{threshold}_{direction}_{hour_bucket}"
                    
                    if not await database.is_published(pub_id):
                        await self._send_alert(sym, current_price, threshold, direction, percent_str)
                        await database.mark_as_published(pub_id)
            
            self.last_prices[sym] = current_price

    async def _send_alert(self, symbol, current_price, threshold, direction, percent_str):
        # Placeholders for alert message
        dir_emoji = "📈" if direction == "up" else "📉"
        
        # Format the system message via variables
        alert_msg = self.get_alert_message({
            "name": symbol,
            "price": f"{current_price:,.2f}",
            "threshold": f"{threshold:,.2f}",
            "direction": dir_emoji,
            "percent": percent_str
        })

        # Internal message for description
        msg = self.bot.get_feedback("new_crypto_alert", guild_id=self.guild_id).format(
            name=symbol,
            price=f"{current_price:,.2f}",
            threshold=f"{threshold:,.2f}",
            direction=dir_emoji,
            percent=percent_str
        )
        channel = self.bot.get_channel(self.discord_channel_id)
        if channel:
            color = self.get_color()
            embed = discord.Embed(
                title=f"Crypto Alert: {symbol}",
                description=msg,
                color=color
            )
            embed.set_footer(text="CoinGecko", icon_url="https://static.coingecko.com/s/thumbnail-d3493722a4497e70407fcfdc72e4ec326e0e2bb52479493979872583abbbe28d.png")
            embed.timestamp = discord.utils.utcnow()
            
            await channel.send(content=alert_msg, embed=embed)
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
                        
                        embed = discord.Embed(
                            title=f"Crypto Status: {self.name}",
                            color=self.get_color()
                        )
                        
                        summary_lines = []
                        valid_count = 0
                        for sym, threshold in self.targets.items():
                            cid = self.coin_id_map.get(sym)
                            if cid and cid in prices_data:
                                current_price = float(prices_data[cid]["usd"])
                                diff = ((current_price - threshold) / threshold) * 100
                                color_emoji = "🟢" if current_price >= threshold else "🔴"
                                line = f"{color_emoji} **{sym}**: {current_price:,.2f} USD ({diff:+.2f}% to threshold)"
                                summary_lines.append(line)
                                embed.add_field(name=sym, value=f"Price: **{current_price:,.2f} USD**\nTarget: **{threshold:,.2f} USD**\nDiff: **{diff:+.2f}%**", inline=True)
                                valid_count += 1
                        
                        if valid_count == 0:
                            return {"content": "❌ No valid price data found for the symbols.", "embed": None}

                        embed.description = "\n".join(summary_lines)
                        embed.set_footer(text="CoinGecko", icon_url="https://static.coingecko.com/s/thumbnail-d3493722a4497e70407fcfdc72e4ec326e0e2bb52479493979872583abbbe28d.png")
                        embed.timestamp = discord.utils.utcnow()
                        
                        return {
                            "content": f"📊 **Crypto Price Check: {self.name}**",
                            "embed": embed
                        }
                    elif resp.status == 429:
                        return {"content": "❌ CoinGecko Error: Rate limited (429). Please wait a few minutes.", "embed": None}
                    else:
                        return {"content": f"❌ CoinGecko API Error: HTTP {resp.status}", "embed": None}
            except Exception as e:
                log.error(f"Crypto get_latest_item error: {e}")
                return {"content": f"❌ Technical Error: {str(e)}", "embed": None}
