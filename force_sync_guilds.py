import asyncio
import asyncpg
import discord
import os
from dotenv import load_dotenv

async def force_sync():
    load_dotenv()
    token = os.getenv("BOT_TOKEN")
    dsn = os.getenv("DATABASE_URL")
    
    print("Starting Force Sync...")
    
    # Initialize discord client just to get guilds
    intents = discord.Intents.default()
    client = discord.Client(intents=intents)
    
    @client.event
    async def on_ready():
        print(f"Logged in as {client.user}")
        print(f"Bot is in {len(client.guilds)} guilds.")
        
        try:
            conn = await asyncpg.connect(dsn)
            synced = 0
            for guild in client.guilds:
                print(f"Checking guild: {guild.name} ({guild.id})")
                res = await conn.execute(
                    "INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING",
                    guild.id
                )
                if res == "INSERT 0 1":
                    print(f" -> REGISTERED NEW GUILD!")
                    synced += 1
                else:
                    print(f" -> Already in DB.")
            
            print(f"\nSUCCESS: Synced {synced} new guilds.")
            await conn.close()
        except Exception as e:
            print(f"Database Error: {e}")
        finally:
            await client.close()

    await client.start(token)

if __name__ == "__main__":
    try:
        asyncio.run(force_sync())
    except KeyboardInterrupt:
        pass
