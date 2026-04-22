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
    <div className={`card ${!monitor.enabled ? 'card-disabled' : ''}`} style={{ position: 'relative' }}>
      <div className="card-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src={getTypeIconPath(monitor.type)}
            alt=""
            style={{ width: '20px', height: '20px', objectFit: 'contain' }}
          />
          {platformNames[monitor.type] || monitor.type.toUpperCase()}
        </span>
        <span className={`status-indicator ${monitor.enabled ? 'status-online' : 'status-offline'}`}></span>
      </div>

      <div className="card-value" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
        {monitor.name}
      </div>

      <div className="card-desc" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Last Post:</span>
          <span style={{ fontWeight: 500, color: monitor.last_post_at ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {formatDate(monitor.last_post_at)}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '5px' }}>
          ID: <code>{monitor.id}</code>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          className="btn edit-btn-bottom"
          onClick={() => onEdit(monitor)}
          style={{ 
            width: '44px',
            padding: '0',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            boxShadow: 'none',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Edit Monitor"
        >
          <Settings size={18} />
        </button>
        
        <button
          className="btn"
          onClick={handleToggle}
          disabled={loading}
          style={{
            flex: 1,
            background: monitor.enabled ? 'rgba(255,255,255,0.1)' : 'var(--accent-color)',
            border: '1px solid var(--border-color)',
            boxShadow: 'none'
          }}
        >
          {monitor.enabled ? 'Pause' : 'Resume'}
        </button>

        <button
          className="btn"
          onClick={handleDeleteClick}
          style={{
            background: deleteConfirm ? '#ef4444' : 'transparent',
            border: '1px solid ' + (deleteConfirm ? '#ef4444' : '#ef4444'),
            color: deleteConfirm ? 'white' : '#ef4444',
            boxShadow: 'none',
            minWidth: '100px'
          }}
        >
          {deleteConfirm ? 'Confirm?' : 'Delete'}
        </button>
      </div>

      <style jsx>{`
        .card-disabled {
          opacity: 0.7;
          border-style: dashed;
        }
        .status-online { background: #10b981; box-shadow: 0 0 8px #10b981; }
        .status-offline { background: #6b7280; box-shadow: none; }
        .edit-btn-hover:hover {
          background: var(--accent-color) !important;
          border-color: var(--accent-color) !important;
          transform: rotate(90deg);
        }
      `}</style>
    </div>
  );
}
