import urllib.request

url = "https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg"
try:
    with urllib.request.urlopen(url) as response:
        print(f"Status: {response.status}")
except Exception as e:
    print(f"Error: {e}")
