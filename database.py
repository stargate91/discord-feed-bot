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
        # ... (other tables)
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
        )'''
    ]

    async with pool.acquire() as conn:
        async with conn.transaction():
            for q in queries:
                await conn.execute(q)
            
            # Automatic DB schema migrations
            try:
                # Add refresh_interval if it doesn't exist
                await conn.execute("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS refresh_interval INTEGER")
                # Drop deprecated master_role_id and admin_channel_id
                await conn.execute("ALTER TABLE guild_settings DROP COLUMN IF EXISTS master_role_id")
                await conn.execute("ALTER TABLE guild_settings DROP COLUMN IF EXISTS admin_channel_id")
                log.info("DB Migration: Ensured schema freshness.")
            except Exception as e:
                log.warning(f"DB Migration Issue (safe to ignore if already exists): {e}")

    log.info("Database tables initialized.")

# --- API Methods ---

async def add_monitor(m_config, guild_id):
    extra_settings = m_config.copy()
    for k in ["type", "name", "discord_channel_id", "ping_role_id", "target_channels", "target_roles", "enabled", "id", "guild_id"]:
        extra_settings.pop(k, None)
        
    extra_settings["target_channels"] = m_config.get("target_channels", [])
    extra_settings["target_roles"] = m_config.get("target_roles", [])

    q = '''INSERT INTO monitors (guild_id, type, name, discord_channel_id, ping_role_id, enabled, extra_settings)
           VALUES ($1, $2, $3, $4, $5, $6, $7)'''
    
    args = (
        guild_id, m_config.get('type'), m_config.get('name'),
        0, 0,
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
            
        if "target_channels" not in m or not m["target_channels"]:
            if m["discord_channel_id"]: m["target_channels"] = [m["discord_channel_id"]]
            else: m["target_channels"] = []
            
        if "target_roles" not in m or not m["target_roles"]:
            if m["ping_role_id"]: m["target_roles"] = [m["ping_role_id"]]
            else: m["target_roles"] = []
            
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
            
        if "target_channels" not in m or not m["target_channels"]:
            if m["discord_channel_id"]: m["target_channels"] = [m["discord_channel_id"]]
            else: m["target_channels"] = []
            
        if "target_roles" not in m or not m["target_roles"]:
            if m["ping_role_id"]: m["target_roles"] = [m["ping_role_id"]]
            else: m["target_roles"] = []
            
        monitors.append(m)
    return monitors

async def update_monitor_status(monitor_id, guild_id, is_enabled):
    q = "UPDATE monitors SET enabled = $1 WHERE id = $2 AND guild_id = $3"
    pool = await get_pool()
    await pool.execute(q, bool(is_enabled), monitor_id, guild_id)

async def update_monitor_details(monitor_id, guild_id, name, target_channels, target_roles, embed_color=None, steam_patch_only=None, target_genres=None):
    q_sel = "SELECT extra_settings FROM monitors WHERE id = $1 AND guild_id = $2"
    pool = await get_pool()
    row = await pool.fetchrow(q_sel, monitor_id, guild_id)
    
    if not row:
        return # Should not happen if monitor exists
    
    extra_settings_json = row[0]
    extra_settings = {}
    if extra_settings_json:
        try: extra_settings = json.loads(extra_settings_json)
        except: pass
    
    if target_channels is not None:
        if len(target_channels) == 1 and target_channels[0] == -1:
            extra_settings["target_channels"] = []
        elif len(target_channels) > 0:
            extra_settings["target_channels"] = target_channels
            
    if target_roles is not None:
        if len(target_roles) == 1 and target_roles[0] == -1:
            extra_settings["target_roles"] = []
        elif len(target_roles) > 0:
            extra_settings["target_roles"] = target_roles
        
    if embed_color is not None:
        if embed_color.strip(): extra_settings["embed_color"] = embed_color.strip()
        else: extra_settings.pop("embed_color", None)

    if steam_patch_only is not None:
        extra_settings["steam_patch_only"] = steam_patch_only
        
    if target_genres is not None:
        extra_settings["target_genres"] = target_genres
        
    q_upd = '''UPDATE monitors SET name = $1, extra_settings = $2 
               WHERE id = $3 AND guild_id = $4'''
    
    await pool.execute(q_upd, name, json.dumps(extra_settings), monitor_id, guild_id)
    log.info(f"Monitor {monitor_id} updated in DB: name={name}, chs={extra_settings.get('target_channels', [])}, roles={extra_settings.get('target_roles', [])}")

async def remove_monitor(monitor_id, guild_id):
    q = "DELETE FROM monitors WHERE id = $1 AND guild_id = $2"
    pool = await get_pool()
    await pool.execute(q, monitor_id, guild_id)

async def remove_all_monitors(guild_id):
    q = "DELETE FROM monitors WHERE guild_id = $1"
    pool = await get_pool()
    await pool.execute(q, guild_id)

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

async def mark_as_published(entry_id, platform, feed_url, guild_id=0, published_at=None):
    if published_at is None: published_at = datetime.now()
    
    q = '''INSERT INTO published_entries_v2 (entry_id, platform, guild_id, feed_url, published_at) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT DO NOTHING'''
           
    pool = await get_pool()
    await pool.execute(q, entry_id, platform, guild_id, feed_url, published_at)

async def get_guild_settings(guild_id):
    q = "SELECT language, admin_role_id, alert_templates, premium_until, refresh_interval FROM guild_settings WHERE guild_id = $1"
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
            "refresh_interval": row[4]
        }
    return {
        "language": "en",
        "admin_role_id": 0, "alert_templates": {},
        "premium_until": None, "refresh_interval": None
    }

async def update_guild_settings(guild_id, language=None, alert_templates=None, admin_role_id=None, premium_until=None, refresh_interval=None, bot=None):
    current = await get_guild_settings(guild_id)
    lang = language if language is not None else current["language"]
    a_role = admin_role_id if admin_role_id is not None else current["admin_role_id"]
    templates = alert_templates if alert_templates is not None else current["alert_templates"]
    p_until = premium_until if premium_until is not None else current["premium_until"]
    r_int = refresh_interval if refresh_interval is not None else current["refresh_interval"]
    
    q = '''INSERT INTO guild_settings (guild_id, language, admin_role_id, alert_templates, premium_until, refresh_interval)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT(guild_id) DO UPDATE SET 
               language=EXCLUDED.language, 
               admin_role_id=EXCLUDED.admin_role_id,
               alert_templates=EXCLUDED.alert_templates,
               premium_until=EXCLUDED.premium_until,
               refresh_interval=EXCLUDED.refresh_interval'''

    pool = await get_pool()
    await pool.execute(q, guild_id, lang, a_role, json.dumps(templates), p_until, r_int)
    
    # Update cache if bot instance provided
    if bot:
        bot.guild_settings_cache[guild_id] = {
            "language": lang,
            "admin_role_id": a_role,
            "alert_templates": templates,
            "premium_until": p_until,
            "refresh_interval": r_int
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

# --- Premium Codes ---

async def create_premium_code(code: str, duration_days: int, max_uses: int = 1):
    q = "INSERT INTO premium_codes (code, duration_days, max_uses, created_at) VALUES ($1, $2, $3, $4)"
    pool = await get_pool()
    await pool.execute(q, code, duration_days, max_uses, datetime.now())

async def get_premium_code(code: str):
    q = "SELECT code, duration_days, max_uses, used_count, created_at FROM premium_codes WHERE code = $1"
    pool = await get_pool()
    return await pool.fetchrow(q, code)

async def redeem_premium_code(code: str, guild_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Check code validity with a lock
            row = await conn.fetchrow("SELECT duration_days, max_uses, used_count FROM premium_codes WHERE code = $1 FOR UPDATE", code)
            if not row:
                return False, "Invalid Code"
            
            duration_days = row['duration_days']
            max_uses = row['max_uses']
            used_count = row['used_count']
            
            if used_count >= max_uses:
                return False, "Code already used"
                
            # Valid code, increment used_count
            await conn.execute("UPDATE premium_codes SET used_count = used_count + 1 WHERE code = $1", code)
            
            # Fetch current guild premium settings
            g_row = await conn.fetchrow("SELECT premium_until FROM guild_settings WHERE guild_id = $1", guild_id)
            current_until = g_row['premium_until'] if g_row else None
            
            from datetime import timedelta
            now = datetime.now()
            
            # Lifetime logic
            if duration_days == 0:
                new_until = datetime(2099, 12, 31)
            else:
                if current_until and current_until > now:
                    new_until = current_until + timedelta(days=duration_days)
                else:
                    new_until = now + timedelta(days=duration_days)
                    
            # Insert or Update guild settings directly inside existing transaction
            q_update = '''INSERT INTO guild_settings (guild_id, premium_until) VALUES ($1, $2)
                          ON CONFLICT (guild_id) DO UPDATE SET premium_until = EXCLUDED.premium_until'''
            await conn.execute(q_update, guild_id, new_until)
            
            return True, new_until

async def get_premium_codes(filter_type: str = "all"):
    pool = await get_pool()
    if filter_type == "used":
        q = "SELECT code, duration_days, max_uses, used_count, created_at FROM premium_codes WHERE used_count >= max_uses ORDER BY created_at DESC"
    elif filter_type == "unused":
        q = "SELECT code, duration_days, max_uses, used_count, created_at FROM premium_codes WHERE used_count < max_uses ORDER BY created_at DESC"
    else:
        q = "SELECT code, duration_days, max_uses, used_count, created_at FROM premium_codes ORDER BY created_at DESC"
    return await pool.fetch(q)

async def delete_premium_code(code: str):
    pool = await get_pool()
    await pool.execute("DELETE FROM premium_codes WHERE code = $1", code)

async def revoke_guild_premium(guild_id: int):
    pool = await get_pool()
    q = "UPDATE guild_settings SET premium_until = NULL WHERE guild_id = $1"
    await pool.execute(q, guild_id)

async def close():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
    log.info("Database connection closed.")
