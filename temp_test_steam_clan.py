import urllib.request

domains = [
    "https://clan.akamai.steamstatic.com/images",
    "https://cdn.akamai.steamstatic.com/steamcommunity/public/images/clans",
    "https://clan.cloudflare.steamstatic.com/images"
]

path = "/3703047/c09b13cda87a548b83b626fb33a32efd7895c634.png"

for domain in domains:
    url = domain + path
    try:
        with urllib.request.urlopen(url) as response:
            print(f"Success: {url} (Status: {response.status})")
    except Exception as e:
        print(f"Failed: {url} (Error: {e})")
