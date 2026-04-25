# Discord Feed Bot

This is a Discord bot I am working on that helps servers get notifications from different websites and platforms. It is written in Python and has a web dashboard made with Next.js. I used a PostgreSQL database to store everything because it is reliable for this kind of data.

## Project Overview

The project has two main parts:
1. The Python Bot: This runs in the background and checks the platforms for new content.
2. The Web Dashboard: A website where users can log in with Discord and manage their monitors easily without using commands.

## Features

- Multiple Platforms: You can follow YouTube channels, Twitch and Kick streams, RSS feeds, GitHub repos, and Steam news.
- Game Giveaways: It automatically finds free games on Epic Games, Steam, and GOG.
- Movies and TV: Uses TMDB to show new trending media. I added advanced filters so you can filter by genre or language.
- Crypto Alerts: You can set price thresholds for different coins.
- Web Dashboard: Made with Next.js. It has a live activity ticker and a timeline of recent notifications.
- Premium System: There are different tiers (Starter, Professional, Ultimate) that unlock more monitors and faster refresh rates.
- Custom Messages: You can use variables like {title} or {name} to customize how the bot posts.

## Tech Stack

- Backend: Python 3.10+ with discord.py and aiosqlite/psycopg2.
- Frontend: Next.js 14, React, and Vanilla CSS for the styling.
- Database: PostgreSQL for persistent storage.
- Authentication: NextAuth.js with the Discord provider.

## How to Setup

### 1. Requirements
You need to have Python and Node.js installed on your system. You also need a PostgreSQL database running.

### 2. Python Bot Setup
1. Go to the root folder.
2. Install dependencies: `pip install -r requirements.txt`.
3. Create a .env file with your tokens:
   - BOT_TOKEN
   - DATABASE_URL
   - TMDB_API_KEY
   - GITHUB_TOKEN
   - TWITCH_CLIENT_ID / SECRET
4. Run the bot: `python main.py`.

### 3. Web Dashboard Setup
1. Go to the `web` directory.
2. Install dependencies: `npm install`.
3. Create a .env.local file:
   - DATABASE_URL (same as the bot)
   - NEXTAUTH_SECRET
   - DISCORD_CLIENT_ID / SECRET
   - NEXTAUTH_URL
4. Start the dev server: `npm run dev`.

## Current Status

I am still fixing some bugs and adding new things. I recently fixed the JSON parsing in the API routes and updated the logos in the dashboard. The TMDB filters are now working in the creation modal too.

## License

This is an open source project. You can use it as you like.
