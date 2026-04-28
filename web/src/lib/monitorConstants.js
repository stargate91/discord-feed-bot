export const PLATFORMS = [
  // Content & Streaming
  { id: 'youtube', name: 'YouTube', logo: '/emojis/youtube.png', color: '#FF0000', description: 'Monitor a channel for new videos.', inputLabel: 'Channel Info', inputKey: 'channel_id', placeholder: '@handle, Link or Name', hint: 'Format: @handle, channel link, name or UCID.' },
  { id: 'twitch', name: 'Twitch', logo: '/emojis/twitch.png', color: '#9146FF', description: 'Go live alerts for Twitch streamers.', inputLabel: 'Username', inputKey: 'username', placeholder: 'twitch_user', hint: 'Format: Username or Channel Link.' },
  { id: 'kick', name: 'Kick', logo: '/emojis/kick.png', color: '#53fc18', description: 'Go live alerts for Kick streamers.', inputLabel: 'Username', inputKey: 'username', placeholder: 'kick_user', hint: 'Format: Username or Channel Link.' },

  // Gaming
  { id: 'epic_games', name: 'Epic Free', logo: '/emojis/epic-games.png', color: '#ffffff', description: 'Weekly free games from Epic Store.', isGlobal: true },
  { id: 'steam_free', name: 'Steam Free', logo: '/emojis/steam.png', color: '#66c0f4', description: 'New free games discovered on Steam.', isGlobal: true },
  { id: 'steam_news', name: 'Steam News', logo: '/emojis/steam.png', color: '#66c0f4', description: 'Game updates and news from Steam.', inputLabel: 'Steam Game', inputKey: 'app_id', placeholder: 'Dota 2, 730 or Link', hint: 'Format: Game Name, App ID or Store URL.' },
  { id: 'gog_free', name: 'GOG Free', logo: '/emojis/gog.png', color: '#b237c1', description: 'Limited time free offers on GOG.com.', isGlobal: true },

  // Entertainment
  { id: 'movie', name: 'Movies', logo: '/emojis/tmdb.png', color: '#00d1b2', description: 'Trending and new popular movies.', isGlobal: true },
  { id: 'tv_series', name: 'TV Series', logo: '/emojis/tmdb.png', color: '#3273dc', description: 'Daily trending and new TV shows.', isGlobal: true },

  // Tech & General
  { id: 'github', name: 'GitHub', logo: '/emojis/github.png', color: '#ffffff', description: 'New releases or commits from a repo.', inputLabel: 'Repository', inputKey: 'repo', placeholder: 'owner/repo', hint: 'Format: "owner/repo" or Repository URL.' },
  { id: 'crypto', name: 'Crypto', logo: '/emojis/crypto.png', color: '#F7931A', description: 'Price alerts and coin news.', isCrypto: true },
  { id: 'rss', name: 'RSS Feed', logo: '/emojis/rss.png', color: '#ee802f', description: 'Generic RSS/Atom feed monitoring.', inputLabel: 'Feed URL', inputKey: 'rss_url', placeholder: 'https://example.com/feed', hint: 'Format: Full URL (e.g. https://site.com/feed.xml).' }
];

export const MOVIE_GENRES = [
  { id: '28', name: 'Action' },
  { id: '12', name: 'Adventure' },
  { id: '16', name: 'Animation' },
  { id: '9999', name: 'Anime' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '10751', name: 'Family' },
  { id: '14', name: 'Fantasy' },
  { id: '36', name: 'History' },
  { id: '27', name: 'Horror' },
  { id: '10402', name: 'Music' },
  { id: '9648', name: 'Mystery' },
  { id: '10749', name: 'Romance' },
  { id: '878', name: 'Science Fiction' },
  { id: '53', name: 'Thriller' },
  { id: '10752', name: 'War' },
  { id: '37', name: 'Western' },
  { id: '10759', name: 'Action & Adventure (TV)' },
  { id: '10762', name: 'Kids (TV)' },
  { id: '10765', name: 'Sci-Fi & Fantasy (TV)' }
];

