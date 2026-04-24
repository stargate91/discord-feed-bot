"use client";

import { Clock, ExternalLink, Youtube, Twitch, Rss, Gamepad, Bitcoin, Video, Globe } from "lucide-react";

function formatRelativeTime(date) {
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PLATFORM_ICONS = {
  youtube: { icon: Youtube, color: "#FF0000" },
  twitch: { icon: Twitch, color: "#9146FF" },
  kick: { icon: Video, color: "#53FC18" },
  epic_games: { icon: Gamepad, color: "#FFFFFF" },
  steam: { icon: Gamepad, color: "#171a21" },
  rss: { icon: Rss, color: "#FFA500" },
  crypto: { icon: Bitcoin, color: "#F7931A" },
  default: { icon: Globe, color: "var(--accent-color)" }
};

export default function NotificationTimeline({ notifications }) {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
        <p>No recent notifications found.</p>
      </div>
    );
  }

  return (
    <div className="card timeline-card">
      <div className="card-header">
        <h3 style={{
          fontSize: '0.8rem',
          fontWeight: '800',
          color: 'rgba(255, 255, 255, 0.4)',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          margin: 0
        }}>Recent Notifications</h3>
      </div>

      <div className="timeline-list">
        {notifications.map((notif, i) => {
          const plat = PLATFORM_ICONS[notif.platform] || PLATFORM_ICONS.default;
          const Icon = plat.icon;

          return (
            <div key={i} className="timeline-item">
              <div className="timeline-icon-wrapper" style={{ '--plat-color': plat.color }}>
                <Icon size={16} />
              </div>
              
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-platform">{notif.platform.replace('_', ' ')}</span>
                  {notif.author_name && <span className="timeline-author">by {notif.author_name}</span>}
                  <span className="timeline-time">
                    <Clock size={12} />
                    {formatRelativeTime(notif.published_at)}
                  </span>
                </div>
                
                <div className="timeline-body">
                  <div className="timeline-text-content">
                    <p className="timeline-text">{notif.title || notif.entry_id}</p>
                    {notif.feed_url && (
                      <a href={notif.feed_url} target="_blank" rel="noopener noreferrer" className="timeline-link">
                        <ExternalLink size={12} />
                        View Source
                      </a>
                    )}
                  </div>
                  {notif.thumbnail_url && (
                    <div className="timeline-thumb">
                      <img src={notif.thumbnail_url} alt="Thumbnail" />
                    </div>
                  )}
                </div>
              </div>
              
              {i < notifications.length - 1 && <div className="timeline-connector"></div>}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .timeline-card {
          padding: 1.5rem;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
          max-height: 500px;
          overflow-y: auto;
          padding-right: 10px;
        }

        .timeline-list::-webkit-scrollbar {
          width: 4px;
        }

        .timeline-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }

        .timeline-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .timeline-item {
          display: flex;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .timeline-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--plat-color);
          flex-shrink: 0;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .timeline-connector {
          position: absolute;
          left: 15px;
          top: 32px;
          bottom: -24px;
          width: 2px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent);
          z-index: 0;
        }

        .timeline-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .timeline-platform {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 0.4);
        }

        .timeline-author {
          font-size: 0.7rem;
          color: var(--accent-color);
          font-weight: 600;
          opacity: 0.8;
        }

        .timeline-time {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .timeline-body {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          justify-content: space-between;
        }

        .timeline-text-content {
          flex: 1;
        }

        .timeline-thumb {
          width: 60px;
          height: 40px;
          border-radius: 6px;
          overflow: hidden;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }

        .timeline-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .timeline-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .timeline-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--accent-color);
          text-decoration: none;
          margin-top: 0.2rem;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .timeline-link:hover {
          opacity: 1;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
