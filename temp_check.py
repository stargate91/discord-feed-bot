import asyncio
from database import get_all_monitors

async def main():
    m = await get_all_monitors()
    print(len([x for x in m if 'Critical Drinker' in x['name']]))
    for x in m:
        if 'Critical Drinker' in x['name']:
            print(x['id'], x['name'], x['guild_id'])

asyncio.run(main())
