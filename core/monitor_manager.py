import asyncio
import time
import database as db
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
        if key in self._shared_cache:
            ts, data = self._shared_cache[key]
            # Consider data fresh for max_age_seconds
            if time.time() - ts < max_age_seconds:
                return data
        return None

    def set_shared_data(self, key, data):
        """Store data in the shared cache."""
        self._shared_cache[key] = (time.time(), data)

    def add_monitor(self, monitor_instance):
        """Add an already instantiated monitor."""
        self.monitors.append(monitor_instance)
        log.info(f"Added monitor: {monitor_instance.name} ({monitor_instance.platform}) | Enabled: {monitor_instance.enabled}")

    async def sync_with_db(self, is_startup=False):
        """Reload all monitors from database and sync with local memory."""
        log.info("Synchronizing monitors with database...")
        from core.monitor_factory import create_monitor_instance
        
        try:
            # Track old assignments to detect new ones
            old_assignments = {}
            if self.monitors:
                for m in self.monitors:
                    old_assignments[m.id] = set(m.target_channels)

            db_monitors = await db.get_all_monitors()
            new_monitors = []
            
            for m_config in db_monitors:
                monitor = create_monitor_instance(self.bot, m_config)
                if monitor:
                    new_monitors.append(monitor)
            
            # If this is not a bot startup, we can safely announce new monitors/assignments
            if not is_startup:
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
                                        # Per-guild publication check for shared items
                                        item_id = mon.get_item_id(item)
                                        if item_id:
                                            is_pub = await db.is_published(item_id, mon.platform, mon.guild_id)
                                            if is_pub:
                                                continue
                                                
                                        await mon.process_item(item)
                                    except Exception as e:
                                        log.error(f"Error processing item centrally for {mon.name}: {e}")
                            
                            # Once all are processed, mark them published for EVERY monitor in this group
                            for mon in monitors_in_group:
                                try:
                                    await mon.mark_items_published(new_items)
                                except Exception as e:
                                    log.error(f"Failed to mark items as published for {mon.name}: {e}")
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
                                                to_process = []
                            for item in new_items:
                                item_id = monitor.get_item_id(item)
                                if item_id:
                                    is_pub = await db.is_published(item_id, monitor.platform, monitor.guild_id)
                                    if not is_pub:
                                        to_process.append(item)
                            
                            if to_process:
                                for item in to_process:
                                    await monitor.process_item(item)
                                await monitor.mark_items_published(to_process)
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
            return False, "Monitor not found in memory."
            
        try:
            log.info(f"Manual check triggered for monitor: {monitor.name}")
            
            # Streaming platforms (Twitch, Kick, etc.) have _fetch_platform_data
            if hasattr(monitor, '_fetch_platform_data'):
                stream_data = await monitor._fetch_platform_data()
                if stream_data and stream_data.get('is_live'):
                    viewers = stream_data.get('viewers', 0)
                    title = stream_data.get('title', 'No Title')
                    msg = f"LIVE NOW! {viewers:,} viewers. Title: {title}"
                    return True, msg
                else:
                    return True, "Currently OFFLINE."

            if hasattr(monitor, 'fetch_new_items'):
                all_items = await monitor.fetch_new_items()
                        new_items = []
                if all_items:
                    for item in all_items:
                        item_id = monitor.get_item_id(item)
                        if item_id:
                            is_pub = await db.is_published(item_id, monitor.platform, monitor.guild_id)
                            if not is_pub:
                                new_items.append(item)
                
                if new_items:
                    for item in new_items:
                        await monitor.process_item(item)
                    await monitor.mark_items_published(new_items)
                    
                    count = len(new_items)
                    first = new_items[0]
                    title = first.get('title') or first.get('name') or first.get('symbol')
                    
                    if monitor.platform == 'crypto' and first.get('price'):
                        msg = f"Price Alert! {title} is at ${first.get('price')}!"
                    elif title:
                        msg = f"Found {count} new update(s)! Latest: {title}"
                    else:
                        msg = f"Found {count} new update(s)!"
                    return True, msg
                else:
                    return True, "Checked successfully. No new updates found."
            else:
                await monitor.check_for_updates()
                return True, "Manual check complete."
        except Exception as e:
            log.error(f"Error during manual check for {monitor.name}: {e}")
            return False, f"Check error: {str(e)}"

    async def repost_recent(self, monitor_id, count=1):
        """Fetch latest items directly from source and post them (useful for new monitors or recovery)."""
        monitor = next((m for m in self.monitors if m.id == monitor_id), None)
        if not monitor: return False
        
        # Limit count between 1 and 10
        count = max(1, min(10, int(count)))
        
        try:
            log.info(f"Live Repost triggered for {monitor.name} (Source: {monitor.platform}). Fetching {count} items...")
            
            # 1. Fetch fresh items directly from the platform source
            if not hasattr(monitor, 'get_latest_items'):
                log.warning(f"Monitor {monitor.name} does not support live fetching.")
                return False
                
            items_to_post = await monitor.get_latest_items(count)
            if not items_to_post:
                log.warning(f"No items found at source for {monitor.name}")
                return False
                
            log.info(f"Posting {len(items_to_post)} items from source for {monitor.name}")
            
            # 3. Process each item (post to Discord)
            for item_data in items_to_post:
                await monitor.send_update(content=item_data.get("content"), embed=item_data.get("embed"), view=item_data.get("view"))
                await asyncio.sleep(1) # Safety delay
            
            return True
        except Exception as e:
            log.error(f"Error during live repost for {monitor.name}: {e}", exc_info=True)
            return False

    async def reset_history(self, monitor_id):
        """Clear the publication history in DB so the bot thinks items are new."""
        monitor = next((m for m in self.monitors if m.id == monitor_id), None)
        if not monitor: return False
        
        try:
            log.info(f"Resetting history for monitor: {monitor.name}")
            q = "DELETE FROM published_entries_v2 WHERE platform = $1 AND guild_id = $2"
            await db._execute(q, monitor.platform, monitor.guild_id)
            return True
        except Exception as e:
            log.error(f"Error during history reset for {monitor.name}: {e}")
            return False

    async def reset_all_history(self):
        """Clear ALL publication history for ALL monitors in the entire DB."""
        try:
            log.warning("NUCLEAR ACTION: Resetting ALL publication history for ALL monitors!")
            q = "DELETE FROM published_entries_v2"
            await db._execute(q)
            return True
        except Exception as e:
            log.error(f"Error during global history reset: {e}")
            return False

    async def factory_reset(self):
        """WIPE EVERYTHING. Monitors, Settings, Premium Keys, History. Clean Slate."""
        import database
        try:
            log.critical("!!! FACTORY RESET INITIATED !!! Wiping all database tables.")
            tables = [
                "published_entries_v2", 
                "monitors", 
                "guild_settings", 
                "premium_codes", 
                "announcements", 
                "bot_statuses",
                "monitor_stats_daily"
            ]
            for table in tables:
                await db._execute(f"TRUNCATE TABLE {table} CASCADE")
            
            # Reload monitors (will be empty)
            self.monitors = []
            return True
        except Exception as e:
            log.error(f"Error during factory reset: {e}")
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
