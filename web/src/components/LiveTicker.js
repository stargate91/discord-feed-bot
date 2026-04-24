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
    'steam_news': '#00ADEE',
    'crypto': '#F7931A',
    'movie': '#01b4e4',
    'tv': '#01b4e4'
  };

  const getIconSrc = (platform) => {
    let base = platform.replace('_news', '').replace('_free', '').replace('_', '-');
    if (base === 'stream') return '/emojis/twitch.png';
    if (base === 'movie' || base === 'tv-series' || base === 'tv') return '/emojis/tmdb.png';
    return `/emojis/${base}.png`;
  };

  return (
    <div className="ticker-container">
      <div className="ticker-track">
        <div className="ticker-content">
          {[...items, ...items].map((item, idx) => (
            <div key={idx} className="ticker-item">
              <img 
                src={getIconSrc(item.platform)} 
                alt="" 
                style={{ width: '14px', height: '14px', objectFit: 'contain' }} 
              />
              <span 
                className="ticker-platform" 
                style={{ color: platformColors[item.platform] || 'var(--accent-color)' }}
              >
                {item.platform.toUpperCase()}
              </span>
              <span className="ticker-title">{item.title}</span>
              <Zap size={10} className="ticker-sep" />
            </div>
          ))}
        </div>
      </div>
      <div className="ticker-header">
        <Activity size={14} className="pulse" />
        <span>LIVE GLOBAL ACTIVITY</span>
      </div>

      <style jsx>{`
        .ticker-container {
          background: rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.03);
          height: 36px;
          display: flex;
          align-items: center;
          overflow: hidden;
          border-radius: 10px;
          position: relative;
          width: 100%;
        }

        .ticker-header {
          background: rgba(20, 20, 25, 0.8);
          backdrop-filter: blur(5px);
          border-right: 1px solid rgba(123, 44, 191, 0.3);
          color: rgba(255, 255, 255, 0.6);
          height: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 15px;
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          white-space: nowrap;
          z-index: 2;
          box-shadow: -5px 0 15px rgba(0,0,0,0.3);
        }

        .ticker-track {
          flex: 1;
          overflow: hidden;
          display: flex;
          align-items: center;
        }

        .ticker-content {
          display: flex;
          align-items: center;
          gap: 40px;
          animation: tickerScroll 60s linear infinite;
          padding-left: 20px;
        }

        .ticker-item {
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
        }

        .ticker-platform {
          font-size: 0.65rem;
          font-weight: 800;
          opacity: 0.8;
        }

        .ticker-title {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        .ticker-sep {
          color: rgba(255, 255, 255, 0.2);
          margin-left: 10px;
        }

        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .pulse {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
