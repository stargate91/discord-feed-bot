import asyncio
from logger import log

class MonitorManager:
    def __init__(self, bot, config):
        self.bot = bot
        self.config = config
        self.monitors = []
        self.refresh_interval = config.get("refresh_interval_minutes", 10) * 60
        self.is_running = False
        self._shared_cache = {} # Key: source_id, Value: (timestamp, data)
        self.tmdb_genres_cache = {} # Key: lang_code, Value: {id: name}

    def get_shared_data(self, key):
        """Get shared data from cache if it's still fresh."""
        import time
        if key in self._shared_cache:
            ts, data = self._shared_cache[key]
            # Consider data fresh for half of the refresh interval
            if time.time() - ts < (self.refresh_interval / 2):
                return data
        return None

    def set_shared_data(self, key, data):
        """Store data in the shared cache."""
        import time
        self._shared_cache[key] = (time.time(), data)

    def add_monitor(self, monitor_instance):
        """Add an already instantiated monitor."""
        self.monitors.append(monitor_instance)
        log.info(f"Added monitor: {monitor_instance.name} ({monitor_instance.platform}) | Enabled: {monitor_instance.enabled}")

    async def start_loop(self):
        """Start the background monitoring loop."""
        if self.is_running:
            return
        
        self.is_running = True
        log.info(f"Starting monitor loop (Interval: {self.refresh_interval // 60}m)")
        
        # Wait for the bot to be ready before the first check
        await self.bot.wait_until_ready()
        
        while self.is_running and not self.bot.is_closed():
            for monitor in self.monitors:
                if not monitor.enabled:
                    continue
                try:
                    log.debug(f"Checking monitor: {monitor.name}", extra={'guild_id': monitor.guild_id})
                    await monitor.check_for_updates()
                except Exception as e:
                    log.error(f"Error checking monitor {monitor.name}: {e}", exc_info=True, extra={'guild_id': monitor.guild_id})
            
            # Wait for next check cycle
            try:
                await asyncio.sleep(self.refresh_interval)
            except asyncio.CancelledError:
                break

    def stop_loop(self):
        """Stop the background monitoring loop."""
        self.is_running = False
        log.info("Monitor loop stopping...")
