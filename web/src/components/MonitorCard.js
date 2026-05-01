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



import { useConfig } from '@/hooks/useConfig';

export default function MonitorCard({ monitor, onToggle, onDelete, onEdit, isPremium, tier = 0, isSelected, onSelect, selectionMode }) {
  const { getTierConfig, hasFeature } = useConfig();
  const [loading, setLoading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'check', 'repost', 'purge', 'reset'
  const [actionStatus, setActionStatus] = useState({ type: null, message: null });
  const [repostCount, setRepostCount] = useState(1);
  const [purgeAmount, setPurgeAmount] = useState(50);

  const currentTier = getTierConfig(tier, isPremium);
  const canRepost = hasFeature(tier, isPremium, "repost");
  const maxPurge = currentTier.max_purge || 10;

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
      className={`ui-card ui-monitor-card ${!monitor.enabled ? 'ui-disabled' : ''} ${showTools ? 'ui-tools-active' : ''} ${isSelected ? 'ui-selected' : ''}`}
      onClick={() => {
        if (selectionMode) {
          onSelect(monitor.id);
        }
      }}
    >
      <div className="ui-card-glow"></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="ui-platform-icon-wrapper" style={{ width: '36px', height: '36px' }}>
            <input
              type="checkbox"
              style={{ position: 'absolute', top: '-6px', left: '-6px', width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-color)', zIndex: 10, opacity: isSelected ? 1 : 0 }}
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
              style={{ width: '22px', height: '22px', zIndex: 2 }}
            />
            <div className="ui-platform-icon-glow"></div>
          </div>
          <span className="ui-platform-label">
            {platformNames[monitor.type] || monitor.type.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="ui-btn"
            style={{ width: '32px', height: '32px', padding: 0, background: showTools ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)', color: showTools ? 'white' : 'rgba(255,255,255,0.4)' }}
            onClick={(e) => { e.stopPropagation(); setShowTools(!showTools); }}
            title="Diagnostic Tools"
          >
            <Wrench size={14} />
          </button>
          <div className={`ui-status-badge ${monitor.enabled ? 'ui-online' : 'ui-offline'}`}>
            {monitor.enabled ? 'Active' : 'Paused'}
          </div>
        </div>
      </div>

      <div>
        <h3 className="ui-monitor-name" style={{ marginBottom: '1.25rem' }}>{monitor.name}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 800, letterSpacing: '1px' }}>Last Post</span>
            <span style={{ fontSize: '0.85rem', color: monitor.last_post_at ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: monitor.last_post_at ? 600 : 400 }}>
              {formatDate(monitor.last_post_at)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 800, letterSpacing: '1px' }}>Monitor ID</span>
            <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--accent-hover)', width: 'fit-content' }}>{monitor.id}</code>
          </div>
        </div>
      </div>

      {/* Diagnostics Panel */}
      <div className={`ui-diagnostics-panel ${showTools ? 'ui-expanded' : ''}`}>
        <div className="ui-tools-grid">
          <button className="ui-tool-btn" onClick={() => runAction('check')} disabled={actionLoading}>
            <RefreshCcw size={16} className={actionLoading === 'check' ? 'spin' : ''} />
            <span>Check</span>
          </button>

          <div className={`ui-tool-group ${!canRepost ? 'locked' : ''}`} title={!canRepost ? "Requires Professional Tier" : ""}>
            <button
              className={`ui-tool-btn ui-wide ${!canRepost ? 'is-locked' : ''}`}
              onClick={() => canRepost && runAction('repost')}
              disabled={actionLoading || !canRepost}
            >
              {!canRepost ? <Shield size={14} style={{ color: '#ffd700' }} /> : <Send size={16} className={actionLoading === 'repost' ? 'pulse' : ''} />}
              <span>{!canRepost ? "Repost" : `Repost (${repostCount})`}</span>
            </button>
            <input
              type="range" min="1" max="10"
              value={repostCount}
              onChange={(e) => canRepost && setRepostCount(parseInt(e.target.value))}
              className="ui-slider"
              disabled={!canRepost}
            />
          </div>

          <div className="ui-tool-group">
            <button className="ui-tool-btn ui-purge ui-wide" onClick={() => runAction('purge')} disabled={actionLoading} title="Clear Discord Channel">
              <Trash size={16} className={actionLoading === 'purge' ? 'shake' : ''} />
              <span>Purge ({purgeAmount})</span>
            </button>
            {(() => {
              const values = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
              const currentIndex = values.indexOf(purgeAmount);
              return (
                <input
                  type="range"
                  min="0"
                  max={values.length - 1}
                  step="1"
                  value={currentIndex === -1 ? values.indexOf(5) : currentIndex}
                  onChange={(e) => setPurgeAmount(values[parseInt(e.target.value)])}
                  className="ui-slider ui-slider-purge"
                />
              );
            })()}
          </div>
        </div>
        {actionStatus.message && (
          <div className={`ui-action-feedback ui-${actionStatus.type}`}>
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
          <div className="premium-lock-message" style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 215, 0, 0.1)', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
            Upgrade to <Link href={`/premium?guild=${monitor.guild_id}`} style={{ color: '#ffd700', textDecoration: 'underline' }}>Premium</Link> to use Repost tools.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button
          className="ui-btn"
          style={{ width: '42px', height: '42px', padding: 0, background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.4)' }}
          onClick={(e) => { e.stopPropagation(); onEdit(monitor); }}
          title="Edit Configuration"
        >
          <Settings size={18} />
        </button>

        <button
          className={`ui-btn ${monitor.enabled ? '' : 'ui-btn-primary'}`}
          style={{ flex: 1, height: '42px', padding: 0, background: monitor.enabled ? 'rgba(255, 255, 255, 0.08)' : '' }}
          onClick={(e) => { e.stopPropagation(); handleToggle(); }}
          disabled={loading}
        >
          {loading ? '...' : (monitor.enabled ? 'Pause' : 'Resume')}
        </button>

        <button
          className="ui-btn"
          style={{ height: '42px', padding: '0 16px', background: 'transparent', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
