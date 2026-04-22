import asyncpg
import os
import asyncio

async def heal_dates():
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
        
    print("Healing monitor dates from published_entries_v2...")
    pool = await asyncpg.create_pool(dsn)
    async with pool.acquire() as conn:
        # Get all monitors
        monitors = await conn.fetch("SELECT id, guild_id, type FROM monitors")
        
        for m in monitors:
            m_id = m['id']
            g_id = m['guild_id']
            m_type = m['type']
            
            # Find last published entry for this guild and platform
            # Note: mapping is sometimes different (tmdb_tv vs tv_series)
            platform = m_type
            if platform == 'tv_series': platform = 'tmdb_tv'
            if platform == 'movie': platform = 'tmdb_movie'
            
            last_entry = await conn.fetchrow(
                "SELECT published_at FROM published_entries_v2 WHERE guild_id = $1 AND platform = $2 ORDER BY published_at DESC LIMIT 1",
                g_id, platform
            )
            
            if last_entry and last_entry['published_at']:
                await conn.execute(
                    "UPDATE monitors SET last_post_at = $1 WHERE id = $2",
                    last_entry['published_at'], m_id
                )
                print(f"Updated Monitor {m_id} with date: {last_entry['published_at']}")
            else:
                print(f"No previous entries found for Monitor {m_id}")

    await pool.close()
    print("Healing complete.")

if __name__ == "__main__":
    asyncio.run(heal_dates())
