export const PLATFORMS = [
  { id: 'twitch', name: 'Twitch', icon: '/emojis/twitch.png', tags: ['{name}', '{game}', '{title}', '{viewers}', '{platform}'] },
  { id: 'kick', name: 'Kick', icon: '/emojis/kick.png', tags: ['{name}', '{game}', '{title}', '{viewers}', '{platform}'] },
  { id: 'youtube', name: 'YouTube', icon: '/emojis/youtube.png', tags: ['{name}', '{title}'] },
  { id: 'rss', name: 'RSS Feed', icon: '/emojis/rss.png', tags: ['{name}', '{author}', '{title}', '{description}'] },
  { id: 'steam_news', name: 'Steam News', icon: '/emojis/steam.png', tags: ['{name}', '{author}', '{title}'] },
  { id: 'epic_games', name: 'Epic Games', icon: '/emojis/epic-games.png', tags: ['{name}', '{title}'] },
  { id: 'crypto', name: 'Crypto Alerts', icon: '/emojis/crypto.png', tags: ['{name}', '{price}', '{threshold}', '{direction}', '{percent}'] },
  { id: 'steam_free', name: 'Steam Free', icon: '/emojis/steam.png', tags: ['{name}', '{title}'] },
  { id: 'gog_free', name: 'GOG Free', icon: '/emojis/gog.png', tags: ['{name}', '{title}'] },
  { id: 'movie', name: 'Movies', icon: '/emojis/tmdb.png', tags: ['{name}', '{title}', '{rating}', '{year}'] },
  { id: 'tv_series', name: 'TV Series', icon: '/emojis/tmdb.png', tags: ['{name}', '{title}', '{rating}', '{year}'] },
];

export const TAG_DESCRIPTIONS = {
  '{name}': 'Platform, Channel or Monitor name',
  '{title}': 'Content title, Stream title or Video title',
  '{description}': 'Short summary or description (mostly RSS)',
  '{price}': 'Current cryptocurrency price (USD)',
  '{threshold}': 'The price limit you set',
  '{direction}': 'Up or Down direction emoji',
  '{percent}': 'Percentage difference from threshold',
  '{game}': 'The game currently being played',
  '{viewers}': 'Current viewer count',
  '{platform}': 'Platform name (Twitch or Kick)',
  '{author}': 'Author or creator name (RSS/Steam)',
  '{rating}': 'Movie or TV Show rating (e.g., 8.5)',
  '{year}': 'Release year of the content'
};

export const ANALYTICS_RANGE_LABELS = {
  "3": "Last 3 Days",
  "7": "Last 7 Days",
  "30": "Last 30 Days",
  "999": "∞ Lifetime"
};

export const ANALYTICS_PIE_COLORS = ['#7b2cbf', '#9d4edd', '#3c096c', '#5a189a', '#c19ee0'];

// --- Developer Page Constants ---
export const DEV_ROTATION_OPTIONS = [
  { value: 'random', label: 'Random Rotation' },
  { value: 'sequential', label: 'Sequential Rotation' }
];

export const DEV_ACTIVITY_OPTIONS = [
  { value: 'playing', label: 'Playing' },
  { value: 'watching', label: 'Watching' },
  { value: 'listening', label: 'Listening to' },
  { value: 'streaming', label: 'Streaming' },
  { value: 'competing', label: 'Competing in' }
];

export const DEV_DURATION_OPTIONS = [
  { value: '30', label: '1 Month (30 Days)' },
  { value: '90', label: '3 Months (90 Days)' },
  { value: '180', label: '6 Months (180 Days)' },
  { value: '365', label: '1 Year (365 Days)' },
  { value: '0', label: 'Lifetime (Infinity)' },
  { value: 'custom', label: 'Custom Days...' }
];

export const DEV_TIER_OPTIONS = [
  { value: '1', label: 'Scout (Tier 1)' },
  { value: '2', label: 'Operator (Tier 2)' },
  { value: '3', label: 'Architect (Tier 3)' }
];
