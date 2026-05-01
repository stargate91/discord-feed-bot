"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Server, Crown, Shield, Plus, ChevronRight } from 'lucide-react';
import MarketingNavbar from '@/components/MarketingNavbar';
import Footer from '@/components/Footer';
import Loading from '@/app/loading';
import styles from './select-server.module.css';

function getGuildIconUrl(guildId, iconHash, size = 64) {
  if (!iconHash) return null;
  const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}

export default function SelectServer() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Sort: active servers first, then invite-needed
  const sortedGuilds = [...guilds].sort((a, b) => (b.hasBot ? 1 : 0) - (a.hasBot ? 1 : 0));

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="premium-root is-marketing">
      <MarketingNavbar session={session} />

      <div className={`${styles.selectContainer} ui-container`}>
        <div className={styles.selectHero}>
          <div className={styles.selectHeroGlow}></div>
          <div className="ui-badge-neon">
            <Server size={14} />
            <span>SERVER HUB</span>
          </div>
          <h1 className="ui-title-hero" style={{ fontSize: '3.5rem' }}>
            Your <span className="ui-text-gradient">Servers</span>
          </h1>
          <p className="ui-text-lead">
            Choose a Discord server to manage its feeds, monitors, and settings.
          </p>

          {error && (
            <div className={styles.errorBox}>
              <p>⚠️ {typeof error === 'string' ? error : 'Internal Server Error'}</p>
              {error?.details && <p style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '5px' }}>Code: {error.details}</p>}
              <button onClick={() => signOut({ callbackUrl: '/' })} className="btn" style={{ background: '#ff4d4d', marginTop: '1rem' }}>
                Re-login
              </button>
            </div>
          )}
        </div>

        {/* ── Unified server list ── */}
        <div className={styles.guildList}>
          {sortedGuilds.map((guild, i) => (
            <div
              key={guild.id}
              className={`${styles.guildCard} ${guild.hasBot ? '' : styles.guildCardNoBot} ${guild.isPremium ? styles.premiumBorder : ''}`}
              onClick={() => guild.hasBot && handleSelect(guild.id)}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className={styles.guildCardShimmer}></div>
              <div className={styles.guildIconWrapper}>
                {guild.icon ? (
                  <img
                    src={getGuildIconUrl(guild.id, guild.icon, 128)}
                    alt={guild.name}
                    className={styles.guildIcon}
                  />
                ) : (
                  <div className={styles.guildIconPlaceholder}>{guild.name.charAt(0)}</div>
                )}
                {guild.hasBot && <div className={styles.botPulse}></div>}
              </div>

              <div className={styles.guildInfo}>
                <h3 className={styles.guildName}>{guild.name}</h3>
                <div className={styles.badgeContainer}>
                  {guild.isMaster && <span className={`${styles.badge} ${styles.masterBadge}`}><Shield size={10} /> Master</span>}
                  {guild.isPremium && <span className={`${styles.badge} ${styles.premiumBadge}`}><Crown size={10} /> Premium</span>}
                  {!guild.hasBot && <span className={`${styles.badge} ${styles.inviteBadge}`}>Not installed</span>}
                </div>
              </div>

              {guild.hasBot ? (
                <div className={styles.guildArrow}>
                  <ChevronRight size={20} />
                </div>
              ) : (
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=3387582172359760&response_type=code&redirect_uri=https%3A%2F%2Fnovafeeds.xyz%2Fapi%2Fauth%2Fcallback%2Fdiscord&integration_type=0&scope=identify+guilds+bot+applications.commands&guild_id=${guild.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.inviteBtn}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus size={14} /> Invite
                </a>
              )}
            </div>
          ))}
        </div>

        {guilds.length === 0 && !loading && !error && (
          <div className={styles.emptyState}>
            <Server size={48} strokeWidth={1} />
            <h3>No servers found</h3>
            <p>Make sure you have admin permissions on at least one Discord server.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
