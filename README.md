# Discord Feed Monitor Bot

A comprehensive Discord bot designed to monitor various content sources and deliver high-quality notifications to your server. This bot supports a wide range of platforms including social media, gaming stores, streaming services, and developer tools.

## Supported Platforms

- YouTube: Track new video uploads from any channel.
- RSS Feeds: Monitor any standard RSS or Atom feed.
- Gaming Giveaways: Automatic alerts for free games on Epic Games Store, Steam, and GOG.com.
- Live Streams: Notifications for Twitch (via official Helix API) and Kick.
- Steam News: Monitoring of game-specific updates and patch notes.
- Media (TMDB): Track new movie and TV series releases with metadata and trailers.
- Cryptocurrency: Price threshold monitoring and alerts for various tokens.
- GitHub: Release and version tracking for repositories.

## Key Features

- Interactive Setup: A user-friendly configuration experience using Discord slash commands, buttons, and modals.
- Persistent Storage: Utilizes a PostgreSQL database to manage guild configurations and prevent duplicate notifications.
- Localized Timestamps: Notifications include Discord native timestamps that adjust to each user's local timezone.
- Custom Alerts: Ability to set custom ping roles and personalized alert messages per feed or platform.
- Multi-language Support: Fully localized for English and Hungarian, with support for more languages via JSON locale files.
- Master Administration: Centralized global controls for bot owners to manage refresh intervals, status rotation, and global logging.

## Requirements

- Python 3.10 or higher
- PostgreSQL Database
- Discord Bot Token

## Installation

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd discord-feed-bot
   ```

2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

3. Create and configure the `.env` file in the root directory:
   ```env
   BOT_TOKEN=your_discord_bot_token
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   TMDB_API_KEY=your_tmdb_api_key
   TWITCH_CLIENT_ID=your_twitch_client_id
   TWITCH_CLIENT_SECRET=your_twitch_client_secret
   GITHUB_TOKEN=your_github_token
   ```

4. Run the application:
   ```bash
   python main.py
   ```

## Configuration

The bot is primarily configured from within Discord using slash commands:

- /setup: Launches the interactive wizard to set your server's language, default channel, and admin roles.
- /monitor add: Opens a modal to add a new monitoring source.
- /monitor list: Displays all currently configured monitors on the server.
- /monitor edit: Modify existing monitors (change channels, ping roles, or colors).
- /master: (Owner only) Manage global bot settings and rich presence.

## Database Core

The system uses a PostgreSQL backend to ensure high performance and reliability. It tracks every published item to ensure that notifications are sent exactly once. The configuration is cached in memory for minimal latency during operation.

## Localization

Localization files are located in the `locales/` directory. The bot detects the server's preferred language and serves appropriate feedback and embed formats accordingly.

## License

Standard open-source license. Refer to the project license file for full details.
