"use client";

import { useState, useEffect, useRef } from 'react';
import MultiSelect from './MultiSelect';
import { X, Plus, Trash2, Info } from 'lucide-react';
import ColorPicker from './ColorPicker';

// --- STATIC OPTIONS ---
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

export default function EditMonitorModal({ monitor, guildId, isOpen, onClose, onSave, tier = 0, isPremium = false }) {
  const { hasFeature } = useConfig();
  
  const isLocked = (featureName) => {
    return !hasFeature(tier, isPremium, featureName);
  };

  const [formData, setFormData] = useState({
    name: '',
    target_channels: [],
    target_roles: [],
    embed_color: '',
    steam_patch_only: false,
    target_genres: [],
    target_genres: [],
    target_languages: [],
    custom_alert: '',
    include_upcoming: false,
    use_native_player: false,
    custom_image: ''
  });

  const [cryptoPairs, setCryptoPairs] = useState([{ symbol: '', threshold: '' }]);
  const [guildChannels, setGuildChannels] = useState([]);
  const [guildRoles, setGuildRoles] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const colorInputRef = useRef(null);

  // Fetch Channels & Roles when modal opens
  useEffect(() => {
    if (isOpen && guildId) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const [chanRes, roleRes] = await Promise.all([
            fetch(`/api/guilds/${guildId}/channels`),
            fetch(`/api/guilds/${guildId}/roles`)
          ]);
          if (chanRes.ok) setGuildChannels(await chanRes.json());
          if (roleRes.ok) setGuildRoles(await roleRes.json());
        } catch (err) {
          console.error("Failed to fetch guild context:", err);
        }
        setLoadingData(false);
      };
      fetchData();
    }
  }, [isOpen, guildId]);

  // Sync monitor data to form
  useEffect(() => {
    if (monitor && isOpen) {
      setFormData({
        name: monitor.name || '',
        target_channels: monitor.target_channels || [],
        target_roles: monitor.target_roles || [],
        embed_color: monitor.embed_color || '#3d3f45',
        steam_patch_only: !!monitor.steam_patch_only,
        target_genres: monitor.target_genres || [],
        target_languages: monitor.target_languages || [],
        custom_alert: monitor.custom_alert || monitor.extra_settings?.custom_alert || '',
        include_upcoming: !!(monitor.include_upcoming || monitor.extra_settings?.include_upcoming),
        use_native_player: !!(monitor.use_native_player || monitor.extra_settings?.use_native_player),
        custom_image: monitor.custom_image || monitor.extra_settings?.custom_image || ''
      });

      if (monitor.type === 'crypto') {
        const symbolsStr = monitor.symbols || monitor.source_id || '';
        const pairs = symbolsStr.split(',').filter(p => p.includes(':')).map(p => {
          const [s, t] = p.split(':');
          return { symbol: s.trim().toUpperCase(), threshold: t.trim() };
        });
        setCryptoPairs(pairs.length > 0 ? pairs : [{ symbol: '', threshold: '' }]);
      }
    }
  }, [monitor, isOpen]);

  if (!isOpen || !monitor) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMultiChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
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
    setSaving(true);

    const updateData = {
      name: formData.name,
      target_channels: formData.target_channels,
      target_roles: formData.target_roles,
      embed_color: formData.embed_color,
      custom_alert: formData.custom_alert,
      include_upcoming: formData.include_upcoming,
      custom_image: formData.custom_image,
    };
    
    if (monitor.type === 'youtube') {
      updateData.use_native_player = formData.use_native_player;
    }

    if (monitor.type === 'crypto') {
      updateData.symbols = cryptoPairs
        .filter(p => p.symbol && p.threshold)
        .map(p => `${p.symbol}:${p.threshold}`)
        .join(', ');
    }

    if (monitor.type === 'steam_news') {
      updateData.steam_patch_only = formData.steam_patch_only;
    }
    if (monitor.type === 'movie' || monitor.type === 'tv_series') {
      updateData.target_genres = formData.target_genres;
      updateData.target_languages = formData.target_languages;
    }

    const success = await onSave(monitor.id, updateData);
    setSaving(false);
    if (success !== false) onClose();
  };

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content">
        <div className="ui-modal-header">
          <div className="ui-platform-icon-wrapper" style={{ width: '56px', height: '56px' }}>
             <img 
               src={`/emojis/${monitor.type === 'steam_news' ? 'steam' : monitor.type === 'epic_games' ? 'epic-games' : monitor.type === 'tv_series' || monitor.type === 'movie' ? 'tmdb' : monitor.type}.png`} 
               alt="" 
               style={{ width: '32px', height: '32px', zIndex: 2 }}
             />
             <div className="ui-platform-icon-glow" style={{ background: monitor.type === 'twitch' ? '#9146FF' : monitor.type === 'kick' ? '#53fc18' : monitor.type === 'steam_news' ? '#66c0f4' : monitor.type === 'rss' ? '#ee802f' : monitor.type === 'youtube' ? '#FF0000' : monitor.type === 'github' ? '#ffffff' : 'var(--accent-color)', opacity: 0.2 }}></div>
          </div>
          <div style={{ flex: 1, marginLeft: '1.5rem' }}>
            <h3 className="ui-modal-title">Edit Monitor</h3>
            <p className="ui-modal-subtitle">{monitor.name} <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--accent-hover)', border: '1px solid rgba(255,255,255,0.1)', marginLeft: '10px' }}>{monitor.type}</span></p>
          </div>
          <button className="ui-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="ui-modal-body">
          <div className="ui-form-group">
            <label className="ui-form-label">Monitor Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="ui-input"
              placeholder="Enter a descriptive name"
            />
          </div>

          {monitor.type === 'crypto' && (
            <div className="ui-form-group" style={{ background: 'rgba(123, 44, 191, 0.04)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(123, 44, 191, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label className="ui-form-label">Price Alert Targets</label>
                <div className="ui-hint-pill" style={{ background: 'rgba(50, 150, 255, 0.1)', color: '#3296ff' }}><Info size={12} /> Set coin and threshold</div>
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
                      style={{ flex: 1 }}
                      required
                    />
                    <span style={{ opacity: 0.3 }}>:</span>
                    <input
                      type="number"
                      placeholder="50000"
                      value={pair.threshold}
                      onChange={(e) => updateCryptoPair(idx, 'threshold', e.target.value)}
                      className="ui-input ui-input-mono"
                      style={{ flex: 2 }}
                      required
                    />
                    {cryptoPairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCryptoPair(idx)}
                        className="ui-delete-btn"
                        style={{ width: '44px', height: '44px' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCryptoPair}
                  className="ui-add-btn"
                  style={{ marginTop: '5px' }}
                >
                  <Plus size={16} /> Add Another Coin
                </button>
              </div>
            </div>
          )}

          <div className="ui-form-group" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label className="ui-form-label">Custom Alert Message</label>
              {isLocked("alert_template") ? (
                <div style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800 }}>
                  <Info size={12} /> Professional Tier Required
                </div>
              ) : (
                <div className="ui-hint-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Info size={12} /> Overrides server defaults
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <textarea
                name="custom_alert"
                value={formData.custom_alert}
                onChange={handleChange}
                className="ui-input ui-textarea ui-input-mono"
                placeholder={isLocked("alert_template") ? "Unlock Professional Tier to customize messages" : `Leave empty to use default.\nExample: @everyone Here is a new post: {title}`}
                rows={3}
                style={{ 
                  opacity: isLocked("alert_template") ? 0.5 : 1
                }}
                disabled={isLocked("alert_template")}
              />
              {isLocked("alert_template") && (
                <div className="ui-premium-field-overlay">
                  <span className="ui-lock-tag">Professional Tier+</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '1rem' }}>
              {getAvailableVars(monitor.type).map(v => (
                <button
                  key={v}
                  type="button"
                  className="ui-btn"
                  style={{ padding: '4px 12px', fontSize: '0.75rem', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)' }}
                  onClick={() => setFormData(prev => ({ ...prev, custom_alert: prev.custom_alert + `{${v}}` }))}
                  title={`Insert {${v}}`}
                >
                  {`{${v}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="ui-platform-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: '1.5rem', gap: '1.5rem' }}>
            <div className="ui-form-group">
              <label className="ui-form-label">Target Channels</label>
              <MultiSelect
                options={guildChannels}
                value={formData.target_channels}
                onChange={(val) => handleMultiChange('target_channels', val)}
                placeholder={loadingData ? "Loading..." : "Select channels"}
              />
            </div>
            <div className="ui-form-group">
              <label className="ui-form-label">Ping Roles</label>
              <MultiSelect
                options={guildRoles}
                value={formData.target_roles}
                onChange={(val) => handleMultiChange('target_roles', val)}
                placeholder={loadingData ? "Loading..." : "Select roles"}
              />
            </div>
          </div>

          {monitor.type === 'youtube' && (
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <label className="ui-form-label" style={{ color: 'white' }}>Use Native Discord Player</label>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.2' }}>
                  Bypass the custom layout and let Discord embed the video directly.
                </p>
              </div>
              {isLocked("custom_color") ? (
                <div style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  <Info size={12} /> Starter Tier+
                </div>
              ) : (
                <label className="ui-switch">
                  <input 
                    type="checkbox" 
                    name="use_native_player"
                    checked={formData.use_native_player} 
                    onChange={handleChange}
                  />
                  <span className="ui-switch-slider"></span>
                </label>
              )}
            </div>
          )}

          {(monitor.type === 'movie' || monitor.type === 'tv_series') && (
            <div className="ui-platform-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', position: 'relative', marginTop: '1.5rem' }}>
              <div className="ui-form-group" style={{ opacity: isLocked("genre_filter") ? 0.5 : 1 }}>
                <label className="ui-form-label">Target Genres</label>
                <MultiSelect
                  options={MOVIE_GENRES}
                  value={formData.target_genres}
                  onChange={(val) => handleMultiChange('target_genres', val)}
                  placeholder={isLocked("genre_filter") ? "Unlock Starter Tier" : "Select genres"}
                  disabled={isLocked("genre_filter")}
                />
              </div>
              <div className="ui-form-group" style={{ opacity: isLocked("tmdb_language_filter") ? 0.5 : 1 }}>
                <label className="ui-form-label">Languages</label>
                <MultiSelect
                  options={LANGUAGES}
                  value={formData.target_languages}
                  onChange={(val) => handleMultiChange('target_languages', val)}
                  placeholder={isLocked("tmdb_language_filter") ? "Unlock Starter Tier" : "Select languages"}
                  disabled={isLocked("tmdb_language_filter")}
                />
              </div>
              {(isLocked("genre_filter") || isLocked("tmdb_language_filter")) && (
                <div className="ui-premium-field-overlay">
                  <span className="ui-lock-tag">Starter Tier+</span>
                </div>
              )}
            </div>
          )}

          {(!['youtube'].includes(monitor.type) || (monitor.type === 'youtube' && !formData.use_native_player)) && (
            <div className="ui-form-group" style={{ position: 'relative', marginTop: '1.5rem' }}>
              <label className="ui-form-label">Embed Accent Color</label>
              <ColorPicker 
                value={formData.embed_color || '#3d3f45'} 
                onChange={(color) => !isLocked("custom_color") && handleMultiChange('embed_color', color)}
                disabled={isLocked("custom_color")}
              />
              {isLocked("custom_color") && (
                <div className="ui-premium-field-overlay" style={{ height: '52px', marginTop: '32px' }}>
                  <span className="ui-lock-tag">Starter Tier+</span>
                </div>
              )}
            </div>
          )}

          <div className="ui-form-group" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label className="ui-form-label">Custom Image URL</label>
              {isLocked("custom_color") ? (
                <div style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800 }}>
                  <Info size={12} /> Starter Tier Required
                </div>
              ) : (
                <div className="ui-hint-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Info size={12} /> Imgur, Discord, etc.
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="custom_image"
                value={formData.custom_image}
                onChange={handleChange}
                className="ui-input"
                placeholder={isLocked("custom_color") ? "Unlock Starter Tier to use custom images" : "https://imgur.com/example.png"}
                style={{ 
                  opacity: isLocked("custom_color") ? 0.5 : 1
                }}
                disabled={isLocked("custom_color")}
              />
              {isLocked("custom_color") && (
                <div className="ui-premium-field-overlay">
                  <span className="ui-lock-tag">Starter Tier+</span>
                </div>
              )}
            </div>
            {!isLocked("custom_color") && formData.custom_image && (
               <div style={{ marginTop: '1rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', height: '100px', width: 'fit-content', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
                 <img src={formData.custom_image} alt="Preview" style={{ height: '100%', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
               </div>
            )}
          </div>




          {monitor.type === 'epic_games' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '20px', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <label className="ui-switch" style={{ marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="include_upcoming"
                    name="include_upcoming"
                    checked={formData.include_upcoming}
                    onChange={handleChange}
                  />
                  <span className="ui-switch-slider"></span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="include_upcoming" style={{ fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', color: 'white' }}>Include Upcoming Games</label>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Also notify about the free games coming next week.</span>
                </div>
              </div>
            </div>
          )}

          <div className="ui-modal-footer">
            <button type="button" className="ui-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="ui-btn ui-btn-primary" disabled={saving || loadingData}>
              {saving ? 'Saving...' : 'Update Monitor'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
