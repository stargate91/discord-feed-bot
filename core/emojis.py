"""
Centralized storage for all emojis and icon URLs used throughout the bot.
This allows for easy modification of the bot's visual style from a single location.
"""

# UI Navigation and Action Icons
ICON_LOCATION = "📍"     # Used in channel selection (Current Channel)
ICON_SETTINGS = "⚙️"      # Used for default settings options
ICON_ADD = "➕"           # Used for 'Create New' actions
ICON_ID = "🆔"           # Used for manual ID/Name input options
ICON_MUTE = "🔇"          # Used for 'No Ping' or 'None' role options
ICON_DOT = "⏺️"           # Used for 'Keep Unchanged' options
ICON_CLOSE = "❌"         # Used for 'Cancel' or 'None' channel selections
ICON_LIST = "📋"          # Header icon for monitor list embeds
ICON_STAR = "⭐"           # Used for ratings/scores (e.g., TMDB)

# Platform and Feed Type Icons
# Used in Wizard platform selection, /monitor list, and Feed Embeds
TYPE_YOUTUBE = "📺"
TYPE_RSS = "🔗"
TYPE_TIKTOK = "🎵"
TYPE_INSTAGRAM = "📸"
TYPE_GAME = "🎮"          # Steam News, Epic Games, TMDB Movies/TV
TYPE_STREAM = "📡"         # Twitch, Kick
TYPE_REDDIT = "🟠"
TYPE_TWITTER = "🐦"
TYPE_STEAM_FREE = "♨️"     # Specialized Steam Free monitor
TYPE_GOG_FREE = "💜"       # Specialized GOG Free monitor
TYPE_UNKNOWN = "❓"        # Fallback for undefined types

# General Status Markers
# Consistent feedback markers used in bot messages
STATUS_SUCCESS = "✅"
STATUS_ERROR = "❌"
STATUS_WARNING = "⚠️"
STATUS_INFO = "ℹ️"

# Custom Discord Emoji URLs (Thumbnails)
# Custom icons hosted on Discord CDN for specific specialized monitor embeds
THUMBNAIL_STEAM = "https://cdn.discordapp.com/emojis/1490131413956038656.png"
THUMBNAIL_GOG = "https://cdn.discordapp.com/emojis/1490131412043431976.png"
THUMBNAIL_EPIC = "https://cdn.discordapp.com/emojis/1490131410852253716.png"
