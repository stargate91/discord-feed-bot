"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

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
        setError(errData); // Store the full object
      }
    } catch (err) {
      setError('Connection error');
      console.error(err);
    }
    setLoading(false);
  };

  const handleSelect = (guildId) => {
    // Redirect to dashboard with the guild query param
    router.push(`/dashboard?guild=${guildId}`);
  };

  const filteredGuilds = guilds.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="select-container">
        <div className="loader">Loading Nova...</div>
      </div>
    );
  }

  return (
    <div className="select-container">
      <div className="select-header">
        <div className="user-profile-header">
          <div className="user-info">
            <img 
              src={session?.user?.image} 
              alt="" 
              className="user-avatar-large" 
            />
            <div className="user-text">
              <span className="user-welcome">Logged in as</span>
              <span className="user-name-large">{session?.user?.name}</span>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="signout-link-elegant">
            Sign Out
          </button>
        </div>

        <h1>Select a Server</h1>
        <p>Choose which Discord server's dashboard you want to manage.</p>
        
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
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search your servers..." 
              className="search-bar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="guild-grid">

        {filteredGuilds.map(guild => (
          <div 
            key={guild.id} 
            className={`guild-card ${guild.isPremium ? 'premium-border' : ''} ${!guild.hasBot ? 'no-bot' : ''}`}
            onClick={() => guild.hasBot && handleSelect(guild.id)}
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
              
              {guild.hasBot && <div className="bot-pulse"></div>}
            </div>

            <div className="guild-info">
              <h3 className="guild-name">{guild.name}</h3>
              <div className="badge-container">
                {guild.isMaster && <span className="badge master-badge">Master</span>}
                {guild.isPremium && <span className="badge premium-badge">Premium</span>}
                {!guild.hasBot && <span className="badge invite-badge">Invite Needed</span>}
              </div>
            </div>

            {!guild.hasBot && (
              <a 
                href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}&response_type=code&redirect_uri=${encodeURIComponent('http://localhost:3000/invite-callback')}`}
                rel="noopener noreferrer"
                className="invite-btn"
                onClick={(e) => e.stopPropagation()}
              >
                Invite
              </a>
            )}
          </div>
        ))}
      </div>

      {filteredGuilds.length === 0 && !loading && !error && (
        <div className="empty-state">No servers found with that name.</div>
      )}

      <style jsx>{`
        .user-profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 1rem 1.5rem;
          border-radius: 20px;
          margin-bottom: 4rem;
          backdrop-filter: blur(10px);
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .user-avatar-large {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid var(--accent-color);
          box-shadow: 0 0 15px rgba(123, 44, 191, 0.2);
        }
        .user-text {
          display: flex;
          flex-direction: column;
        }
        .user-welcome {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .user-name-large {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
        }
        .signout-link-elegant {
          background: none;
          border: 1px solid rgba(255, 77, 77, 0.3);
          color: #ff4d4d;
          padding: 0.5rem 1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .signout-link-elegant:hover {
          background: rgba(255, 77, 77, 0.1);
          border-color: #ff4d4d;
        }
        .search-container {
          display: flex;
          justify-content: center;
          width: 100%;
        }
          background: rgba(255, 77, 77, 0.1);
          border: 1px solid rgba(255, 77, 77, 0.3);
          padding: 2.5rem;
          border-radius: 24px;
          max-width: 550px;
          margin: 2rem auto;
          color: #ff4d4d;
          backdrop-filter: blur(10px);
        }
        .select-container {
          padding: 6rem 2rem;
          max-width: 1300px;
          margin: 0 auto;
          min-height: 100vh;
          position: relative;
          z-index: 10;
        }
        .select-header {
          text-align: center;
          margin-bottom: 5rem;
        }
        .select-header h1 {
          font-size: 3.5rem;
          margin-bottom: 1.5rem;
          font-weight: 800;
          letter-spacing: -1px;
          background: linear-gradient(to bottom, #fff, #a0a0b0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .select-header p {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin-bottom: 2.5rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        .search-bar {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          color: white;
          padding: 1.2rem 2.5rem;
          border-radius: 60px;
          width: 100%;
          max-width: 500px;
          outline: none;
          font-size: 1rem;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        }
        .search-bar:focus {
          border-color: var(--accent-color);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 20px rgba(123, 44, 191, 0.2);
        }
        .guild-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2.5rem;
        }
        .guild-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: 1.75rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }
        .guild-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .guild-card.no-bot {
          opacity: 0.6;
          cursor: default;
          filter: grayscale(0.5);
        }
        .guild-card.global-card {
           border-color: var(--accent-color);
           background: rgba(123, 44, 191, 0.08);
           box-shadow: 0 0 30px rgba(123, 44, 191, 0.15);
        }
        .global-icon {
           background: linear-gradient(135deg, #7b2cbf, #240046) !important;
        }
        .premium-border {
          border-color: #ffd700;
          box-shadow: 0 0 25px rgba(255, 215, 0, 0.15);
        }
        .guild-icon-wrapper {
          position: relative;
        }
        .guild-icon {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          object-fit: cover;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .guild-icon-placeholder {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: var(--accent-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          font-weight: 800;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .bot-pulse {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 14px;
          height: 14px;
          background: #10b981;
          border-radius: 50%;
          border: 3px solid rgba(20,20,30,1);
          box-shadow: 0 0 12px #10b981;
        }
        .guild-info {
          flex: 1;
        }
        .guild-name {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.6rem;
          color: white;
        }
        .badge-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }
        .badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .master-badge { background: #7b2cbf; color: white; }
        .premium-badge { background: #ffd700; color: #000; }
        .invite-badge { background: rgba(255,255,255,0.1); color: var(--text-secondary); }
        
        .invite-btn {
          position: absolute;
          bottom: 1.25rem;
          right: 1.25rem;
          background: var(--accent-color);
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          transition: all 0.3s;
          box-shadow: 0 5px 15px rgba(123, 44, 191, 0.3);
        }
        .invite-btn:hover {
          filter: brightness(1.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(123, 44, 191, 0.4);
        }
        .empty-state {
          text-align: center;
          padding: 6rem;
          color: var(--text-secondary);
          font-size: 1.2rem;
        }
        .loader {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--accent-color);
          text-align: center;
          margin-top: 30vh;
          letter-spacing: 2px;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .signout-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: color 0.2s;
          padding: 0.5rem 1rem;
          border-radius: 8px;
        }
        .signout-btn:hover {
          color: var(--text-primary);
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}
