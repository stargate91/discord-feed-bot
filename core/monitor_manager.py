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
        """Start the background monitoring loop centrally."""
        if self.is_running:
            return
        
        self.is_running = True
        log.info(f"Starting monitor loop (Interval: {self.refresh_interval // 60}m) in Centralized Poller mode")
        
        await self.bot.wait_until_ready()
        
        while self.is_running and not self.bot.is_closed():
            # 1. Group monitors by shared feed key to avoid redundant API polling
            groups = {}
            unshared = []
            
            for monitor in self.monitors:
                if not monitor.enabled:
                    continue
                try:
                    key = monitor.get_shared_key()
                    if key:
                        groups.setdefault(key, []).append(monitor)
                    else:
                        unshared.append(monitor)
                except Exception as e:
                    log.error(f"Error getting shared key for {monitor.name}: {e}")
                    
            # 2. Process Shared Groups Centrally
            for key, monitors_in_group in groups.items():
                if not self.is_running or self.bot.is_closed(): break
                primary = monitors_in_group[0]
                try:
                    # Transitional backwards compatibility check
                    if hasattr(primary, 'fetch_new_items'):
                        log.debug(f"[Centralized] Fetching new items for {len(monitors_in_group)} monitors tracking '{key}'")
                        new_items = await primary.fetch_new_items()
                        if new_items:
                            # Process and send to all subscribers
                            for item in new_items:
                                for mon in monitors_in_group:
                                    try:
                                        await mon.process_item(item)
                                    except Exception as e:
                                        log.error(f"Error processing item centrally for {mon.name}: {e}")
                            
                            # Once all are processed, mark them globally published!
                            await primary.mark_items_published(new_items)
                    else:
                        # Legacy fallback
                        log.debug(f"[Legacy Centralized] Processing {len(monitors_in_group)} monitors tracking '{key}'")
                        for mon in monitors_in_group:
                            await mon.check_for_updates()
                except Exception as e:
                    log.error(f"Error checking centralized group {key}: {e}", exc_info=True)
                    
            # 3. Process unshared ones (Fallback)
            for monitor in unshared:
                if not self.is_running or self.bot.is_closed(): break
                try:
                    log.debug(f"[Unshared] Checking monitor: {monitor.name}")
                    if hasattr(monitor, 'fetch_new_items'):
                        new_items = await monitor.fetch_new_items()
                        if new_items:
                            for item in new_items:
                                await monitor.process_item(item)
                            await monitor.mark_items_published(new_items)
                    else:
                        await monitor.check_for_updates()
                except Exception as e:
                    log.error(f"Error checking unshared monitor {monitor.name}: {e}", exc_info=True)
            
            # Wait for next check cycle
            try:
                await asyncio.sleep(self.refresh_interval)
            except asyncio.CancelledError:
                break

    def stop_loop(self):
        """Stop the background monitoring loop."""
        self.is_running = False
        log.info("Monitor loop stopping...")
