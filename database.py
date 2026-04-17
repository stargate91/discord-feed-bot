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
        # 1. Monitors
        '''CREATE TABLE IF NOT EXISTS monitors (
            id SERIAL PRIMARY KEY,
            guild_id BIGINT NOT NULL,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            discord_channel_id BIGINT NOT NULL,
            ping_role_id BIGINT,
            enabled BOOLEAN DEFAULT TRUE,
            extra_settings TEXT
        )''',
        # 2. Published entries v2
        '''CREATE TABLE IF NOT EXISTS published_entries_v2 (
            entry_id TEXT,
            platform TEXT,
            guild_id BIGINT,
            feed_url TEXT,
            published_at TIMESTAMP,
            PRIMARY KEY (entry_id, platform, guild_id)
        )''',
        # 3. Guild settings
        '''CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id BIGINT PRIMARY KEY,
            language TEXT DEFAULT 'en',
            default_channel_id BIGINT,
            default_ping_role_id BIGINT,
            admin_role_id BIGINT DEFAULT 0,
            admin_channel_id BIGINT DEFAULT 0,
            master_role_id BIGINT DEFAULT 0,
            alert_templates TEXT
        )''',
        # 4. Monitor stats daily
        '''CREATE TABLE IF NOT EXISTS monitor_stats_daily (
            date TEXT,
            guild_id BIGINT,
            platform TEXT,
            post_count INTEGER DEFAULT 1,
            PRIMARY KEY (date, guild_id, platform)
        )''',
        # 5. Bot statuses
        '''CREATE TABLE IF NOT EXISTS bot_statuses (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL DEFAULT 'watching',
            status_text TEXT NOT NULL
        )''',
        # 6. Global Bot Settings
        '''CREATE TABLE IF NOT EXISTS bot_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )'''
    ]

    async with pool.acquire() as conn:
        async with conn.transaction():
            for q in queries:
                await conn.execute(q)
    log.info("Database tables initialized.")

# --- API Methods ---

async def add_monitor(m_config, guild_id):
    extra_settings = m_config.copy()
    for k in ["type", "name", "discord_channel_id", "ping_role_id", "enabled", "id", "guild_id"]:
        extra_settings.pop(k, None)
        
    q = '''INSERT INTO monitors (guild_id, type, name, discord_channel_id, ping_role_id, enabled, extra_settings)
           VALUES ($1, $2, $3, $4, $5, $6, $7)'''
    
    args = (
        guild_id, m_config.get('type'), m_config.get('name'),
        m_config.get('discord_channel_id'), m_config.get('ping_role_id', 0),
        bool(m_config.get('enabled', True)),
        json.dumps(extra_settings)
    )
    
    pool = await get_pool()
    await pool.execute(q, *args)

