from monitors.youtube_monitor import YouTubeMonitor
from monitors.rss_monitor import RSSMonitor
from monitors.epic_games_monitor import EpicGamesMonitor
from monitors.steam_free_monitor import SteamFreeMonitor
from monitors.gog_free_monitor import GOGFreeMonitor
from monitors.stream_monitor import StreamMonitor
from monitors.steam_news_monitor import SteamNewsMonitor
from monitors.movie_monitor import MovieMonitor
from monitors.tv_series_monitor import TVSeriesMonitor
from monitors.crypto_monitor import CryptoMonitor
from monitors.github_monitor import GitHubMonitor

def create_monitor_instance(bot, m_config):
    """Factory function to create a monitor instance from config."""
    m_type = m_config.get("type")
    
    # We no longer pass bot.db or lang_data as monitors use database module and bot.get_feedback()
    
    if m_type == "youtube":
        return YouTubeMonitor(bot, m_config)
    elif m_type == "rss":
        return RSSMonitor(bot, m_config)
    elif m_type == "epic_games":
        return EpicGamesMonitor(bot, m_config)
    elif m_type == "steam_free":
        return SteamFreeMonitor(bot, m_config)
    elif m_type == "gog_free":
        return GOGFreeMonitor(bot, m_config)
    elif m_type == "steam_news":
        return SteamNewsMonitor(bot, m_config)
    elif m_type == "movie":
        return MovieMonitor(bot, m_config)
    elif m_type == "tv_series":
        return TVSeriesMonitor(bot, m_config)
    elif m_type == "stream":
        return StreamMonitor(bot, m_config)
    elif m_type == "crypto":
        if bot.has_feature(m_config.get("guild_id", 0), "crypto"):
            return CryptoMonitor(bot, m_config)
        return None
    elif m_type == "github":
        return GitHubMonitor(bot, m_config)
    return None
