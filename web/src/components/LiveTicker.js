"use client";

import { useState, useEffect } from "react";
import { Zap, Activity } from "lucide-react";

export default function LiveTicker() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch("/api/stats/global");
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setItems(data);
          } else {
            // Fallback sample data if DB is empty
            setItems([
              { platform: 'youtube', title: 'New video from NovaFeeds Official', author_name: 'NovaFeeds' },
              { platform: 'twitch', title: 'Stream is LIVE: Dashboard Showcase', author_name: 'NovaBot' },
              { platform: 'rss', title: 'Update: Version 2.0 released', author_name: 'Changelog' }
            ]);
          }
        }
      } catch (err) {
        console.error("Ticker fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTicker();
    const interval = setInterval(fetchTicker, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  const platformColors = {
    'youtube': '#FF0000',
    'twitch': '#9146FF',
    'kick': '#53FC18',
    'rss': '#FFA500',
    'github': '#ffffff',
    'steam': '#00ADEE',
    'steam_news': '#00ADEE',
    'steam_free': '#00ADEE',
    'epic_games': '#ffffff',
    'gog_free': '#9f00ff',
    'crypto': '#F7931A',
    'movie': '#01b4e4',
    'tv': '#01b4e4',
    'tv_series': '#01b4e4'
  };

  const getIconSrc = (platform) => {
    // 1. Strip language suffix (e.g. movie:hu -> movie)
    const baseType = platform.split(':')[0].toLowerCase();
    
    // 2. Handle specific mappings
    if (baseType === 'tmdb_tv' || baseType === 'tv_series' || baseType === 'tv') return '/emojis/tmdb.png';
    if (baseType.startsWith('movie')) return '/emojis/tmdb.png';
    if (baseType === 'stream') return '/emojis/twitch.png';
    if (baseType === 'epic_games') return '/emojis/epic-games.png';
    if (baseType === 'gog_free') return '/emojis/gog.png';
    if (baseType === 'steam_free' || baseType === 'steam_news') return '/emojis/steam.png';
    
    // 3. General underscore to hyphen mapping for simple platforms
    let base = baseType.replace('_', '-');
    return `/emojis/${base}.png`;
  };

  const getPlatformColor = (platform) => {
    const baseType = platform.split(':')[0].toLowerCase();
    return platformColors[baseType] || 'var(--accent-color)';
  };

  return (
    <div className="ui-ticker-container">
      <div className="ui-ticker-track">
        <div className="ui-ticker-content">
          {[...items, ...items].map((item, idx) => (
            <div key={idx} className="ui-ticker-item">
              <img 
                src={getIconSrc(item.platform)} 
                alt="" 
                style={{ width: '14px', height: '14px', objectFit: 'contain' }} 
              />
              <span 
                className="ticker-platform" 
                style={{ color: getPlatformColor(item.platform), fontSize: '0.65rem', fontWeight: '800', opacity: 0.8 }}
              >
                {item.platform.split(':')[0].toUpperCase()}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>{item.title}</span>
              <Zap size={10} style={{ color: 'rgba(255, 255, 255, 0.2)', marginLeft: '10px' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="ui-ticker-header">
        <Activity size={14} className="ui-pulse-simple" />
        <span>LIVE GLOBAL ACTIVITY</span>
      </div>
    </div>
  );
}
