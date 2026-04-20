import asyncio
from logger import log

class MonitorManager:
    def __init__(self, bot, config):
        self.bot = bot
        self.config = config
        self.monitors = []
        self.is_running = False
        self._shared_cache = {} # Key: source_id, Value: (timestamp, data)
        self.tmdb_genres_cache = {} # Key: lang_code, Value: {id: name}
        self.group_last_checked = {}
        self.unshared_last_checked = {}

    def get_shared_data(self, key, max_age_seconds=120):
        """Get shared data from cache if it's still fresh."""
        import time
        if key in self._shared_cache:
            ts, data = self._shared_cache[key]
            # Consider data fresh for max_age_seconds
            if time.time() - ts < max_age_seconds:
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
        log.info(f"Starting monitor loop in Centralized Poller mode with dynamic intervals")
        
        await self.bot.wait_until_ready()
        
        import time
        
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
            now = time.time()
            for key, monitors_in_group in groups.items():
                if not self.is_running or self.bot.is_closed(): break
                
                # Determine min refresh interval for this shared group
                min_interval_mins = min(self.bot.get_guild_refresh_interval(m.guild_id) for m in monitors_in_group)
                min_interval_secs = min_interval_mins * 60
                
                last_checked = self.group_last_checked.get(key, 0)
                if now - last_checked < min_interval_secs:
                    continue # Not due yet for this group
                    
                self.group_last_checked[key] = now
                
                primary = monitors_in_group[0]
                try:
                    # Transitional backwards compatibility check
                    if hasattr(primary, 'fetch_new_items'):
                        log.debug(f"[Centralized] Fetching new items for {len(monitors_in_group)} monitors tracking '{key}' (Interval: {min_interval_mins}m)")
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
                
                interval_secs = self.bot.get_guild_refresh_interval(monitor.guild_id) * 60
                last_checked = self.unshared_last_checked.get(monitor.id, 0)
                
                if now - last_checked < interval_secs:
                    continue
                    
                self.unshared_last_checked[monitor.id] = now
                
                try:
                    log.debug(f"[Unshared] Checking monitor: {monitor.name} (Interval: {interval_secs//60}m)")
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
            
            # Central heartbeat: wait 60 seconds before checking again
            try:
                await asyncio.sleep(60)
            except asyncio.CancelledError:
                break

    def stop_loop(self):
        """Stop the background monitoring loop."""
        self.is_running = False
        log.info("Monitor loop stopping...")
