"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search, Server, Crown, Shield, Plus, ChevronRight, Sparkles } from 'lucide-react';
import MarketingNavbar from '@/components/MarketingNavbar';
import Loading from '@/app/loading';

export default function SelectServer() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchGuilds();
    }
  }, [status]);

  const fetchGuilds = async () => {
    setError(null);
    try {
      const res = await fetch('/api/guilds');
      if (res.ok) {
        const data = await res.json();
        setGuilds(data);
      } else {
        const errData = await res.json();
        setError(errData);
      }
    } catch (err) {
      setError('Connection error');
      console.error(err);
    }
    setLoading(false);
  };

  const handleSelect = (guildId) => {
    router.push(`/dashboard?guild=${guildId}`);
  };

  const filteredGuilds = guilds.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const botGuilds = filteredGuilds.filter(g => g.hasBot);
  const inviteGuilds = filteredGuilds.filter(g => !g.hasBot);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="premium-root is-marketing">
      {/* ── Navbar ── */}
      <MarketingNavbar session={session} />

      <div className="select-container">
        {/* ── Hero Header ── */}
        <div className="select-hero">
          <div className="select-hero-glow"></div>
          <div className="select-badge">
            <Server size={14} />
            <span>SERVER HUB</span>
          </div>
          <h1 className="select-title">
            Your <span className="select-title-gradient">Servers</span>
          </h1>
          <p className="select-subtitle">
            Choose a Discord server to manage its feeds, monitors, and settings.
          </p>

          {error && (
            <div className="error-box">
              <p>⚠️ {typeof error === 'string' ? error : 'Internal Server Error'}</p>
              {error?.details && <p style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '5px' }}>Code: {error.details}</p>}
              <button onClick={() => signOut({ callbackUrl: '/' })} className="btn" style={{ background: '#ff4d4d', marginTop: '1rem' }}>
                Re-login
              </button>
            </div>
          )}

          {!error && (
            <div className="search-wrapper">
              <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', display: 'flex' }}>
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search servers..."
                className="search-bar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="server-count">
                <span className="server-count-num">{botGuilds.length}</span>
                <span className="server-count-label">active</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Active Servers ── */}
        {botGuilds.length > 0 && (
          <>
            <div className="section-divider">
              <div className="section-line"></div>
              <span className="section-tag"><Sparkles size={12} /> Active Servers</span>
              <div className="section-line"></div>
            </div>
            <div className="guild-grid">
              {botGuilds.map((guild, i) => (
                <div
                  key={guild.id}
                  className={`guild-card ${guild.isPremium ? 'premium-border' : ''}`}
                  onClick={() => handleSelect(guild.id)}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="guild-card-shimmer"></div>
                  <div className="guild-icon-wrapper">
                    {guild.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                        alt={guild.name}
                        className="guild-icon"
                      />
                    ) : (
                      <div className="guild-icon-placeholder">{guild.name.charAt(0)}</div>
                    )}
                    <div className="bot-pulse"></div>
                  </div>

                  <div className="guild-info">
                    <h3 className="guild-name">{guild.name}</h3>
                    <div className="badge-container">
                      {guild.isMaster && <span className="badge master-badge"><Shield size={10} /> Master</span>}
                      {guild.isPremium && <span className="badge premium-badge"><Crown size={10} /> Premium</span>}
                    </div>
                  </div>

                  <div className="guild-arrow">
                    <ChevronRight size={20} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Invite Needed ── */}
        {inviteGuilds.length > 0 && (
          <>
            <div className="section-divider" style={{ marginTop: '3rem' }}>
              <div className="section-line"></div>
              <span className="section-tag"><Plus size={12} /> Invite Bot</span>
              <div className="section-line"></div>
            </div>
            <div className="guild-grid invite-grid">
              {inviteGuilds.map((guild, i) => (
                <div
                  key={guild.id}
                  className="guild-card no-bot"
                  style={{ animationDelay: `${(botGuilds.length + i) * 0.06}s` }}
                >
                  <div className="guild-icon-wrapper">
                    {guild.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                        alt={guild.name}
                        className="guild-icon"
                      />
                    ) : (
                      <div className="guild-icon-placeholder">{guild.name.charAt(0)}</div>
                    )}
                  </div>

                  <div className="guild-info">
                    <h3 className="guild-name">{guild.name}</h3>
                    <div className="badge-container">
                      <span className="badge invite-badge">Not installed</span>
                    </div>
                  </div>

                  <a
                    href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=3387582172359760&response_type=code&redirect_uri=https%3A%2F%2Fnovafeeds.xyz%2Fapi%2Fauth%2Fcallback%2Fdiscord&integration_type=0&scope=identify+guilds+bot+applications.commands&guild_id=${guild.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="invite-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Plus size={14} /> Invite
                  </a>
                </div>
              ))}
            </div>
          </>
        )}

        {filteredGuilds.length === 0 && !loading && !error && (
          <div className="empty-state">
            <Server size={48} strokeWidth={1} />
            <h3>No servers found</h3>
            <p>Try a different search term</p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src="/nova_v2.jpg" alt="NovaFeeds" className="lp-footer-logo" />
            <div>
              <div className="lp-footer-name">NovaFeeds</div>
              <p className="lp-footer-desc">Your friendly neighborhood Discord feed bot.</p>
            </div>
          </div>
          <div className="lp-footer-col">
            <h4>Product</h4>
            <a href="/dashboard">Dashboard</a>
            <a href="/premium">Premium</a>
          </div>
          <div className="lp-footer-col">
            <h4>Resources</h4>
            <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer">Support Server</a>
            <a href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=3387582172359760&response_type=code&redirect_uri=https%3A%2F%2Fnovafeeds.xyz%2Fapi%2Fauth%2Fcallback%2Fdiscord&integration_type=0&scope=identify+guilds+bot+applications.commands`} target="_blank" rel="noopener noreferrer">Invite Bot</a>
          </div>
          <div className="lp-footer-col">
            <h4>Legal</h4>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} NovaFeeds. All rights reserved.</span>
        </div>
      </footer>

      <style jsx>{`
        .premium-root.is-marketing {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
          background: transparent;
        }

        /* ── Container ── */
        .select-container {
          padding: 8rem 2rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          min-height: 80vh;
        }

        /* ── Hero ── */
        .select-hero {
          text-align: center;
          margin-bottom: 4rem;
          position: relative;
        }
        .select-hero-glow {
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          height: 300px;
          background: radial-gradient(ellipse, rgba(123, 44, 191, 0.12), transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .select-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(123, 44, 191, 0.1);
          border: 1px solid rgba(123, 44, 191, 0.2);
          padding: 6px 16px;
          border-radius: 30px;
          color: #c084fc;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 1.5rem;
          position: relative;
          z-index: 1;
        }
        .select-title {
          font-size: 3.8rem;
          font-weight: 900;
          letter-spacing: -2px;
          color: white;
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
        }
        .select-title-gradient {
          background: linear-gradient(135deg, #c084fc, #7b2cbf, #c084fc);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmerText 3s linear infinite;
        }
        @keyframes shimmerText {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .select-subtitle {
          color: rgba(255,255,255,0.5);
          font-size: 1.15rem;
          max-width: 500px;
          margin: 0 auto 2.5rem;
          position: relative;
          z-index: 1;
        }

        /* ── Search ── */
        .search-wrapper {
          position: relative;
          max-width: 480px;
          margin: 0 auto;
          z-index: 1;
        }
        .search-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.3);
          pointer-events: none;
        }
        .search-bar {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          padding: 14px 110px 14px 52px;
          border-radius: 16px;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        .search-bar::placeholder {
          color: rgba(255,255,255,0.3);
        }
        .search-bar:focus {
          border-color: rgba(123, 44, 191, 0.5);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 30px rgba(123, 44, 191, 0.15);
        }
        .server-count {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(123, 44, 191, 0.15);
          border: 1px solid rgba(123, 44, 191, 0.2);
          padding: 6px 14px;
          border-radius: 12px;
        }
        .server-count-num {
          color: #c084fc;
          font-weight: 800;
          font-size: 0.9rem;
        }
        .server-count-label {
          color: rgba(255,255,255,0.4);
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* ── Section Dividers ── */
        .section-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .section-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
        }
        .section-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.4);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        /* ── Guild Grid ── */
        .guild-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.25rem;
        }

        /* ── Guild Card ── */
        .guild-card {
          position: relative;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          animation: fadeSlideUp 0.5s ease both;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .guild-card-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          transition: left 0.6s ease;
          pointer-events: none;
        }
        .guild-card:hover .guild-card-shimmer {
          left: 100%;
        }
        .guild-card:hover {
          transform: translateY(-4px);
          border-color: rgba(123, 44, 191, 0.3);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(123, 44, 191, 0.08);
        }
        .guild-card.no-bot {
          opacity: 0.55;
          cursor: default;
        }
        .guild-card.no-bot:hover {
          transform: none;
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: none;
        }
        .guild-card.premium-border {
          border-color: rgba(255, 215, 0, 0.25);
        }
        .guild-card.premium-border:hover {
          border-color: rgba(255, 215, 0, 0.5);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), 0 0 25px rgba(255, 215, 0, 0.08);
        }

        /* ── Guild Icon ── */
        .guild-icon-wrapper {
          position: relative;
          flex-shrink: 0;
        }
        .guild-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          object-fit: cover;
        }
        .guild-icon-placeholder {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #7b2cbf, #5b21b6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          font-weight: 800;
          color: white;
        }
        .bot-pulse {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 14px;
          height: 14px;
          background: #10b981;
          border-radius: 50%;
          border: 2.5px solid rgba(15, 15, 25, 1);
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        /* ── Guild Info ── */
        .guild-info {
          flex: 1;
          min-width: 0;
        }
        .guild-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.4rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .badge-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .master-badge {
          background: rgba(123, 44, 191, 0.2);
          color: #c084fc;
          border: 1px solid rgba(123, 44, 191, 0.3);
        }
        .premium-badge {
          background: rgba(255, 215, 0, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(255, 215, 0, 0.25);
        }
        .invite-badge {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.08);
        }

        /* ── Arrow ── */
        .guild-arrow {
          color: rgba(255,255,255,0.15);
          transition: all 0.3s;
          flex-shrink: 0;
        }
        .guild-card:hover .guild-arrow {
          color: #c084fc;
          transform: translateX(3px);
        }

        /* ── Invite Button ── */
        .invite-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(123, 44, 191, 0.2);
          border: 1px solid rgba(123, 44, 191, 0.3);
          color: #c084fc;
          text-decoration: none;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 700;
          transition: all 0.3s;
          flex-shrink: 0;
        }
        .invite-btn:hover {
          background: rgba(123, 44, 191, 0.35);
          border-color: rgba(123, 44, 191, 0.5);
          color: #e0b0ff;
          box-shadow: 0 0 15px rgba(123, 44, 191, 0.2);
        }

        /* ── Empty State ── */
        .empty-state {
          text-align: center;
          padding: 5rem 2rem;
          color: rgba(255,255,255,0.3);
        }
        .empty-state h3 {
          font-size: 1.3rem;
          font-weight: 700;
          color: rgba(255,255,255,0.5);
          margin: 1.5rem 0 0.5rem;
        }
        .empty-state p {
          font-size: 0.95rem;
        }

        /* ── Error ── */
        .error-box {
          background: rgba(255, 77, 77, 0.08);
          border: 1px solid rgba(255, 77, 77, 0.2);
          padding: 2rem;
          border-radius: 18px;
          max-width: 500px;
          margin: 2rem auto;
          color: #ff6b6b;
          backdrop-filter: blur(10px);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .select-title { font-size: 2.5rem; }
          .guild-grid { grid-template-columns: 1fr; }
          .select-container { padding: 7rem 1.5rem 3rem; }
        }
      `}</style>
    </div>
  );
}