export const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'hu', name: 'Hungarian' },
  { id: 'de', name: 'German' },
  { id: 'fr', name: 'French' },
  { id: 'es', name: 'Spanish' },
  { id: 'it', name: 'Italian' },
  { id: 'pt', name: 'Portuguese' },
  { id: 'ja', name: 'Japanese' },
  { id: 'ko', name: 'Korean' },
  { id: 'zh', name: 'Chinese' },
  { id: 'ru', name: 'Russian' },
  { id: 'tr', name: 'Turkish' },
  { id: 'pl', name: 'Polish' },
  { id: 'nl', name: 'Dutch' },
  { id: 'ar', name: 'Arabic' }
];

export const PLATFORM_NAMES = {
  youtube: "YouTube",
  rss: "RSS",
  epic_games: "Epic Games",
  steam_free: "Steam Free",
  gog_free: "GOG",
  stream: "Twitch",
  twitch: "Twitch",
  kick: "Kick",
  steam_news: "Steam News",
  movie: "TMDB Movies",
  tv_series: "TMDB Series",
  crypto: "Crypto",
  github: "GitHub"
};

export const getTypeIconPath = (type) => {
  const icons = {
    youtube: "/emojis/youtube.png",
    rss: "/emojis/rss.png",
    epic_games: "/emojis/epic-games.png",
    steam_free: "/emojis/steam.png",
    gog_free: "/emojis/gog.png",
    stream: "/emojis/twitch.png",
    twitch: "/emojis/twitch.png",
    kick: "/emojis/kick.png",
    steam_news: "/emojis/steam.png",
    movie: "/emojis/tmdb.png",
    tv_series: "/emojis/tmdb.png",
    crypto: "/emojis/crypto.png",
    github: "/emojis/github.png"
  };
  return icons[type] || "/emojis/unknown.png";
};

export const BULK_PLATFORMS = [
  { id: 'youtube', name: 'YouTube', logo: '/emojis/youtube.png', color: '#ff0000', placeholder: 'https://youtube.com/@handle\n@username\nUCID', hint: 'Links, @handles or UCIDs' },
  { id: 'stream', name: 'Twitch', logo: '/emojis/twitch.png', color: '#9146ff', placeholder: 'twitch_user\nhttps://twitch.tv/user', hint: 'Usernames or Links' },
  { id: 'kick', name: 'Kick', logo: '/emojis/kick.png', color: '#53fc18', placeholder: 'kick_user\nhttps://kick.com/user', hint: 'Usernames or Links' },
  { id: 'rss', name: 'RSS Feed', logo: '/emojis/rss.png', color: '#ee802f', placeholder: 'https://site.com/feed.xml\nhttps://blog.com/rss', hint: 'Full RSS/Atom URLs' },
  { id: 'github', name: 'GitHub', logo: '/emojis/github.png', color: '#fafafa', placeholder: 'owner/repo\nhttps://github.com/owner/repo', hint: '"owner/repo" or Links' },
  { id: 'steam_news', name: 'Steam News', logo: '/emojis/steam.png', color: '#66c0f4', placeholder: '730\nhttps://store.steampowered.com/app/730', hint: 'App IDs or Store URLs' },
];

export const getAvailableVars = (platformId) => {
  if (platformId === 'youtube') return ['name', 'title'];
  if (platformId === 'crypto') return ['name', 'price', 'percent', 'direction'];
  if (platformId === 'steam_news') return ['name', 'author', 'title'];
  if (platformId === 'github') return ['name', 'version'];
  if (platformId === 'movie' || platformId === 'tv_series') return ['name', 'title'];
  if (platformId === 'epic_games' || platformId === 'steam_free' || platformId === 'gog_free') return ['name', 'title'];
  if (platformId === 'rss') return ['name', 'title'];
  if (platformId === 'twitch') return ['name', 'game', 'title', 'viewers', 'platform'];
  if (platformId === 'kick') return ['name', 'game', 'title', 'viewers', 'platform'];
  return ['name'];
};
