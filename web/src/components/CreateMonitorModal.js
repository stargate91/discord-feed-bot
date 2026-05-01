"use client";

import { useState, useEffect, useRef } from 'react';
import MultiSelect from './MultiSelect';
import { X, ChevronRight, ChevronLeft, Info, Plus, Trash2 } from 'lucide-react';
import { useToast } from "@/context/ToastContext";
import ColorPicker from './ColorPicker';

const PLATFORMS = [
  // Content & Streaming
  { id: 'youtube', name: 'YouTube', logo: '/emojis/youtube.png', color: '#FF0000', description: 'Monitor a channel for new videos.', inputLabel: 'Channel Info', inputKey: 'channel_id', placeholder: '@handle, Link or Name', hint: 'Format: @handle, channel link, name or UCID.' },
  { id: 'twitch', name: 'Twitch', logo: '/emojis/twitch.png', color: '#9146FF', description: 'Go live alerts for Twitch streamers.', inputLabel: 'Username', inputKey: 'username', placeholder: 'twitch_user', hint: 'Format: Username or Channel Link.' },
  { id: 'kick', name: 'Kick', logo: '/emojis/kick.png', color: '#53fc18', description: 'Go live alerts for Kick streamers.', inputLabel: 'Username', inputKey: 'username', placeholder: 'kick_user', hint: 'Format: Username or Channel Link.' },

  // Gaming
  { id: 'epic_games', name: 'Epic Free', logo: '/emojis/epic-games.png', color: '#ffffff', description: 'Weekly free games from Epic Store.', isGlobal: true },
  { id: 'steam_free', name: 'Steam Free', logo: '/emojis/steam.png', color: '#66c0f4', description: 'New free games discovered on Steam.', isGlobal: true },
  { id: 'steam_news', name: 'Steam News', logo: '/emojis/steam.png', color: '#66c0f4', description: 'Game updates and news from Steam.', inputLabel: 'Steam Game', inputKey: 'app_id', placeholder: 'Dota 2, 730 or Link', hint: 'Format: Game Name, App ID or Store URL.' },
  { id: 'gog_free', name: 'GOG Free', logo: '/emojis/gog.png', color: '#b237c1', description: 'Limited time free offers on GOG.com.', isGlobal: true },

  // Entertainment
  { id: 'movie', name: 'Movies', logo: '/emojis/tmdb.png', color: '#00d1b2', description: 'Trending and new popular movies.', isGlobal: true },
  { id: 'tv_series', name: 'TV Series', logo: '/emojis/tmdb.png', color: '#3273dc', description: 'Daily trending and new TV shows.', isGlobal: true },

  // Tech & General
  { id: 'github', name: 'GitHub', logo: '/emojis/github.png', color: '#ffffff', description: 'New releases or commits from a repo.', inputLabel: 'Repository', inputKey: 'repo', placeholder: 'owner/repo', hint: 'Format: "owner/repo" or Repository URL.' },
  { id: 'crypto', name: 'Crypto', logo: '/emojis/crypto.png', color: '#F7931A', description: 'Price alerts and coin news.', isCrypto: true },
  { id: 'rss', name: 'RSS Feed', logo: '/emojis/rss.png', color: '#ee802f', description: 'Generic RSS/Atom feed monitoring.', inputLabel: 'Feed URL', inputKey: 'rss_url', placeholder: 'https://example.com/feed', hint: 'Format: Full URL (e.g. https://site.com/feed.xml).' }
];

