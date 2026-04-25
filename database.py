import asyncpg
import json
from datetime import datetime
from logger import log

_pool = None

async def set_pool(pool):
    global _pool
    _pool = pool

async def get_pool():
    global _pool
    if not _pool:
        raise Exception("Database pool is not initialized.")
    return _pool

async def init_db():
    """Initialize the database and create tables."""
    pool = await get_pool()
    queries = [
        # 1. Guild Settings
        '''CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id BIGINT PRIMARY KEY,
            language TEXT DEFAULT 'en',
            admin_role_id BIGINT DEFAULT 0,
            alert_templates TEXT,
            premium_until TIMESTAMP,
            refresh_interval INTEGER DEFAULT 30,
            tier INTEGER DEFAULT 0,
            stripe_subscription_id TEXT,
            is_master BOOLEAN DEFAULT false,
            is_premium BOOLEAN DEFAULT false
        )''',
        # 2. Monitors
        '''CREATE TABLE IF NOT EXISTS monitors (
            id SERIAL PRIMARY KEY,
            guild_id BIGINT NOT NULL,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            discord_channel_id BIGINT,
            ping_role_id BIGINT,
            enabled BOOLEAN DEFAULT true,
            extra_settings TEXT,
            last_post_at TIMESTAMP WITH TIME ZONE
        )''',
        # 3. Published Entries
        '''CREATE TABLE IF NOT EXISTS published_entries_v2 (
            entry_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            guild_id BIGINT NOT NULL,
            feed_url TEXT,
            published_at TIMESTAMP,
            title TEXT,
            thumbnail_url TEXT,
            author_name TEXT,
            PRIMARY KEY (entry_id, platform, guild_id)
        )''',
        # 4. Bot Statuses
        '''CREATE TABLE IF NOT EXISTS bot_statuses (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            status_text TEXT NOT NULL
        )''',
        # 5. Global Bot Settings
        '''CREATE TABLE IF NOT EXISTS bot_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )''',
        # 6. Premium Codes
        '''CREATE TABLE IF NOT EXISTS premium_codes (
            code VARCHAR(50) PRIMARY KEY,
            duration_days INTEGER NOT NULL,
            max_uses INTEGER DEFAULT 1,
            used_count INTEGER DEFAULT 0,
            tier INTEGER DEFAULT 3,
            is_revoked BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''',
        # 7. Monitor Statistics
        '''CREATE TABLE IF NOT EXISTS monitor_stats_daily (
            date DATE NOT NULL,
            guild_id BIGINT NOT NULL,
            platform TEXT NOT NULL,
            post_count INTEGER DEFAULT 0,
            PRIMARY KEY (date, guild_id, platform)
        )''',
        # 8. Payment History
        '''CREATE TABLE IF NOT EXISTS payment_history (
            id SERIAL PRIMARY KEY,
            guild_id BIGINT NOT NULL,
            stripe_session_id TEXT UNIQUE,
            price_id TEXT,
            amount_cents INTEGER,
            currency TEXT,
            status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''',
        # 9. Premium Redemptions
        '''CREATE TABLE IF NOT EXISTS premium_redemptions (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50),
            guild_id BIGINT,
            redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''',
        '''CREATE TABLE IF NOT EXISTS announcements (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )''',
        # 11. YouTube Resolution Cache
        '''CREATE TABLE IF NOT EXISTS youtube_cache (
            query TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            title TEXT NOT NULL,
            thumbnail TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )'''
    ]



    async with pool.acquire() as conn:
        async with conn.transaction():
            for q in queries:
                await conn.execute(q)
            
            # Automatic DB schema migrations
            try:
                # Add columns if they don't exist
                await conn.execute("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS refresh_interval INTEGER")
                await conn.execute("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP")
                await conn.execute("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 0")
                await conn.execute("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT")
                await conn.execute("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true")
                await conn.execute("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false")
                await conn.execute("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false")
                
                # Migration: Update default refresh interval to 30 for free guilds
                await conn.execute("UPDATE guild_settings SET refresh_interval = 30 WHERE refresh_interval IS NULL OR (refresh_interval = 15 AND tier = 0)")
                
                # Migration: Move existing premium users to Tier 3 (Architect)
                await conn.execute("""
                    UPDATE guild_settings 
                    SET tier = 3 
                    WHERE premium_until > CURRENT_TIMESTAMP AND (tier IS NULL OR tier = 0)
                """)
                
                # Migration for Monitors table
                await conn.execute("ALTER TABLE monitors ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMP WITH TIME ZONE")

                # Migration for published_entries_v2 table
                await conn.execute("ALTER TABLE published_entries_v2 ADD COLUMN IF NOT EXISTS title TEXT")
                await conn.execute("ALTER TABLE published_entries_v2 ADD COLUMN IF NOT EXISTS thumbnail_url TEXT")
                await conn.execute("ALTER TABLE published_entries_v2 ADD COLUMN IF NOT EXISTS author_name TEXT")
                
                # Add index to speed up the recent notifications/ticker queries
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_published_entries_time ON published_entries_v2 (published_at DESC)")
                
                # Ensure premium_codes has the necessary columns
                await conn.execute("ALTER TABLE premium_codes ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 3")
                await conn.execute("ALTER TABLE premium_codes ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT false")

                # Migration: Unify TMDB platform strings in history to prevent double-posts after restart
                # 1. Update TV Series (tmdb_tv -> tv_series:lang)
                await conn.execute("""
                    UPDATE published_entries_v2 p
                    SET platform = 'tv_series:' || COALESCE(s.language, 'en')
                    FROM guild_settings s
                    WHERE p.platform = 'tmdb_tv' AND p.guild_id = s.guild_id
                """)
                # 2. Update Movies (movie -> movie:lang)
                await conn.execute("""
                    UPDATE published_entries_v2 p
                    SET platform = 'movie:' || COALESCE(s.language, 'en')
                    FROM guild_settings s
                    WHERE p.platform = 'movie' AND p.guild_id = s.guild_id
                """)

                log.info("DB Migration: Ensured schema freshness.")
            except Exception as e:
                log.warning(f"DB Migration Issue: {e}")

    log.info("Database tables initialized.")

