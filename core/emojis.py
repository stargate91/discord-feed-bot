"""
Centralized storage for all emojis and icon URLs used throughout the bot.
This allows for easy modification of the bot's visual style from a single location.
"""

# UI Navigation and Action Icons
# Icons for /monitor list and select menus
TYPE_YOUTUBE = "<:youtube:1495845103447576807>"
TYPE_RSS = "<:rss:1495845175753314465>"
TYPE_EPIC = "<:epicgames:1495845172913639575>"
TYPE_STEAM = "<:steam2:1495845362441650196>"
TYPE_GOG = "<:gog2:1495845360684372170>"
TYPE_STREAM = "<:twitch:1495846084352934139>"
TYPE_TMDB_MOVIE = "<:tmdb:1495845178945044590>"
TYPE_TMDB_TV = "<:tmdb:1495845178945044590>"
TYPE_CRYPTO = "<:crypto:1495846010197381160>"
TYPE_GITHUB = "<:gitgub:1495845732874321980>"
TYPE_UNKNOWN = "<:unknown:1495845180421570700>"

ICON_CLOSE = "<:xfilledcircle:1495830088523059341>"         # Újraküldésnél / Csatorna törlésnél
ICON_STAR = "<:starrating:1495846370932691057>"           # Értékelések (TV/Movie)

# General Status Markers
# Consistent feedback markers used in bot messages
STATUS_SUCCESS = "<:checkfilledcircle:1495829946248200414>"
STATUS_ERROR = "<:xfilledcircle:1495830088523059341>"
STATUS_WARNING = "<:warningfilledcircle:1495831204208050369>"
STATUS_INFO = "<:infofilledcircle:1495831063597940998>"

# Custom Discord Emoji URLs (Thumbnails)
# Custom icons hosted on Discord CDN for specific specialized monitor embeds
THUMBNAIL_STEAM = "https://cdn.discordapp.com/emojis/1490131413956038656.png"
THUMBNAIL_GOG = "https://cdn.discordapp.com/emojis/1490131412043431976.png"
THUMBNAIL_EPIC = "https://cdn.discordapp.com/emojis/1490131410852253716.png"

# Crypto Specific Icons
CRYPTO_UP = "<:chartincreaseoutlined:1496133105394651177>"
CRYPTO_DOWN = "<:chartdecreasedoutlined:1496133103750742188>"
CRYPTO_BULLET_FILLED = "●"
CRYPTO_BULLET_EMPTY = "○"
CRYPTO_CHART_COLORFUL = "<:barchartlinecolorful:1495853051569901629>"
