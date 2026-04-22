import asyncio
import os
from database import get_pool

async def migrate():
    print("Starting migration...")
    pool = await get_pool()
    try:
        await pool.execute('ALTER TABLE premium_codes ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE')
        print("Successfully added is_revoked column to premium_codes.")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(migrate())
