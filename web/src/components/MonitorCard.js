"use client";

import { useState } from 'react';
import { Settings } from 'lucide-react';

const platformNames = {
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

export default function MonitorCard({ monitor, onToggle, onDelete, onEdit }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Never';
    return date.toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIconPath = (type) => {
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

  const handleToggle = async () => {
    setLoading(true);
    await onToggle(monitor.id, !monitor.enabled);
    setLoading(false);
  };

  const handleDeleteClick = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000); // Reset after 3s
    } else {
      onDelete(monitor.id);
    }
  };

  return (
    <div className={`card monitor-card ${!monitor.enabled ? 'card-disabled' : ''}`}>
      <div className="card-glow"></div>
      
      <div className="card-header">
        <div className="platform-brand">
          <div className="platform-icon-wrapper">
            <img
              src={getTypeIconPath(monitor.type)}
              alt=""
              className="platform-icon-img"
            />
          </div>
          <span className="platform-name">
            {platformNames[monitor.type] || monitor.type.toUpperCase()}
          </span>
        </div>
        <div className={`status-badge ${monitor.enabled ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          {monitor.enabled ? 'Active' : 'Paused'}
        </div>
      </div>

      <div className="card-body">
        <h3 className="monitor-name">{monitor.name}</h3>
        
        <div className="monitor-meta">
          <div className="meta-item">
            <span className="meta-label">Last Post</span>
            <span className={`meta-value ${monitor.last_post_at ? 'has-date' : ''}`}>
              {formatDate(monitor.last_post_at)}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Monitor ID</span>
            <code className="meta-code">{monitor.id}</code>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          className="action-btn edit"
          onClick={() => onEdit(monitor)}
          title="Edit Configuration"
        >
          <Settings size={18} />
        </button>
        
        <button
          className={`action-btn toggle ${monitor.enabled ? 'pause' : 'resume'}`}
          onClick={handleToggle}
          disabled={loading}
        >
          {loading ? '...' : (monitor.enabled ? 'Pause' : 'Resume')}
        </button>

        <button
          className={`action-btn delete ${deleteConfirm ? 'confirm' : ''}`}
          onClick={handleDeleteClick}
        >
          {deleteConfirm ? 'Confirm?' : 'Delete'}
        </button>
      </div>

      <style jsx>{`
        .monitor-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: hidden;
        }

        .card-disabled {
          opacity: 0.6;
          border-style: dashed;
        }

        .platform-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .platform-icon-wrapper {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .platform-icon-img {
          width: 20px;
          height: 20px;
          object-fit: contain;
        }

        .platform-name {
          font-weight: 800;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-secondary);
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-badge.online {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-badge.offline {
          background: rgba(107, 114, 128, 0.1);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.2);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .online .status-dot { background: #10b981; box-shadow: 0 0 10px #10b981; }
        .offline .status-dot { background: #6b7280; }

        .monitor-name {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 1rem 0;
          color: white;
        }

        .monitor-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .meta-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .meta-value {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .meta-value.has-date {
          color: white;
          font-weight: 500;
        }

        .meta-code {
          font-family: monospace;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
          color: var(--accent-color);
        }

        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }

        .action-btn {
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn.edit {
          width: 42px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }

        .action-btn.toggle {
          flex: 1;
        }

        .action-btn.toggle.pause {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }

        .action-btn.toggle.resume {
          background: var(--accent-color);
          color: white;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .action-btn.delete {
          padding: 0 16px;
          background: transparent;
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .action-btn.delete.confirm {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .action-btn.edit:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px) rotate(90deg);
        }

        .action-btn.delete:hover:not(.confirm) {
          background: rgba(239, 68, 68, 0.1);
        }

        .monitor-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