async def get_all_monitors():
    q = "SELECT id, guild_id, type, name, discord_channel_id, ping_role_id, enabled, extra_settings FROM monitors"
    pool = await get_pool()
    rows = await pool.fetch(q)
    monitors = []
    for row in rows:
        m = {
            "id": row[0], "guild_id": row[1], "type": row[2], "name": row[3],
            "discord_channel_id": row[4], "ping_role_id": row[5], "enabled": bool(row[6])
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
        monitors.append(m)
    return monitors

async def get_monitors_for_guild(guild_id):
    q = "SELECT id, type, name, discord_channel_id, ping_role_id, enabled, extra_settings FROM monitors WHERE guild_id = $1"
    pool = await get_pool()
    rows = await pool.fetch(q, guild_id)
    monitors = []
    for row in rows:
        m = {
            "id": row[0], "guild_id": guild_id, "type": row[1], "name": row[2],
            "discord_channel_id": row[3], "ping_role_id": row[4], "enabled": bool(row[5])
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
        monitors.append(m)
    return monitors

async def update_monitor_status(monitor_id, guild_id, is_enabled):
    q = "UPDATE monitors SET enabled = $1 WHERE id = $2 AND guild_id = $3"
    pool = await get_pool()
    await pool.execute(q, bool(is_enabled), monitor_id, guild_id)

async def update_monitor_details(monitor_id, guild_id, name, discord_channel_id, ping_role_id, embed_color=None):
    q_sel = "SELECT discord_channel_id, ping_role_id, extra_settings FROM monitors WHERE id = $1 AND guild_id = $2"
    pool = await get_pool()
    row = await pool.fetchrow(q_sel, monitor_id, guild_id)
    
    if not row:
        return # Should not happen if monitor exists
        
    curr_ch = row[0]
    curr_role = row[1]
    extra_settings_json = row[2]
    
    # Use current if new value is None
    final_ch = discord_channel_id if discord_channel_id is not None else curr_ch
    final_role = ping_role_id if ping_role_id is not None else curr_role
    
    extra_settings = {}
    if extra_settings_json:
        try: extra_settings = json.loads(extra_settings_json)
        except: pass
        
    if embed_color is not None:
        if embed_color.strip(): extra_settings["embed_color"] = embed_color.strip()
        else: extra_settings.pop("embed_color", None)
        
    q_upd = '''UPDATE monitors SET name = $1, discord_channel_id = $2, 
               ping_role_id = $3, extra_settings = $4 
               WHERE id = $5 AND guild_id = $6'''
    
    await pool.execute(q_upd, name, final_ch, final_role, json.dumps(extra_settings), monitor_id, guild_id)

async def remove_monitor(monitor_id, guild_id):
    q = "DELETE FROM monitors WHERE id = $1 AND guild_id = $2"
    pool = await get_pool()
    await pool.execute(q, monitor_id, guild_id)

async def is_published(entry_id, platform, guild_id=0):
    q = "SELECT 1 FROM published_entries_v2 WHERE entry_id = $1 AND platform = $2 AND guild_id = $3"
    pool = await get_pool()
    row = await pool.fetchrow(q, entry_id, platform, guild_id)
    return row is not None

async def mark_as_published(entry_id, platform, feed_url, guild_id=0, published_at=None):
    if published_at is None: published_at = datetime.now()
    
    q = '''INSERT INTO published_entries_v2 (entry_id, platform, guild_id, feed_url, published_at) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT DO NOTHING'''
           
    pool = await get_pool()
    await pool.execute(q, entry_id, platform, guild_id, feed_url, published_at)

async def get_guild_settings(guild_id):
    q = "SELECT language, default_channel_id, default_ping_role_id, admin_role_id, admin_channel_id, master_role_id, alert_templates FROM guild_settings WHERE guild_id = $1"
    pool = await get_pool()
    row = await pool.fetchrow(q, guild_id)
    if row:
        templates = {}
        if row[6]:
            try: templates = json.loads(row[6])
            except: pass
        return {
            "language": row[0] or "en", 
            "default_channel_id": row[1],
            "default_ping_role_id": row[2], 
            "admin_role_id": row[3] or 0,
            "admin_channel_id": row[4] or 0,
            "master_role_id": row[5] or 0,
            "alert_templates": templates
        }
    return {
        "language": "en", "default_channel_id": None, "default_ping_role_id": None, 
        "admin_role_id": 0, "admin_channel_id": 0, "master_role_id": 0, "alert_templates": {}
    }

async def update_guild_settings(guild_id, language=None, default_channel_id=None, default_ping_role_id=None, alert_templates=None, admin_role_id=None, admin_channel_id=None, master_role_id=None, bot=None):
    current = await get_guild_settings(guild_id)
    lang = language if language is not None else current["language"]
    ch_id = default_channel_id if default_channel_id is not None else current["default_channel_id"]
    role_id = default_ping_role_id if default_ping_role_id is not None else current["default_ping_role_id"]
    a_role = admin_role_id if admin_role_id is not None else current["admin_role_id"]
    a_chan = admin_channel_id if admin_channel_id is not None else current["admin_channel_id"]
    m_role = master_role_id if master_role_id is not None else current["master_role_id"]
    templates = alert_templates if alert_templates is not None else current["alert_templates"]
    
    q = '''INSERT INTO guild_settings (guild_id, language, default_channel_id, default_ping_role_id, admin_role_id, admin_channel_id, master_role_id, alert_templates)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT(guild_id) DO UPDATE SET 
               language=EXCLUDED.language, default_channel_id=EXCLUDED.default_channel_id, 
               default_ping_role_id=EXCLUDED.default_ping_role_id, admin_role_id=EXCLUDED.admin_role_id,
               admin_channel_id=EXCLUDED.admin_channel_id, master_role_id=EXCLUDED.master_role_id, 
               alert_templates=EXCLUDED.alert_templates'''

    pool = await get_pool()
    await pool.execute(q, guild_id, lang, ch_id, role_id, a_role, a_chan, m_role, json.dumps(templates))
    
    # Update cache if bot instance provided
    if bot:
        bot.guild_settings_cache[guild_id] = {
            "language": lang,
            "default_channel_id": ch_id,
            "default_ping_role_id": role_id,
            "admin_role_id": a_role,
            "admin_channel_id": a_chan,
            "master_role_id": m_role,
            "alert_templates": templates
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

async def close():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
    log.info("Database connection closed.")
