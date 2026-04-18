# Discord Feed Bot

A Discord bot that monitors various sources and posts updates to your server channels. It supports YouTube, generic RSS feeds, and free game giveaways from Epic Games, Steam and GOG.

I built this because I wanted a single bot that could track all my favorite content creators and also let me know when free games pop up. It runs in the background and checks for new stuff on a configurable interval.

## Features

- **YouTube** - Monitors channels via their official RSS feed
- **Generic RSS** - Can monitor any standard RSS/Atom feed
- **Generic RSS** - Can monitor any standard RSS/Atom feed
- **Epic Games Store** - Checks for currently free games and optionally upcoming ones using Epic's store API
- **Steam** - Monitors free game giveaways via GamerPower API
- **GOG** - Dual-source monitoring using GOG's catalog API and GamerPower

### Other stuff

- Per-channel role pinging (set a role ID and it gets mentioned at the top of every notification)
- Multi-language support (Hungarian and English included, easy to add more)
- SQLite database to track what's already been posted so you don't get duplicate notifications
- Configurable check interval
- Rich Discord embeds with images when available

## Requirements

- Python 3.10+
- A Discord bot token

## Setup

1. Clone the repo

```
git clone <your-repo-url>
cd discord_feed_bot
```

2. Install dependencies

```
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory

```
DISCORD_TOKEN=your_bot_token_here
```

4. Edit `config.json` to set up your monitors (see Configuration below)

5. Run the bot

```
python main.py
```

## Configuration

Everything is configured through `config.json`. Here's what the top-level options do:

| Key | Description | Default |
|-----|-------------|---------|
| `language` | Language code for notifications (`hu` or `en`) | `hu` |
| `database_path` | Path to the SQLite database file | `data/feed_bot.db` |
| `refresh_interval_minutes` | How often to check for updates (in minutes) | `10` |

### Monitors

The `monitors` array contains all the sources you want to track. Each monitor has some shared fields:

| Field | Description | Required |
|-------|-------------|----------|
| `type` | The monitor type (see below) | Yes |
| `name` | A friendly name for logging | Yes |
| `discord_channel_id` | The Discord channel ID where notifications go | Yes |
| `ping_role_id` | Role ID to mention in notifications. Set to `0` for no ping | No |
| `enabled` | Whether this monitor is active | No (default: true) |

### Monitor Types

#### youtube

Monitors a YouTube channel for new video uploads.

```json
{
    "type": "youtube",
    "name": "My Favorite YouTuber",
    "channel_id": "UC_x5XG1OV2P6uYZ5gzMCURQ",
    "discord_channel_id": 123456789,
    "ping_role_id": 0,
    "enabled": true
}
```

- `channel_id` - The YouTube channel ID (the part after `/channel/` in the URL)

#### rss

A generic monitor for any standard RSS or Atom feed.

```json
{
    "type": "rss",
    "name": "Some Blog",
    "rss_url": "https://example.com/feed.xml",
    "discord_channel_id": 123456789,
    "ping_role_id": 0,
    "enabled": true
}
```

- `rss_url` - The full URL to the RSS/Atom feed

#### epic_games

Monitors Epic Games Store for free game promotions.

```json
{
    "type": "epic_games",
    "name": "Epic Free Games",
    "include_upcoming": true,
    "discord_channel_id": 123456789,
    "ping_role_id": 0,
    "enabled": true
}
```

- `include_upcoming` - If `true`, also notifies about games that will be free next week (default: `false`)

#### steam_free

Monitors Steam for free game giveaways via the GamerPower API.

```json
{
    "type": "steam_free",
    "name": "Steam Free Stuff",
    "include_dlc": false,
    "discord_channel_id": 123456789,
    "ping_role_id": 0,
    "enabled": true
}
```

- `include_dlc` - If `true`, also notifies about free DLC content (default: `false`)

#### gog_free

Monitors GOG.com for free game giveaways.

```json
{
    "type": "gog_free",
    "name": "GOG Freebies",
    "discord_channel_id": 123456789,
    "ping_role_id": 0,
    "enabled": true
}
```

This one uses two sources: GOG's own catalog API for permanently free games, and GamerPower for temporary giveaway promotions.

## Project Structure

```
discord_feed_bot/
  main.py              - Entry point, sets up the bot and loads monitors
  config.json          - All configuration lives here
  config_loader.py     - Loads config and merges with .env
  database.py          - SQLite wrapper for tracking published items
  logger.py            - Logging setup with colors
  requirements.txt     - Python dependencies
  .env                 - Discord token (not committed)
  core/
    base_monitor.py    - Abstract base class for all monitors
    monitor_manager.py - Runs the check loop on an interval
  monitors/
    youtube_monitor.py
    rss_monitor.py
    epic_games_monitor.py
    steam_free_monitor.py
    gog_free_monitor.py
  locales/
    hu.json            - Hungarian translations
    en.json            - English translations
  data/
    feed_bot.db        - SQLite database (auto-created)
```

## Adding a New Language

1. Copy `locales/en.json` to `locales/xx.json` where `xx` is your language code
2. Translate all the values
3. Set `"language": "xx"` in `config.json`

## How It Works

When the bot starts up it loads all enabled monitors from `config.json`. On the first run it seeds the database with existing content so you don't get spammed with old posts. After that it checks each monitor on the configured interval and only sends notifications for new items.

Each monitor stores a unique identifier for every item it has seen (video ID, post link, game ID, etc.) in the SQLite database. This way even if you restart the bot it remembers what it already posted.

## Known Limitations

- The GamerPower API sometimes includes old giveaways that are technically still "active"
- GOG doesn't have an official giveaway API so detection might not catch every promotion instantly

## License

Do whatever you want with it.
