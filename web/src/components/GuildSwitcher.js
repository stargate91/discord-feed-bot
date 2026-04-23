"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

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
      <div className="guild-switcher-wrapper" ref={dropdownRef}>
        <button className="guild-switcher-toggle" disabled>
          <div className="current-guild-info">
            <span className="guild-name-mini">Loading servers...</span>
          </div>
          <span className="chevron down">▼</span>
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
    <div className="guild-switcher-wrapper" ref={dropdownRef}>
      <button 
        className={`guild-switcher-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="current-guild-info">
          {currentGuild ? (
            <>
              {currentGuild.icon ? (
                <img 
                  src={`https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png`} 
                  alt="" 
                  className="guild-icon-mini" 
                />
              ) : (
                <div className="guild-icon-placeholder small">
                  {currentGuild.name.substring(0, 1)}
                </div>
              )}
              <span className="guild-name-mini">{currentGuild.name}</span>
            </>
          ) : loading && currentGuildId ? (
            <span className="guild-name-mini" style={{ opacity: 0.5, textAlign: 'center', width: '100%', display: 'block' }}>Loading...</span>
          ) : (
            <>
              <div className="guild-icon-mini global">🌐</div>
              <span className="guild-name-mini">Global Dashboard</span>
            </>
          )}
        </div>
        <span className={`chevron ${isOpen ? 'up' : 'down'}`}>▼</span>
      </button>

      {isOpen && (
        <div className="guild-switcher-dropdown">
          <div className="dropdown-scroll">
            {loading ? (
              <div className="dropdown-loading">Loading servers...</div>
            ) : guilds.filter(g => g.hasBot).length > 0 ? (
              guilds.filter(g => g.hasBot).map((guild) => (
                <div 
                  key={guild.id}
                  className={`dropdown-item ${currentGuildId === guild.id ? 'active' : ''}`}
                  onClick={() => handleSelect(guild.id)}
                >
                  {guild.icon ? (
                    <img 
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} 
                      alt="" 
                      className="item-icon-img" 
                    />
                  ) : (
                    <div className="item-icon-placeholder">
                      {guild.name.substring(0, 1)}
                    </div>
                  )}
                  <div className="item-text">
                    <span className="item-name">{guild.name}</span>
                    <span className="item-status">● Online</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="dropdown-empty">No servers found.</div>
            )}
          </div>
          
          <div className="dropdown-footer">
             <button onClick={() => router.push('/select-server')} className="btn-text">
               View All Servers
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
