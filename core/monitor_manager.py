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

    async def sync_with_db(self):
        """Reload all monitors from database and sync with local memory."""
        log.info("Synchronizing monitors with database...")
        import database
        from core.monitor_factory import create_monitor_instance
        
        try:
            # Track old assignments to detect new ones
            old_assignments = {}
            if self.monitors:
                for m in self.monitors:
                    old_assignments[m.id] = set(m.target_channels)

            db_monitors = await database.get_all_monitors()
            new_monitors = []
            
            for m_config in db_monitors:
                monitor = create_monitor_instance(self.bot, m_config)
                if monitor:
                    new_monitors.append(monitor)
            
            # If we had monitors before, check for new channel assignments
            if old_assignments:
                for m in new_monitors:
                    if not m.enabled: continue
                    
                    old_chans = old_assignments.get(m.id, set())
                    new_chans = set(m.target_channels)
                    added_chans = new_chans - old_chans
                    
                    for ch_id in added_chans:
                        asyncio.create_task(self.announce_monitor(m, ch_id))

            # Atomic update of the monitor list
            self.monitors = new_monitors
            
            # Reset throttling/last_checked caches to ensure freshness
            self.group_last_checked = {}
            self.unshared_last_checked = {}
            
            log.info(f"Sync complete. Now tracking {len(self.monitors)} monitors.")
            return True
        except Exception as e:
            log.error(f"Failed to sync monitors: {e}", exc_info=True)
            return False

    async def announce_monitor(self, monitor, channel_id):
        """Send a localized announcement message to a newly assigned channel."""
        try:
            channel = self.bot.get_channel(int(channel_id))
            if not channel:
                channel = await self.bot.fetch_channel(int(channel_id))
            
            if channel:
                msg = self.bot.get_feedback("monitor_assigned_announcement", name=monitor.name, guild_id=monitor.guild_id)
                await channel.send(msg)
                log.info(f"Announced monitor '{monitor.name}' in channel #{channel.name} ({channel_id})")
        except Exception as e:
            log.error(f"Failed to announce monitor '{monitor.name}' in channel {channel_id}: {e}")

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

    async def manual_check(self, monitor_id):
        """Force an immediate update check for a specific monitor."""
        monitor = next((m for m in self.monitors if m.id == monitor_id), None)
        if not monitor:
            log.warning(f"Manual check failed: Monitor {monitor_id} not found.")
            return False
            
        try:
            log.info(f"Manual check triggered for monitor: {monitor.name}")
            if hasattr(monitor, 'fetch_new_items'):
                new_items = await monitor.fetch_new_items()
                if new_items:
                    for item in new_items:
                        await monitor.process_item(item)
                    await monitor.mark_items_published(new_items)
            else:
                await monitor.check_for_updates()
            return True
        except Exception as e:
            log.error(f"Error during manual check for {monitor.name}: {e}")
            return False

    async def repost_recent(self, monitor_id, count=1):
        """Find the last X processed items and send them again."""
        monitor = next((m for m in self.monitors if m.id == monitor_id), None)
        if not monitor: return False
        
        # Limit count between 1 and 10
        count = max(1, min(10, int(count)))
        
        import database
        try:
            # Find the X most recent published entries for this monitor
            q = "SELECT entry_id, feed_url, title, thumbnail_url, author_name FROM published_entries_v2 WHERE platform = $1 AND guild_id = $2 ORDER BY published_at DESC LIMIT $3"
            rows = await database._fetch(q, monitor.type, monitor.guild_id, count)
            
            if not rows:
                log.warning(f"Repost failed: No history found for monitor {monitor.name}")
                return False
                
            log.info(f"Reposting last {len(rows)} items for monitor: {monitor.name}")
            
            # Repost in chronological order (oldest of the selection first)
            for row in reversed(rows):
                item = {
                    'id': row['entry_id'],
                    'link': row['feed_url'],
                    'title': row['title'],
                    'thumbnail': row['thumbnail_url'],
                    'author': row['author_name'],
                    'is_repost': True
                }
                await monitor.process_item(item)
                await asyncio.sleep(1) # Small delay to avoid rate limits
                
            return True
        except Exception as e:
            log.error(f"Error during repost for {monitor.name}: {e}")
            return False

    async def purge_channel(self, monitor_id, amount=50):
        """Delete recent messages in the target Discord channels of this monitor."""
        monitor = next((m for m in self.monitors if m.id == monitor_id), None)
        if not monitor: return False
        
        success = True
        log.info(f"Purging channels for monitor: {monitor.name} (Amount: {amount})")
        
        for channel_id in monitor.target_channels:
            try:
                channel = self.bot.get_channel(int(channel_id))
                if not channel:
                    channel = await self.bot.fetch_channel(int(channel_id))
                
                if channel:
                    # Use bulk delete for messages younger than 14 days
                    deleted = await channel.purge(limit=amount)
                    log.info(f"Purged {len(deleted)} messages in channel {channel_id}")
            except Exception as e:
                log.error(f"Failed to purge channel {channel_id}: {e}")
                success = False
        
        return success
