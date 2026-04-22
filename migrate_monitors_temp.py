import asyncpg
import os
import asyncio

async def migrate():
    # Try to load .env
    dsn = os.environ.get("DATABASE_URL")
    if not dsn and os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    dsn = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    
    if not dsn:
        dsn = "postgresql://postgres:postgres@localhost:5432/discord_feed_bot"
        
    print(f"Connecting to database...")
    pool = await asyncpg.create_pool(dsn)
    async with pool.acquire() as conn:
        print("Checking schema...")
        # 1. Add last_post_at to monitors
        await conn.execute("ALTER TABLE monitors ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMP")
        
        # 2. Add is_revoked to premium_codes (Double check from previous turn)
        await conn.execute("ALTER TABLE premium_codes ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE")
        
        print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
