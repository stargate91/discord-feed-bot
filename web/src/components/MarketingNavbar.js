"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoginButton from './LoginButton';
import { Layout, Shield, Crown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import styles from '../app/marketing.module.css';

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
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  return (
    <nav className={`${styles.lpNavbar} ${scrolled ? styles.isScrolled : ''}`}>
      <div className={styles.lpNavbarInner}>
        <Link href="/" className={styles.lpBrand}>
          <div className={styles.lpBrandLogoWrapper}>
            <img src="/nova_v2.jpg" alt="NovaFeeds" className={styles.lpBrandImg} />
            <div className={styles.lpBrandGlow}></div>
          </div>
          <span className={styles.lpBrandText}>NovaFeeds</span>
        </Link>
        
        <div className={styles.lpNavLinks}>
          <Link href="/" className={styles.lpNavLink}>Home</Link>
          <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer" className={styles.lpNavLink}>Support</a>
          <Link href="/premium" className={styles.lpNavLink}>Premium</Link>
          {session && (
            <div className={styles.serversDropdownWrapper} ref={dropdownRef}>
              <button
                className={`${styles.lpNavLink} ${styles.lpServersLink}`}
                onClick={handleDropdownToggle}
                type="button"
              >
                <Layout size={14} />
                Servers
              </button>

              {serverDropdown && (
                <div className={styles.serversDropdown}>
                  {!guildsLoaded ? (
                    <div className={styles.dropdownLoading}>Loading...</div>
                  ) : guilds.length === 0 ? (
                    <div className={styles.dropdownEmpty}>No active servers</div>
                  ) : (
                    guilds.map((guild) => (
                      <button
                        key={guild.id}
                        className={styles.dropdownItem}
                        onClick={() => handleServerSelect(guild.id)}
                      >
                        <div className={styles.dropdownIcon}>
                          {guild.icon ? (
                            <img
                              src={getGuildIconUrl(guild.id, guild.icon, 128)}
                              alt=""
                            />
                          ) : (
                            <span>{guild.name.charAt(0)}</span>
                          )}
                        </div>
                        <span className={styles.dropdownName}>{guild.name}</span>
                        <div className={styles.dropdownBadges}>
                          {guild.isMaster && <Shield size={12} className={styles.dropdownMaster} />}
                          {guild.isPremium && <Crown size={12} className={styles.dropdownPremium} />}
                        </div>
                      </button>
                    ))
                  )}
                  <Link
                    href="/select-server"
                    className={styles.dropdownViewAll}
                    onClick={() => setServerDropdown(false)}
                  >
                    View all servers
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.lpNavRight}>
          <LoginButton session={session} />
        </div>
      </div>
    </nav>
  );
}
