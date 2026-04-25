"use client";

import { Clock } from "lucide-react";

function formatRelativeTime(date) {
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PLATFORM_ICONS = {
  youtube: { icon: '/emojis/youtube.png', color: "#FF0000" },
  twitch: { icon: '/emojis/twitch.png', color: "#9146FF" },
  stream: { icon: '/emojis/twitch.png', color: "#9146FF" },
  kick: { icon: '/emojis/kick.png', color: "#53FC18" },
  epic_games: { icon: '/emojis/epic-games.png', color: "#FFFFFF" },
  steam: { icon: '/emojis/steam.png', color: "#66c0f4" },
  steam_free: { icon: '/emojis/steam.png', color: "#66c0f4" },
  gog_free: { icon: '/emojis/gog.png', color: "#b237c1" },
  rss: { icon: '/emojis/rss.png', color: "#ee802f" },
  crypto: { icon: '/emojis/crypto.png', color: "#F7931A" },
  movie: { icon: '/emojis/tmdb.png', color: "#00d1b2" },
  tv_series: { icon: '/emojis/tmdb.png', color: "#3273dc" },
  tmdb_tv: { icon: '/emojis/tmdb.png', color: "#3273dc" },
  github: { icon: '/emojis/github.png', color: "#ffffff" },
  system: { icon: null, color: "var(--accent-color)" },
  default: { icon: '/emojis/rss.png', color: "var(--accent-color)" }
};

const getPlatformIcon = (platform) => {
  if (platform.startsWith('movie:')) return PLATFORM_ICONS.movie;
  if (platform === 'tmdb_tv') return PLATFORM_ICONS.tmdb_tv;
  return PLATFORM_ICONS[platform] || PLATFORM_ICONS.default;
};

export default function NotificationTimeline({ notifications, minimal = false }) {
  const hasNotifications = notifications && notifications.length > 0;
  
  const baseData = hasNotifications 
    ? notifications 
    : [{ platform: 'system', title: 'Waiting for fresh activity from your feeds...', published_at: new Date() }];
  
  // If system message, only double it (minimum for seamless loop)
  // If real notifications, quadruple for better density
  const displayData = hasNotifications 
    ? [...baseData, ...baseData, ...baseData, ...baseData]
    : [...baseData, ...baseData];

  const animationDuration = hasNotifications 
    ? Math.max(10, baseData.length * 10)
    : 20; // Fixed slow speed for single system message

  return (
    <div className={`ticker-wrapper ${minimal ? 'minimal' : 'card'}`}>
      {!minimal && (
        <div className="ticker-label">
          <div className="live-pulse"></div>
          <span>LIVE FEED</span>
        </div>
      )}
      
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ animationDuration: `${animationDuration}s` }}>
          {displayData.map((notif, i) => {
            const plat = getPlatformIcon(notif.platform);
            return (
              <div key={i} className="ticker-item">
                {plat.icon && (
                  <div className="ticker-icon-box" style={{ '--plat-color': plat.color }}>
                    <img src={plat.icon} alt="" />
                  </div>
                )}
                <div className="ticker-content">
                  <span className="ticker-title">{notif.title || notif.entry_id}</span>
                  <div className="ticker-meta">
                    <span className="ticker-plat">{notif.platform.replace('_', ' ')}</span>
                    {notif.platform !== 'system' && (
                      <>
                        <span className="ticker-dot">•</span>
                        <span className="ticker-time">{formatRelativeTime(notif.published_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .ticker-wrapper {
          padding: 0 !important;
          height: ${minimal ? '48px' : '64px'};
          display: flex;
          align-items: center;
          overflow: hidden;
          position: relative;
        }

        .ticker-wrapper.card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px;
        }

        .ticker-wrapper.minimal {
          background: transparent;
          border: none;
        }

        .ticker-label {
          padding: 0 1.5rem;
          background: rgba(123, 44, 191, 0.1);
          height: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 10;
          white-space: nowrap;
        }

        .ticker-label span {
          font-size: 0.7rem;
          font-weight: 900;
          letter-spacing: 2px;
          color: var(--accent-color);
        }

        .live-pulse {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 10px #ef4444;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.5; transform: scale(1); }
        }

        .ticker-viewport {
          flex: 1;
          overflow: hidden;
          position: relative;
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }

        .ticker-track {
          display: flex;
          width: fit-content;
          animation: tickerScroll linear infinite;
          will-change: transform;
        }

        .ticker-viewport:hover .ticker-track {
          animation-play-state: paused;
        }

        @keyframes tickerScroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }

        .ticker-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 ${hasNotifications ? '4rem' : '100vw'};
          white-space: nowrap;
        }

        .ticker-icon-box {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .ticker-icon-box img {
          width: 14px;
          height: 14px;
          object-fit: contain;
        }

        .ticker-content {
          display: flex;
          flex-direction: column;
        }

        .ticker-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: white;
          opacity: 0.9;
        }

        .ticker-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .ticker-plat {
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--accent-color);
          opacity: 0.6;
        }

        .ticker-dot {
          opacity: 0.2;
        }
      `}</style>
    </div>
  );
}
