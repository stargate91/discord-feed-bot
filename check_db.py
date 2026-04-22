import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def check_db():
    load_dotenv()
    dsn = os.getenv("DATABASE_URL")
    print(f"Connecting to: {dsn}")
    
    try:
        conn = await asyncpg.connect(dsn)
        rows = await conn.fetch("SELECT guild_id FROM guild_settings")
        print(f"\n--- DATABASE DIAGNOSTIC ---")
        print(f"Count of guilds in DB: {len(rows)}")
        print("Guild IDs found:")
        for row in rows:
            print(f" - {row['guild_id']}")
        print(f"---------------------------\n")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
