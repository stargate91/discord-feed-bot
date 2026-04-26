import urllib.request
import json

app_id = 570  # Dota 2
url = f"https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid={app_id}&count=20"
with urllib.request.urlopen(url) as response:
    data = json.loads(response.read().decode())

for item in data.get("appnews", {}).get("newsitems", []):
    print(f"Title: {item.get('title')}")
    print(f"Feed Name: {item.get('feedname')}")
    print(f"Feed Type: {item.get('feed_type')}")
    print(f"Tags: {item.get('tags', [])}")
    print("-" * 40)
