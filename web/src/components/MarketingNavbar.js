"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoginButton from './LoginButton';
import { Layout, Shield, Crown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

function getGuildIconUrl(guildId, iconHash, size = 64) {
  if (!iconHash) return null;
  const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}

export default function MarketingNavbar({ session }) {
  const [scrolled, setScrolled] = useState(false);
  const [serverDropdown, setServerDropdown] = useState(false);
  const [guilds, setGuilds] = useState([]);
  const [guildsLoaded, setGuildsLoaded] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setServerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownToggle = async () => {
    setServerDropdown(!serverDropdown);

    if (!guildsLoaded) {
      try {
        const res = await fetch('/api/guilds');
        if (res.ok) {
          const data = await res.json();
          setGuilds(data.filter(g => g.hasBot));
        }
      } catch (err) {
        console.error('Failed to fetch guilds:', err);
      }
      setGuildsLoaded(true);
    }
  };

  const handleServerSelect = (guildId) => {
    setServerDropdown(false);
    router.push(`/dashboard?guild=${guildId}`);
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const isMobile = mounted && windowWidth <= 768;

  return (
    <nav className={`ui-navbar ${scrolled && !mobileMenuOpen ? 'is-scrolled' : ''} ${mobileMenuOpen ? 'is-open-fixed' : ''}`}>
      <div className="ui-navbar-inner ui-container">
        <Link href="/" className="ui-navbar-brand">
          <div className="ui-navbar-logo-wrapper">
            <img src="/nova_v2.jpg" alt="NovaFeeds" className="ui-navbar-logo" />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120%', height: '120%', background: 'var(--accent-color)', filter: 'blur(15px)', opacity: 0.3, zIndex: 1 }}></div>
          </div>
          <span className="ui-navbar-brand-text">NovaFeeds</span>
        </Link>
        
        <div className={`ui-navbar-links ${mobileMenuOpen ? 'is-open' : ''}`}>
          <Link href="/" className="ui-navbar-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer" className="ui-navbar-link" onClick={() => setMobileMenuOpen(false)}>Support</a>
          <Link href="/premium" className="ui-navbar-link" onClick={() => setMobileMenuOpen(false)}>Premium</Link>
          
          {session && (
            <>
              {!isMobile && (
                <div style={{ position: 'relative' }} ref={dropdownRef} className="ui-desktop-only">
                  <button
                    className="ui-navbar-link"
                    style={{ color: '#c084fc', background: 'rgba(192, 132, 252, 0.1)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(192, 132, 252, 0.2)', cursor: 'pointer' }}
                    onClick={handleDropdownToggle}
                    type="button"
                  >
                    <Layout size={14} />
                    Servers
                  </button>

                  {serverDropdown && (
                    <div className="ui-select-dropdown" style={{ top: 'calc(100% + 12px)', right: 0, width: '280px', padding: '6px' }}>
                      {!guildsLoaded ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 600 }}>Loading...</div>
                      ) : guilds.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 600 }}>No active servers</div>
                      ) : (
                        guilds.map((guild) => (
                          <button
                            key={guild.id}
                            className="ui-select-item"
                            style={{ width: '100%', textAlign: 'left', display: 'flex', gap: '12px' }}
                            onClick={() => handleServerSelect(guild.id)}
                          >
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', background: 'linear-gradient(135deg, #7b2cbf, #5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: 'white' }}>
                              {guild.icon ? (
                                <img
                                  src={getGuildIconUrl(guild.id, guild.icon, 128)}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <span>{guild.name.charAt(0)}</span>
                              )}
                            </div>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guild.name}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {guild.isMaster && <Shield size={12} style={{ color: '#c084fc' }} />}
                              {guild.isPremium && <Crown size={12} style={{ color: '#fbbf24' }} />}
                            </div>
                          </button>
                        ))
                      )}
                      <Link
                        href="/select-server"
                        style={{ display: 'block', textAlign: 'center', padding: '10px', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}
                        onClick={() => { setServerDropdown(false); setMobileMenuOpen(false); }}
                      >
                        View all servers
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {isMobile && (
                <div className="ui-mobile-only">
                  <Link href="/select-server" className="ui-navbar-link" onClick={() => setMobileMenuOpen(false)}>
                    Servers
                  </Link>
                </div>
              )}
            </>
          )}
          
          <div className="ui-navbar-mobile-login">
            <LoginButton session={session} isMobile={true} />
          </div>
        </div>
        
        {!isMobile && (
          <div className="ui-navbar-actions">
            <LoginButton session={session} />
          </div>
        )}

        <button 
          className="ui-navbar-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <div className={`hamburger ${mobileMenuOpen ? 'is-open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </nav>
  );
}