const MOVIE_GENRES = [
  { id: '28', name: 'Action' },
  { id: '12', name: 'Adventure' },
  { id: '16', name: 'Animation' },
  { id: '9999', name: 'Anime' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '10751', name: 'Family' },
  { id: '14', name: 'Fantasy' },
  { id: '36', name: 'History' },
  { id: '27', name: 'Horror' },
  { id: '10402', name: 'Music' },
  { id: '9648', name: 'Mystery' },
  { id: '10749', name: 'Romance' },
  { id: '878', name: 'Science Fiction' },
  { id: '53', name: 'Thriller' },
  { id: '10752', name: 'War' },
  { id: '37', name: 'Western' },
  { id: '10759', name: 'Action & Adventure (TV)' },
  { id: '10762', name: 'Kids (TV)' },
  { id: '10765', name: 'Sci-Fi & Fantasy (TV)' }
];

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'hu', name: 'Hungarian' },
  { id: 'de', name: 'German' },
  { id: 'fr', name: 'French' },
  { id: 'es', name: 'Spanish' },
  { id: 'it', name: 'Italian' },
  { id: 'pt', name: 'Portuguese' },
  { id: 'ja', name: 'Japanese' },
  { id: 'ko', name: 'Korean' },
  { id: 'zh', name: 'Chinese' },
  { id: 'ru', name: 'Russian' },
  { id: 'tr', name: 'Turkish' },
  { id: 'pl', name: 'Polish' },
  { id: 'nl', name: 'Dutch' },
  { id: 'ar', name: 'Arabic' }
];

const getAvailableVars = (platformId) => {
  if (platformId === 'youtube') return ['name', 'title'];
  if (platformId === 'crypto') return ['name', 'price', 'percent', 'direction'];
  if (platformId === 'steam_news') return ['name', 'author', 'title'];
  if (platformId === 'github') return ['name', 'version'];
  if (platformId === 'movie' || platformId === 'tv_series') return ['name', 'title'];
  if (platformId === 'epic_games' || platformId === 'steam_free' || platformId === 'gog_free') return ['name', 'title'];
  if (platformId === 'rss') return ['name', 'title'];
  if (platformId === 'twitch') return ['name', 'game', 'title', 'viewers', 'platform'];
  if (platformId === 'kick') return ['name', 'game', 'title', 'viewers', 'platform'];
  return ['name'];
};

import { useConfig } from '@/hooks/useConfig';

