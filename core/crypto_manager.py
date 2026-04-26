import asyncio
import aiohttp
import time
from logger import log

class CryptoManager:
    """
    Centralized manager for fetching cryptocurrency prices to avoid rate limits.
    Monitors register their interest, and this manager fetches everything in batches.
    """
    def __init__(self, bot):
        self.bot = bot
        self._prices = {} # {coin_id: {"usd": price, "last_updated": ts}}
        self._tracked_ids = set()
        self._running = False
        self._task = None
        self._interval = 60 # Fetch every 60 seconds
        self._session = None

    def register_coins(self, coin_ids: list):
        """Monitors call this to ensure the manager tracks these coins."""
        for cid in coin_ids:
            if cid:
                self._tracked_ids.add(cid)

    def get_price_data(self, coin_id: str):
        """Returns the cached price data for a coin."""
        return self._prices.get(coin_id)

    async def start(self):
        if self._running:
            return
        self._running = True
        self._session = aiohttp.ClientSession()
        self._task = asyncio.create_task(self._loop())
        log.info("CryptoManager started.")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
        if self._session:
            await self._session.close()
        log.info("CryptoManager stopped.")

    async def _loop(self):
        while self._running:
            try:
                if self._tracked_ids:
                    await self._fetch_prices()
            except Exception as e:
                log.error(f"[CryptoManager] Error in fetch loop: {e}")
            
            await asyncio.sleep(self._interval)

    async def _fetch_prices(self):
        ids_str = ",".join(sorted(list(self._tracked_ids)))
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids_str}&vs_currencies=usd"
        
        try:
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    now = time.time()
                    for cid, prices in data.items():
                        self._prices[cid] = {
                            "usd": prices.get("usd"),
                            "last_updated": now
                        }
                elif resp.status == 429:
                    log.warning("[CryptoManager] Rate limit hit (429). Retrying later.")
                else:
                    log.error(f"[CryptoManager] Failed to fetch prices: {resp.status}")
        except Exception as e:
            log.error(f"[CryptoManager] Fetch error: {e}")
