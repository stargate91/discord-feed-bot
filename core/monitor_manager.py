import asyncio
from logger import log

class MonitorManager:
    def __init__(self, bot, config, db):
        self.bot = bot
        self.config = config
        self.db = db
        self.monitors = []
        self.refresh_interval = config.get("refresh_interval_minutes", 10) * 60
        self.is_running = False

    def add_monitor(self, monitor_instance):
        """Add an already instantiated monitor."""
        if monitor_instance.enabled:
            self.monitors.append(monitor_instance)
            log.info(f"Added monitor: {monitor_instance.name} ({monitor_instance.platform})")
        else:
            log.debug(f"Skipping disabled monitor: {monitor_instance.name}")

    async def start_loop(self):
        """Start the background monitoring loop."""
        if self.is_running:
            return
        
        self.is_running = True
        log.info(f"Starting monitor loop (Interval: {self.refresh_interval // 60}m)")
        
        while self.is_running and not self.bot.is_closed():
            for monitor in self.monitors:
                try:
                    log.debug(f"Checking monitor: {monitor.name}")
                    await monitor.check_for_updates()
                except Exception as e:
                    log.error(f"Error checking monitor {monitor.name}: {e}")
            
            # Wait for next check cycle
            await asyncio.sleep(self.refresh_interval)

    def stop_loop(self):
        """Stop the background monitoring loop."""
        self.is_running = False
        log.info("Monitor loop stopping...")
