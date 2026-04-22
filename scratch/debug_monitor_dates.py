import asyncpg
import os
import asyncio
import json

async def debug():
    # Load .env
    dsn = os.environ.get("DATABASE_URL")
    if not dsn and os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    dsn = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    
    if not dsn:
        dsn = "postgresql://postgres:postgres@localhost:5432/discord_feed_bot"
        
    conn = await asyncpg.connect(dsn)
    
    print("--- SCHEMA CHECK ---")
    mons = await conn.fetch("SELECT id, type, guild_id, extra_settings FROM monitors LIMIT 5")
    p_types = await conn.fetch("SELECT DISTINCT platform FROM published_entries_v2")
    
    print(f"Monitor Samples: {[dict(m) for m in mons]}")
    print(f"Published Platforms: {[r[0] for r in p_types]}")
    
    print("\n--- HEALING ATTEMPT ---")
    all_mons = await conn.fetch("SELECT id, type, guild_id, extra_settings FROM monitors")
    
    for m in all_mons:
        m_id = m['id']
        g_id = m['guild_id']
        m_type = m['type']
        extra = {}
        if m['extra_settings']:
            try: extra = json.loads(m['extra_settings'])
            except: pass
            
        # Try different platform names
        platforms_to_check = [m_type]
        if m_type == 'tv_series': platforms_to_check.append('tmdb_tv')
        if m_type == 'movie': platforms_to_check.append('tmdb_movie')
        if m_type == 'youtube': platforms_to_check.append('youtube')
        
        feed_url = extra.get('feed_url') or extra.get('api_url')
        
        last_at = None
        
        # Try finding by platform and guild
        for p in platforms_to_check:
            # If RSS, try matching feed_url if we have multiple
            if p == 'rss' and feed_url:
                res = await conn.fetchrow(
                    "SELECT published_at FROM published_entries_v2 WHERE guild_id = $1 AND platform = $2 AND feed_url = $3 ORDER BY published_at DESC LIMIT 1",
                    g_id, p, feed_url
                )
            else:
                res = await conn.fetchrow(
                    "SELECT published_at FROM published_entries_v2 WHERE guild_id = $1 AND platform = $2 ORDER BY published_at DESC LIMIT 1",
                    g_id, p
                )
                
            if res and res['published_at']:
                last_at = res['published_at']
                break
        
        if last_at:
            await conn.execute("UPDATE monitors SET last_post_at = $1 WHERE id = $2", last_at, m_id)
            print(f"Fixed Monitor {m_id} ({m_type}): {last_at}")
        else:
            # TRY GLOBAL CHECK (guild_id = 0)
            for p in platforms_to_check:
                if p == 'rss' and feed_url:
                    res = await conn.fetchrow(
                        "SELECT published_at FROM published_entries_v2 WHERE (guild_id = $1 OR guild_id = 0) AND platform = $2 AND feed_url = $3 ORDER BY published_at DESC LIMIT 1",
                        g_id, p, feed_url
                    )
                else:
                    res = await conn.fetchrow(
                        "SELECT published_at FROM published_entries_v2 WHERE (guild_id = $1 OR guild_id = 0) AND platform = $2 ORDER BY published_at DESC LIMIT 1",
                        g_id, p
                    )
                
                if res and res['published_at']:
                    last_at = res['published_at']
                    break
            
            if last_at:
                await conn.execute("UPDATE monitors SET last_post_at = $1 WHERE id = $2", last_at, m_id)
                print(f"Fixed Monitor {m_id} ({m_type}) via GLOBAL/GUILD fallback: {last_at}")
            else:
                 print(f"Monitor {m_id} ({m_type}) really has NO history.")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug())
