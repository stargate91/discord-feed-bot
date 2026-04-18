import asyncio
import aiohttp

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

urls = {
    "Epic": "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=hu-HU&country=HU&allowCountries=HU",
    "GamerPower (Steam)": "https://www.gamerpower.com/api/giveaways?platform=steam&sort-by=date",
    "GamerPower (GOG)": "https://www.gamerpower.com/api/giveaways?platform=gog&sort-by=date"
}

async def test_fetch():
    async with aiohttp.ClientSession() as session:
        for name, url in urls.items():
            print(f"Testing {name}...")
            try:
                async with session.get(url, headers={"User-Agent": USER_AGENT}) as response:
                    print(f"  Status: {response.status}")
                    if response.status == 200:
                        data = await response.json()
                        print(f"  Success! Found {len(data.get('data', {}).get('Catalog', {}).get('searchStore', {}).get('elements', [])) if 'epic' in url.lower() else len(data)} items.")
                    else:
                        text = await response.text()
                        print(f"  Failed. Body: {text[:200]}...")
            except Exception as e:
                print(f"  Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_fetch())