# --- API Methods ---


async def get_all_monitors():
    q = "SELECT id, guild_id, type, name, discord_channel_id, ping_role_id, enabled, extra_settings, last_post_at FROM monitors"
    pool = await get_pool()
    rows = await pool.fetch(q)
    monitors = []
    for row in rows:
        m = {
            "id": row[0], "guild_id": row[1], "type": row[2], "name": row[3],
            "discord_channel_id": row[4], "ping_role_id": row[5], "enabled": bool(row[6]),
            "last_post_at": row[8]
        }
        if row[7]:
            try: 
                extra = json.loads(row[7])
                # Data healing: If it's double nested, flatten it
                if "extra_settings" in extra and isinstance(extra["extra_settings"], dict):
                    nested = extra.pop("extra_settings")
                    extra.update(nested)
                m.update(extra)
            except: pass
            
        if "target_channels" not in m or not m["target_channels"]:
            if m["discord_channel_id"]: m["target_channels"] = [m["discord_channel_id"]]
            else: m["target_channels"] = []
            
        if "target_roles" not in m or not m["target_roles"]:
            if m["ping_role_id"]: m["target_roles"] = [m["ping_role_id"]]
            else: m["target_roles"] = []
            
        monitors.append(m)
    return monitors

async def get_monitors_for_guild(guild_id):
    q = "SELECT id, type, name, discord_channel_id, ping_role_id, enabled, extra_settings, last_post_at FROM monitors WHERE guild_id = $1"
    pool = await get_pool()
    rows = await pool.fetch(q, guild_id)
    monitors = []
    for row in rows:
        m = {
            "id": row[0], "guild_id": guild_id, "type": row[1], "name": row[2],
            "discord_channel_id": row[3], "ping_role_id": row[4], "enabled": bool(row[5]),
            "last_post_at": row[7]
        }
        if row[6]:
            try: 
                extra = json.loads(row[6])
                # Data healing: If it's double nested, flatten it
                if "extra_settings" in extra and isinstance(extra["extra_settings"], dict):
                    nested = extra.pop("extra_settings")
                    extra.update(nested)
                m.update(extra)
            except: pass
            
        if "target_channels" not in m or not m["target_channels"]:
            if m["discord_channel_id"]: m["target_channels"] = [m["discord_channel_id"]]
            else: m["target_channels"] = []
            
        if "target_roles" not in m or not m["target_roles"]:
            if m["ping_role_id"]: m["target_roles"] = [m["ping_role_id"]]
            else: m["target_roles"] = []
            
        monitors.append(m)
    return monitors



