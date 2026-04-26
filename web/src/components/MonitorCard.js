"use client";

import { useState, useEffect } from 'react';
import { Settings, RefreshCcw, Send, Trash, Wrench, Check, AlertCircle, Shield, Zap, Radio, Moon, TrendingUp, Sparkles } from 'lucide-react';
import Link from 'next/link';

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

const TIER_CONFIG = {
  0: { name: 'Free', speed: '30m', speedLabel: 'Basic', speedColor: '#94a3b8', canRepost: false, maxPurge: 10, maxMonitors: 3 },
  1: { name: 'Tier 1', speed: '10m', speedLabel: 'Standard', speedColor: '#4ade80', canRepost: false, maxPurge: 25, maxMonitors: 10 },
  2: { name: 'Tier 2', speed: '5m', speedLabel: 'Fast', speedColor: '#60a5fa', canRepost: true, maxPurge: 50, maxMonitors: 30 },
  3: { name: 'Tier 3', speed: '2m', speedLabel: 'Turbo', speedColor: '#f472b6', canRepost: true, maxPurge: 100, maxMonitors: 100 },
};

export default function MonitorCard({ monitor, onToggle, onDelete, onEdit, isPremium, tier = 0, isSelected, onSelect, selectionMode }) {
  const [loading, setLoading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'check', 'repost', 'purge', 'reset'
  const [actionStatus, setActionStatus] = useState({ type: null, message: null });
  const [repostCount, setRepostCount] = useState(1);
  const [purgeAmount, setPurgeAmount] = useState(50);

  const effectiveTier = (isPremium && tier === 0) ? 3 : tier;
  const currentTier = TIER_CONFIG[effectiveTier] || TIER_CONFIG[0];
  const canRepost = currentTier.canRepost;
  const maxPurge = currentTier.maxPurge;

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
    onDelete(monitor.id);
  };

  const runAction = async (action) => {
    setActionLoading(action);
    setActionStatus({ type: null, message: null });

    try {
      const res = await fetch(`/api/monitors/${monitor.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          count: action === 'repost' ? repostCount : 1,
          amount: action === 'purge' ? Math.min(purgeAmount, maxPurge) : 0
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionStatus({ type: 'success', message: data.message || 'Success!' });
      } else {
        setActionStatus({ type: 'error', message: data.error || 'Failed' });
      }
    } catch (err) {
      setActionStatus({ type: 'error', message: 'Connection error' });
    }

    setActionLoading(null);
    setTimeout(() => setActionStatus({ type: null, message: null }), 6000); // 6s duration for longer messages
  };

  return (
    <div 
      className={`card monitor-card ${!monitor.enabled ? 'card-disabled' : ''} ${showTools ? 'show-tools' : ''} ${isSelected ? 'card-selected' : ''}`}
      onClick={() => {
        if (selectionMode) {
          onSelect(monitor.id);
        }
      }}
    >
      <div className="card-glow"></div>

      <div className="card-header">
        <div className="platform-brand">
          <div className="platform-icon-wrapper">
            <input 
              type="checkbox" 
              className="monitor-checkbox" 
              checked={isSelected} 
              onChange={(e) => {
                e.stopPropagation();
                onSelect(monitor.id);
              }}
              onClick={(e) => e.stopPropagation()}
            />
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className={`tools-toggle ${showTools ? 'active' : ''}`}
            onClick={() => setShowTools(!showTools)}
            title="Diagnostic Tools"
          >
            <Wrench size={14} />
          </button>
          <div className={`status-badge ${monitor.enabled ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            {monitor.enabled ? 'Active' : 'Paused'}
          </div>
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

      {/* Diagnostics Panel */}
      <div className={`diagnostics-panel ${showTools ? 'expanded' : ''}`}>
        <div className="tools-grid">
          <button className="tool-btn" onClick={() => runAction('check')} disabled={actionLoading}>
            <RefreshCcw size={16} className={actionLoading === 'check' ? 'spin' : ''} />
            <span>Check</span>
          </button>

          <div className={`tool-group ${!canRepost ? 'locked' : ''}`} title={!canRepost ? `Available on ${TIER_CONFIG[2].name}+` : ""}>
            <button
              className={`tool-btn wide ${!canRepost ? 'is-locked' : ''}`}
              onClick={() => canRepost && runAction('repost')}
              disabled={actionLoading || !canRepost}
            >
              {!canRepost ? <Shield size={14} style={{ color: '#ffd700' }} /> : <Send size={16} className={actionLoading === 'repost' ? 'pulse' : ''} />}
              <span>{!canRepost ? "Repost (Locked)" : `Repost (${repostCount})`}</span>
            </button>
            <input
              type="range" min="1" max="10"
              value={repostCount}
              onChange={(e) => canRepost && setRepostCount(parseInt(e.target.value))}
              className="repost-slider"
              disabled={!canRepost}
            />
          </div>

          <div className="tool-group">
            <button className="tool-btn purge wide" onClick={() => runAction('purge')} disabled={actionLoading} title="Clear Discord Channel">
              <Trash size={16} className={actionLoading === 'purge' ? 'shake' : ''} />
              <span>Purge ({purgeAmount})</span>
            </button>
            <input
              type="range" min="5" max="100" step="5"
              value={purgeAmount}
              onChange={(e) => setPurgeAmount(parseInt(e.target.value))}
              className="purge-slider"
            />
          </div>
        </div>
        {actionStatus.message && (
          <div className={`action-feedback ${actionStatus.type}`}>
            {actionStatus.type === 'success' && actionStatus.message.includes('LIVE NOW') ? <Radio size={14} className="pulse" /> : 
             actionStatus.type === 'success' && actionStatus.message.includes('OFFLINE') ? <Moon size={14} /> :
             actionStatus.type === 'success' && actionStatus.message.includes('Price Alert') ? <TrendingUp size={14} /> :
             actionStatus.type === 'success' && actionStatus.message.includes('Found') ? <Sparkles size={14} /> :
             actionStatus.type === 'success' ? <Check size={14} /> : 
             <AlertCircle size={14} />}
            {actionStatus.message}
          </div>
        )}
        {!isPremium && showTools && (
          <div className="premium-lock-message">
            Upgrade to <Link href={`/premium?guild=${monitor.guild_id}`} style={{ color: '#ffd700', textDecoration: 'underline' }}>Premium</Link> to use Repost tools.
          </div>
        )}
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
          className="action-btn delete"
          onClick={handleDeleteClick}
        >
          Delete
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
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .show-tools {
          border-color: rgba(123, 44, 191, 0.3);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .card-selected {
          border-color: var(--accent-color) !important;
          background: rgba(123, 44, 191, 0.08) !important;
          box-shadow: 0 0 20px rgba(123, 44, 191, 0.2), inset 0 0 15px rgba(123, 44, 191, 0.1);
          transform: scale(1.02);
          z-index: 5;
        }

        .tools-toggle {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4);
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
        }

        .tools-toggle:hover, .tools-toggle.active {
          background: var(--accent-color);
          color: white;
          border-color: transparent;
          box-shadow: 0 0 10px var(--accent-glow);
        }

        .diagnostics-panel {
          max-height: 0;
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(0,0,0,0.2);
          margin: 0 -1.5rem;
          padding: 0 1.5rem;
          opacity: 0;
        }

        .diagnostics-panel.expanded {
          max-height: 120px;
          padding: 1rem 1.5rem;
          opacity: 1;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          align-items: end;
        }

        .tool-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .repost-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          cursor: pointer;
        }

        .repost-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent-color);
          box-shadow: 0 0 5px var(--accent-glow);
          cursor: pointer;
        }

        .tool-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          padding: 8px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 52px;
          justify-content: center;
        }

        .tool-btn :global(svg) {
          flex-shrink: 0;
        }

        .tool-btn.wide {
          width: 100%;
          min-height: 40px;
          flex-direction: row;
          padding: 8px 12px;
          gap: 8px;
          justify-content: center;
        }

        .purge-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(239, 68, 68, 0.1);
          outline: none;
          cursor: pointer;
        }

        .purge-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 5px rgba(239, 68, 68, 0.4);
          cursor: pointer;
        }

        .tool-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          transform: translateY(-2px);
        }

        .tool-btn.purge:hover:not(:disabled) {
          color: #ef4444;
          border-color: rgba(239,68,68,0.2);
        }

        .tool-group.locked {
          position: relative;
          cursor: not-allowed;
        }

        .tool-btn.is-locked {
          opacity: 0.6;
          border-color: rgba(255, 215, 0, 0.2);
          cursor: not-allowed;
        }

        .premium-lock-message {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 215, 0, 0.1);
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
        }

        .action-feedback {
          margin-top: 12px;
          padding: 10px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.2);
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          border-left: 3px solid transparent;
          word-break: break-word;
        }

        .action-feedback.success { color: #10b981; border-left-color: #10b981; }
        .action-feedback.error { color: #ef4444; border-left-color: #ef4444; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .pulse { animation: pulse 0.8s ease-in-out infinite; }

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

        .monitor-checkbox {
          position: absolute;
          top: -6px;
          left: -6px;
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--accent-color);
          z-index: 10;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .monitor-card:hover .monitor-checkbox, .monitor-checkbox:checked {
          opacity: 1;
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

        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .action-btn.edit:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px) rotate(90deg);
        }

        .action-btn.delete:hover {
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