export default function CreateMonitorModal({ guildId, isOpen, onClose, onSuccess, tier = 0, isPremium = false }) {
  const { hasFeature } = useConfig();

  const isLocked = (featureName) => {
    return !hasFeature(tier, isPremium, featureName);
  };

  const { addToast, showSuccess } = useToast();
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    target_channels: [],
    target_roles: [],
    embed_color: '#3d3f45',
    platform_input: '',
    custom_alert: '',
    include_upcoming: false,
    target_genres: [],
    target_languages: [],
    send_initial_alert: true,
    use_native_player: false,
    custom_image: '',
  });

  const [cryptoPairs, setCryptoPairs] = useState([{ symbol: '', threshold: '' }]);
  const [guildChannels, setGuildChannels] = useState([]);
  const [guildRoles, setGuildRoles] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedChannel, setResolvedChannel] = useState(null);

  // Universal Autocomplete States (Steam, Twitch, GitHub)
  const [autoQuery, setAutoQuery] = useState('');
  const [autoResults, setAutoResults] = useState([]);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [showAutoDropdown, setShowAutoDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAutoDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Universal Search
  useEffect(() => {
    const supportedPlatforms = ['steam_news', 'twitch', 'github'];
    if (!selectedPlatform || !supportedPlatforms.includes(selectedPlatform.id)) return;
    
    const delayDebounceFn = setTimeout(async () => {
      if (autoQuery.trim().length >= 3) {
        setIsAutoSearching(true);
        try {
          const endpoint = `/api/${selectedPlatform.id === 'steam_news' ? 'steam' : selectedPlatform.id}/search?q=${encodeURIComponent(autoQuery)}`;
          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            setAutoResults(data);
            setShowAutoDropdown(true);
          }
        } catch (e) {
          console.error(`${selectedPlatform.id} search failed:`, e);
        }
        setIsAutoSearching(false);
      } else {
        setAutoResults([]);
        setShowAutoDropdown(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [autoQuery, selectedPlatform]);

  const handleYouTubeResolve = async () => {
    if (!formData.platform_input) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/youtube/resolve?input=${encodeURIComponent(formData.platform_input)}`);
      if (res.ok) {
        const data = await res.json();
        setResolvedChannel(data);
        setFormData(prev => ({ ...prev, platform_input: data.id, name: data.title }));
        addToast(`Found: ${data.title}`, 'success', 'YouTube Found');
      } else {
        addToast('Could not find YouTube channel. Check the name/link.', 'error', 'Not Found');
      }
    } catch (err) {
      console.error(err);
    }
    setResolving(false);
  };

  useEffect(() => {
    if (isOpen && guildId) {
      setLoadingContext(true);
      Promise.all([
        fetch(`/api/guilds/${guildId}/channels`),
        fetch(`/api/guilds/${guildId}/roles`)
      ]).then(async ([chanRes, roleRes]) => {
        if (chanRes.ok) setGuildChannels(await chanRes.json());
        if (roleRes.ok) setGuildRoles(await roleRes.json());
        setLoadingContext(false);
      });
    }
    if (!isOpen) {
      setStep(1);
      setSelectedPlatform(null);
      setFormData({ name: '', target_channels: [], target_roles: [], embed_color: '#3d3f45', platform_input: '', custom_alert: '', include_upcoming: false, target_genres: [], target_languages: [], send_initial_alert: true, use_native_player: false });
      setCryptoPairs([{ symbol: '', threshold: '' }]);
      setAutoQuery('');
      setAutoResults([]);
      setResolvedChannel(null);
    }
  }, [isOpen, guildId]);

  if (!isOpen) return null;

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setFormData(prev => ({
      ...prev,
      name: platform.name,
      embed_color: '#3d3f45'
    }));
    setStep(2);
  };

  const addCryptoPair = () => setCryptoPairs([...cryptoPairs, { symbol: '', threshold: '' }]);
  const removeCryptoPair = (index) => setCryptoPairs(cryptoPairs.filter((_, i) => i !== index));
  const updateCryptoPair = (index, field, value) => {
    const next = [...cryptoPairs];
    if (field === 'symbol') next[index][field] = value.toUpperCase();
    else next[index][field] = value;
    setCryptoPairs(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.target_channels || formData.target_channels.length === 0) {
      addToast('You must select at least one target channel.', 'error', 'Missing Channel');
      return;
    }

    setCreating(true);

    let platformInput = formData.platform_input;
    if (selectedPlatform.isCrypto) {
      platformInput = cryptoPairs
        .filter(p => p.symbol && p.threshold)
        .map(p => `${p.symbol}:${p.threshold}`)
        .join(', ');
    }

    const payload = {
      type: selectedPlatform.id,
      name: formData.name,
      guildId: guildId,
      target_channels: formData.target_channels,
      target_roles: formData.target_roles,
      embed_color: formData.embed_color,
      custom_alert: formData.custom_alert,
      include_upcoming: formData.include_upcoming,
      target_genres: formData.target_genres,
      target_languages: formData.target_languages,
      send_initial_alert: ['twitch', 'kick'].includes(selectedPlatform.id) ? formData.send_initial_alert : false,
      use_native_player: selectedPlatform.id === 'youtube' ? formData.use_native_player : undefined,
      custom_image: formData.custom_image,
    };

    if (!selectedPlatform.isGlobal) {
      payload[selectedPlatform.id === 'crypto' ? 'symbols' : selectedPlatform.inputKey] = platformInput;
    }

    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showSuccess();
        addToast(`Monitor '${formData.name}' has been created and is now active.`, 'success', 'Monitor Created');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        addToast(err.error || 'Failed to create monitor', 'error', 'Error');
      }
    } catch (err) {
      console.error(err);
    }
    setCreating(false);
  };

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content">
        <div className="ui-modal-header">
          <div>
            <h3 className="ui-modal-title">Add New Monitor</h3>
            <p className="ui-modal-subtitle">Choose a platform to start</p>
          </div>
          <button className="ui-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {step === 1 ? (
          <div className="ui-platform-grid">
            {PLATFORMS.map(p => (
              <div
                key={p.id}
                className="ui-platform-card"
                onClick={() => handlePlatformSelect(p)}
                style={{ "--platform-color": p.color }}
              >
                <div className="ui-platform-icon-wrapper">
                  <img src={p.logo} alt={p.name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <div className="ui-platform-icon-glow"></div>
                </div>
                <div className="ui-platform-info">
                  <span className="ui-monitor-name" style={{ fontSize: '1rem' }}>{p.name}</span>
                  <span className="ui-platform-desc">{p.description}</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }}>
                  <ChevronRight size={18} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ui-modal-body" style={{ padding: 0 }}>
            <div style={{ padding: '2.5rem' }}>
              <h4 className="ui-platform-label" style={{ marginBottom: '1.5rem', color: 'var(--accent-hover)' }}>Essential Config</h4>
              <div className="ui-form-group">
                <label className="ui-form-label">Monitor Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="ui-input"
                  placeholder="e.g. My Favorite Streamer"
                />
              </div>

              {selectedPlatform.isCrypto ? (
                <div className="form-group highlighted-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label>Price Alert Targets</label>
                    <div className="hint-pill"><Info size={12} /> Set coin and threshold</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {cryptoPairs.map((pair, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="BTC"
                          value={pair.symbol}
                          onChange={(e) => updateCryptoPair(idx, 'symbol', e.target.value)}
                          className="ui-input ui-input-mono"
                          style={{ flex: 1, padding: '0.6rem 0.8rem' }}
                          required
                        />
                        <span style={{ opacity: 0.3 }}>:</span>
                        <input
                          type="number"
                          placeholder="50000"
                          value={pair.threshold}
                          onChange={(e) => updateCryptoPair(idx, 'threshold', e.target.value)}
                          className="ui-input ui-input-mono"
                          style={{ flex: 2, padding: '0.6rem 0.8rem' }}
                          required
                        />
                        {cryptoPairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCryptoPair(idx)}
                            className="delete-icon-btn"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addCryptoPair}
                      className="add-pair-btn"
                    >
                      <Plus size={14} /> Add Another Coin
                    </button>
                  </div>
                </div>
              ) : !selectedPlatform.isGlobal && (
                <div className="form-group highlighted-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>{selectedPlatform.inputLabel}</label>
                    <div className="hint-pill"><Info size={12} /> {selectedPlatform.hint}</div>
                  </div>
                  <div className="input-with-action">
                    {['steam_news', 'twitch', 'github'].includes(selectedPlatform?.id) ? (
                      <div className="autocomplete-wrapper" style={{ flex: 1 }} ref={dropdownRef}>
                        <input
                          type="text"
                          value={autoQuery || formData.platform_input}
                          onChange={(e) => {
                            setAutoQuery(e.target.value);
                            setFormData({ ...formData, platform_input: e.target.value });
                          }}
                          onFocus={() => autoResults.length > 0 && setShowAutoDropdown(true)}
                          required
                          className="ui-input"
                          style={{ width: '100%' }}
                          placeholder={selectedPlatform.placeholder}
                        />
                        {isAutoSearching && (
                          <div className="search-loader"></div>
                        )}
                        {showAutoDropdown && autoResults.length > 0 && (
                          <div className="ui-autocomplete-dropdown">
                            {autoResults.map(item => (
                              <div 
                                key={item.id} 
                                className="ui-autocomplete-item"
                                onClick={() => {
                                  setFormData({ ...formData, platform_input: item.id, name: item.name });
                                  setAutoQuery(item.id); 
                                  setShowAutoDropdown(false);
                                }}
                              >
                                <img src={item.thumbnail || "/nova_thumbnail.jpg"} alt={item.name} style={{ width: '40px', height: '40px', borderRadius: selectedPlatform.id === 'twitch' ? '50%' : '8px', objectFit: 'cover' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>
                                    {item.name} {item.is_live && <span style={{ background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>LIVE</span>}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                    {selectedPlatform.id === 'github' ? `⭐ ${item.stars} - ${item.id}` : `ID: ${item.id}`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formData.platform_input}
                        onChange={(e) => setFormData({ ...formData, platform_input: e.target.value })}
                        required
                        className="ui-input"
                        style={{ flex: 1 }}
                        placeholder={selectedPlatform.placeholder}
                      />
                    )}

                    {selectedPlatform.id === 'youtube' && (
                      <button
                        type="button"
                        onClick={handleYouTubeResolve}
                        className={`action-link-btn ${resolving ? 'loading' : ''}`}
                        disabled={resolving || !formData.platform_input}
                      >
                        {resolving ? 'Checking...' : (resolvedChannel ? 'Change' : 'Verify')}
                      </button>
                    )}
                  </div>
                  
                  {selectedPlatform.id === 'youtube' && resolvedChannel && (
                    <div className="validation-chip">
                      <div className="chip-avatar">
                        <img src={resolvedChannel.thumbnail} alt="" />
                        <div className="check-mark">✓</div>
                      </div>
                      <div className="chip-content">
                        <span className="chip-title">{resolvedChannel.title}</span>
                        <span className="chip-subtitle">Channel Verified</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedPlatform?.id === 'epic_games' && (
                <div className="checkbox-card">
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="include_upcoming"
                      checked={formData.include_upcoming}
                      onChange={(e) => setFormData({ ...formData, include_upcoming: e.target.checked })}
                    />
                    <div className="checkbox-text">
                      <label htmlFor="include_upcoming">Include Upcoming Games</label>
                      <span>Also notify about the free games coming next week.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {(selectedPlatform?.id === 'movie' || selectedPlatform?.id === 'tv_series') && (
              <div style={{ padding: '0 2.5rem 2.5rem 2.5rem' }}>
                <h4 className="ui-platform-label" style={{ marginBottom: '1.5rem', color: 'var(--accent-hover)' }}>Advanced Filters</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', position: 'relative' }}>
                  <div className="ui-form-group" style={{ opacity: isLocked("genre_filter") ? 0.5 : 1 }}>
                    <label className="ui-form-label">Target Genres</label>
                    <MultiSelect
                      options={MOVIE_GENRES}
                      value={formData.target_genres}
                      onChange={(val) => setFormData({ ...formData, target_genres: val })}
                      placeholder={isLocked("genre_filter") ? "Unlock Starter Tier" : "Select genres"}
                      disabled={isLocked("genre_filter")}
                    />
                  </div>
                  <div className="ui-form-group" style={{ opacity: isLocked("tmdb_language_filter") ? 0.5 : 1 }}>
                    <label className="ui-form-label">Languages</label>
                    <MultiSelect
                      options={LANGUAGES}
                      value={formData.target_languages}
                      onChange={(val) => setFormData({ ...formData, target_languages: val })}
                      placeholder={isLocked("tmdb_language_filter") ? "Unlock Starter Tier" : "Select languages"}
                      disabled={isLocked("tmdb_language_filter")}
                    />
                  </div>
                  {(isLocked("genre_filter") || isLocked("tmdb_language_filter")) && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                      <span style={{ background: 'var(--accent-color)', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 5px 15px var(--accent-glow)' }}>Starter Tier+</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ padding: '0 2.5rem 2.5rem 2.5rem' }}>
              <h4 className="ui-platform-label" style={{ marginBottom: '1.5rem', color: 'var(--accent-hover)' }}>Notification Settings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div className="ui-form-group">
                  <label className="ui-form-label">Target Channels</label>
                  <MultiSelect
                    options={guildChannels}
                    value={formData.target_channels}
                    onChange={(val) => setFormData({ ...formData, target_channels: val })}
                    placeholder={loadingContext ? "Loading..." : "Select channels"}
                  />
                </div>
                <div className="ui-form-group">
                  <label className="ui-form-label">Ping Roles</label>
                  <MultiSelect
                    options={guildRoles}
                    value={formData.target_roles}
                    onChange={(val) => setFormData({ ...formData, target_roles: val })}
                    placeholder={loadingContext ? "Loading..." : "Select roles"}
                  />
                </div>
              </div>

              <div className="ui-form-group" style={{ background: 'rgba(255, 255, 255, 0.02)', marginTop: '1.5rem', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label className="ui-form-label">Custom Alert Message</label>
                  {isLocked("alert_template") ? (
                    <div style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={12} /> Professional Tier Required
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={12} /> Overrides server defaults
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <textarea
                    name="custom_alert"
                    value={formData.custom_alert}
                    onChange={(e) => setFormData({ ...formData, custom_alert: e.target.value })}
                    className="ui-input ui-textarea ui-input-mono"
                    placeholder={isLocked("alert_template") ? "Unlock Professional Tier to customize messages" : `Leave empty to use default.\nExample: @everyone Here is a new post: {title}`}
                    rows={3}
                    style={{
                      opacity: isLocked("alert_template") ? 0.5 : 1
                    }}
                    disabled={isLocked("alert_template")}
                  />
                  {isLocked("alert_template") && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ background: 'var(--accent-color)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Professional Tier+</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', opacity: isLocked("alert_template") ? 0.3 : 1 }}>
                  {getAvailableVars(selectedPlatform?.id).map(v => (
                    <button
                      key={v}
                      type="button"
                      className="ui-var-btn"
                      onClick={() => !isLocked("alert_template") && setFormData(prev => ({ ...prev, custom_alert: (prev.custom_alert || '') + `{${v}}` }))}
                      title={`Insert {${v}}`}
                      disabled={isLocked("alert_template")}
                    >
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>

              {['twitch', 'kick'].includes(selectedPlatform?.id) && (
                <div style={{
                  marginTop: '1.5rem',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '1rem 1.5rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label className="ui-form-label" style={{ color: 'white' }}>Send initial alert</label>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', maxWidth: '300px' }}>
                      Post an update immediately if the source is already live or has new items.
                    </p>
                  </div>
                  <label className="ui-switch">
                    <input
                      type="checkbox"
                      checked={formData.send_initial_alert}
                      onChange={(e) => setFormData({ ...formData, send_initial_alert: e.target.checked })}
                    />
                    <span className="ui-switch-slider"></span>
                  </label>
                </div>
              )}

              {selectedPlatform?.id === 'youtube' && (
                <div style={{
                  marginTop: '1.5rem',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '1rem 1.5rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: isLocked("custom_color") ? 0.5 : 1
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label className="ui-form-label" style={{ color: 'white' }}>Use Native Discord Player</label>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', maxWidth: '300px' }}>
                      Bypass the custom layout and let Discord embed the video directly.
                    </p>
                  </div>
                  {isLocked("custom_color") ? (
                    <div style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800 }}>
                      <Info size={12} /> Starter Tier+
                    </div>
                  ) : (
                    <label className="ui-switch">
                      <input
                        type="checkbox"
                        checked={formData.use_native_player}
                        onChange={(e) => setFormData({ ...formData, use_native_player: e.target.checked })}
                      />
                      <span className="ui-switch-slider"></span>
                    </label>
                  )}
                </div>
              )}

              {(!['youtube'].includes(selectedPlatform?.id) || (selectedPlatform?.id === 'youtube' && !formData.use_native_player)) && (
                <div className="form-group" style={{ marginTop: '1rem', opacity: isLocked("custom_color") ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Embed Color</label>
                    {isLocked("custom_color") && (
                      <div className="hint-pill" style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703' }}>
                        <Info size={12} /> Starter Tier+
                      </div>
                    )}
                  </div>
                  <ColorPicker 
                    value={formData.embed_color} 
                    onChange={(color) => !isLocked("custom_color") && setFormData({...formData, embed_color: color})}
                    disabled={isLocked("custom_color")}
                  />
                </div>
              )}

              <div className="form-group highlighted-group" style={{ background: 'rgba(255, 255, 255, 0.02)', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label>Custom Image URL</label>
                  {isLocked("custom_color") ? (
                    <div className="hint-pill" style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703' }}>
                      <span style={{ fontSize: '10px' }}>⭐ Starter Tier Required</span>
                    </div>
                  ) : (
                    <div className="hint-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                      <Info size={12} /> Imgur, Discord, etc.
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formData.custom_image}
                    onChange={(e) => setFormData({ ...formData, custom_image: e.target.value })}
                    className="ui-input"
                    placeholder={isLocked("custom_color") ? "Unlock Starter Tier to use custom images" : "https://imgur.com/example.png"}
                    style={{ 
                      opacity: isLocked("custom_color") ? 0.5 : 1
                    }}
                    disabled={isLocked("custom_color")}
                  />
                  {isLocked("custom_color") && (
                    <div className="premium-field-overlay">
                      <span className="lock-tag">Starter Tier+</span>
                    </div>
                  )}
                </div>
                {!isLocked("custom_color") && formData.custom_image && (
                   <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', height: '100px', width: 'fit-content' }}>
                     <img src={formData.custom_image} alt="Preview" style={{ height: '100%', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                   </div>
                )}
              </div>
            </div>

            <div className="ui-modal-footer">
              <button type="button" className="ui-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => setStep(1)}>
                <ChevronLeft size={18} /> Back
              </button>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create Monitor'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
