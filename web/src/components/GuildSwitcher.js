"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function getGuildIconUrl(guildId, iconHash, size = 64) {
  if (!iconHash) return null;
  const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}

export default function GuildSwitcher({ isMaster }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentGuildId = searchParams.get("guild");

  // Fetch guilds for the dropdown
  useEffect(() => {
    async function fetchGuilds() {
      try {
        const res = await fetch("/api/guilds");
        if (res.ok) {
          const data = await res.json();
          setGuilds(data);
        }
      } catch (err) {
        console.error("Failed to fetch guilds for switcher:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGuilds();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentGuild = guilds.find(g => g.id === currentGuildId);

  if (!mounted) {
    return (
      <div className="ui-guild-switcher-wrapper" ref={dropdownRef}>
        <button className="ui-guild-switcher-toggle" disabled>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Loading servers...</span>
        </button>
      </div>
    );
  }

  const handleSelect = (id) => {
    setIsOpen(false);
    if (id === "global") {
      router.push("/");
    } else {
      router.push(`/dashboard?guild=${id}`);
    }
  };

  return (
    <div className="ui-guild-switcher-wrapper" ref={dropdownRef}>
      <button
        className={`ui-guild-switcher-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
          {currentGuild ? (
            <>
              {currentGuild.icon ? (
                <img
                  src={getGuildIconUrl(currentGuild.id, currentGuild.icon, 128)}
                  alt=""
                  className="ui-guild-icon-mini"
                />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                  {currentGuild.name.substring(0, 1)}
                </div>
              )}
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentGuild.name}</span>
            </>
          ) : loading && currentGuildId ? (
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textAlign: 'center', width: '100%' }}>Loading...</span>
          ) : (
            <>
              <div className="ui-guild-icon-mini" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '1.2rem' }}>🌐</div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>Global Dashboard</span>
            </>
          )}
        </div>
        <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(255,255,255,0.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}></div>
      </button>

      {isOpen && (
        <div className="ui-select-dropdown" style={{ top: 'calc(100% + 10px)', right: 0, left: 0, padding: '8px' }}>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Loading servers...</div>
            ) : guilds.filter(g => g.hasBot).length > 0 ? (
              guilds.filter(g => g.hasBot).map((guild) => (
                <div
                  key={guild.id}
                  className={`ui-select-item ${currentGuildId === guild.id ? 'ui-selected' : ''}`}
                  onClick={() => handleSelect(guild.id)}
                  style={{ gap: '12px', padding: '8px 12px' }}
                >
                  {guild.icon ? (
                    <img
                      src={getGuildIconUrl(guild.id, guild.icon, 128)}
                      alt=""
                      style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
                      {guild.name.substring(0, 1)}
                    </div>
                  )}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{guild.name}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>● Online</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No servers found.</div>
            )}
          </div>

          <div style={{ padding: '10px 8px 4px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => router.push('/select-server')}
              style={{ width: '100%', background: 'none', border: 'none', color: 'var(--accent-hover)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', padding: '8px' }}
            >
              View All Servers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