async def update_last_post_at(monitor_id):
    q = "UPDATE monitors SET last_post_at = $1 WHERE id = $2"
    pool = await get_pool()
    await pool.execute(q, datetime.now(), monitor_id)


async def update_monitor_name(monitor_id, new_name):
    q = "UPDATE monitors SET name = $1 WHERE id = $2"
    pool = await get_pool()
    await pool.execute(q, new_name, int(monitor_id))


async def add_premium_days(guild_id, days):
    """Adds premium days to a guild. If already has premium, it stacks."""
    pool = await get_pool()
    from datetime import datetime, timedelta
    
    # Check current status
    res = await pool.fetchrow("SELECT premium_until FROM guild_settings WHERE guild_id = $1", guild_id)
    now = datetime.utcnow()
    
    if not res:
        # Create setting entry if missing
        new_expiry = now + timedelta(days=days)
        await pool.execute("INSERT INTO guild_settings (guild_id, premium_until) VALUES ($1, $2)", guild_id, new_expiry)
    else:
        current_expiry = res['premium_until']
        if not current_expiry or current_expiry < now:
            new_expiry = now + timedelta(days=days)
        else:
            new_expiry = current_expiry + timedelta(days=days)
        await pool.execute("UPDATE guild_settings SET premium_until = $2 WHERE guild_id = $1", guild_id, new_expiry)
    
    log.info(f"Premium updated for guild {guild_id}: +{days} days.")

async def log_payment(guild_id, session_id, price_id, amount, currency, status="completed"):
    """Log a payment transaction."""
    pool = await get_pool()
    q = """INSERT INTO payment_history (guild_id, stripe_session_id, price_id, amount_cents, currency, status)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (stripe_session_id) DO NOTHING"""
    await pool.execute(q, guild_id, session_id, price_id, amount, currency, status)

async def is_published(entry_id, platform, guild_id=0):
    q = "SELECT 1 FROM published_entries_v2 WHERE entry_id = $1 AND platform = $2 AND guild_id = $3"
    pool = await get_pool()
    row = await pool.fetchrow(q, entry_id, platform, guild_id)
    return row is not None

async def mark_as_published(entry_id, platform, feed_url, guild_id=0, published_at=None, title=None, thumbnail_url=None, author_name=None):
    if published_at is None: published_at = datetime.now()
    
    q = '''INSERT INTO published_entries_v2 (entry_id, platform, guild_id, feed_url, published_at, title, thumbnail_url, author_name) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (entry_id, platform, guild_id) DO UPDATE SET
               title = EXCLUDED.title,
               thumbnail_url = EXCLUDED.thumbnail_url,
               author_name = EXCLUDED.author_name
           '''
           
    pool = await get_pool()
    await pool.execute(q, entry_id, platform, guild_id, feed_url, published_at, title, thumbnail_url, author_name)

async def get_guild_settings(guild_id):
    q = "SELECT language, admin_role_id, alert_templates, premium_until, refresh_interval, tier, stripe_subscription_id FROM guild_settings WHERE guild_id = $1"
    pool = await get_pool()
    row = await pool.fetchrow(q, guild_id)
    if row:
        templates = {}
        if row[2]:
            try: templates = json.loads(row[2])
            except: pass
        return {
            "language": row[0] or "en", 
            "admin_role_id": row[1] or 0,
            "alert_templates": templates,
            "premium_until": row[3],
            "refresh_interval": row[4],
            "tier": row[5] or 0,
            "stripe_subscription_id": row[6]
        }
    return {
        "language": "en",
        "admin_role_id": 0, "alert_templates": {},
        "premium_until": None, "refresh_interval": None,
        "tier": 0, "stripe_subscription_id": None
    }

async def update_guild_settings(guild_id, language=None, alert_templates=None, admin_role_id=None, premium_until=None, refresh_interval=None, tier=None, stripe_subscription_id=None, bot=None):
    current = await get_guild_settings(guild_id)
    lang = language if language is not None else current["language"]
    a_role = admin_role_id if admin_role_id is not None else current["admin_role_id"]
    templates = alert_templates if alert_templates is not None else current["alert_templates"]
    p_until = premium_until if premium_until is not None else current["premium_until"]
    r_int = refresh_interval if refresh_interval is not None else current["refresh_interval"]
    g_tier = tier if tier is not None else current["tier"]
    sub_id = stripe_subscription_id if stripe_subscription_id is not None else current["stripe_subscription_id"]
    
    q = '''INSERT INTO guild_settings (guild_id, language, admin_role_id, alert_templates, premium_until, refresh_interval, tier, stripe_subscription_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT(guild_id) DO UPDATE SET 
               language=EXCLUDED.language, 
               admin_role_id=EXCLUDED.admin_role_id,
               alert_templates=EXCLUDED.alert_templates,
               premium_until=EXCLUDED.premium_until,
               refresh_interval=EXCLUDED.refresh_interval,
               tier=EXCLUDED.tier,
               stripe_subscription_id=EXCLUDED.stripe_subscription_id'''

    pool = await get_pool()
    await pool.execute(q, guild_id, lang, a_role, json.dumps(templates), p_until, r_int, g_tier, sub_id)
    
    # Update cache if bot instance provided
    if bot:
        bot.guild_settings_cache[guild_id] = {
            "language": lang,
            "admin_role_id": a_role,
            "alert_templates": templates,
            "premium_until": p_until,
            "refresh_interval": r_int,
            "tier": g_tier,
            "stripe_subscription_id": sub_id
        }

        log.info(f"Updated guild settings cache for {guild_id}")

async def get_bot_statuses():
    q = "SELECT id, type, status_text FROM bot_statuses"
    pool = await get_pool()
    rows = await pool.fetch(q)
    return [{"id": r[0], "type": r[1], "text": r[2]} for r in rows]

async def add_bot_status(activity_type, text):
    q = "INSERT INTO bot_statuses (type, status_text) VALUES ($1, $2)"
    pool = await get_pool()
    await pool.execute(q, activity_type, text)

async def remove_bot_status(status_id):
    q = "DELETE FROM bot_statuses WHERE id = $1"
    pool = await get_pool()
    await pool.execute(q, int(status_id))

async def update_bot_status(status_id, activity_type, text):
    q = "UPDATE bot_statuses SET type = $1, status_text = $2 WHERE id = $3"
    pool = await get_pool()
    await pool.execute(q, activity_type, text, int(status_id))

# --- Global Bot Settings ---

async def get_bot_setting(key, default=None):
    """Retrieve a global bot setting from the database."""
    q = "SELECT value FROM bot_settings WHERE key = $1"
    pool = await get_pool()
    row = await pool.fetchrow(q, key)
    if row:
        return row[0]
    return default

async def set_bot_setting(key, value):
    """Upsert a global bot setting into the database."""
    q = '''INSERT INTO bot_settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value'''
    pool = await get_pool()
    await pool.execute(q, key, str(value))

async def increment_post_stat(guild_id, platform):
    """Increment the post count for a guild/platform for the current date."""
    now_date = datetime.now().strftime("%Y-%m-%d")
    q = '''INSERT INTO monitor_stats_daily (date, guild_id, platform, post_count)
           VALUES ($1, $2, $3, 1)
           ON CONFLICT (date, guild_id, platform) 
           DO UPDATE SET post_count = monitor_stats_daily.post_count + 1'''
    pool = await get_pool()
    await pool.execute(q, now_date, guild_id, platform)

async def _fetch(query, *args):
    """Internal helper to match legacy Bot logic while moving to pool."""
    pool = await get_pool()
    return await pool.fetch(query, *args)

async def _fetchrow(query, *args):
    """Internal helper to match legacy Bot logic while moving to pool."""
    pool = await get_pool()
    return await pool.fetchrow(query, *args)

async def _execute(query, *args):
    """Internal helper to match legacy Bot logic while moving to pool."""
    pool = await get_pool()
    return await pool.execute(query, *args)

# --- Premium Codes ---


async def close():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
    log.info("Database connection closed.")
