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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="header-platform-icon">
             <img 
               src={`/emojis/${monitor.type === 'steam_news' ? 'steam' : monitor.type === 'epic_games' ? 'epic-games' : monitor.type === 'tv_series' || monitor.type === 'movie' ? 'tmdb' : monitor.type}.png`} 
               alt="" 
             />
             <div className="platform-glow" style={{ "--p-color": monitor.type === 'twitch' ? '#9146FF' : monitor.type === 'kick' ? '#53fc18' : monitor.type === 'steam_news' ? '#66c0f4' : monitor.type === 'rss' ? '#ee802f' : monitor.type === 'youtube' ? '#FF0000' : monitor.type === 'github' ? '#ffffff' : 'var(--accent-color)' }}></div>
          </div>
          <div className="header-main-info">
            <h3>Edit Monitor</h3>
            <p className="subtitle">{monitor.name} <span className="type-badge">{monitor.type}</span></p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Monitor Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="styled-input-main"
              placeholder="Enter a descriptive name"
            />
          </div>

          {monitor.type === 'crypto' && (
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
                      className="styled-input-main compact-input"
                      style={{ flex: 1 }}
                      required
                    />
                    <span style={{ opacity: 0.3 }}>:</span>
                    <input
                      type="number"
                      placeholder="50000"
                      value={pair.threshold}
                      onChange={(e) => updateCryptoPair(idx, 'threshold', e.target.value)}
                      className="styled-input-main compact-input"
                      style={{ flex: 2 }}
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
          )}

          <div className="form-group highlighted-group" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label>Custom Alert Message</label>
              {isLocked("alert_template") ? (
                <div className="hint-pill" style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703' }}>
                  <Info size={12} /> Professional Tier Required
                </div>
              ) : (
                <div className="hint-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Info size={12} /> Overrides server defaults
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <textarea
                name="custom_alert"
                value={formData.custom_alert}
                onChange={handleChange}
                className="styled-input-main"
                placeholder={isLocked("alert_template") ? "Unlock Professional Tier to customize messages" : `Leave empty to use default.\nExample: @everyone Here is a new post: {title}`}
                rows={3}
                style={{ 
                  resize: 'vertical', 
                  fontFamily: 'monospace', 
                  fontSize: '0.9rem',
                  width: '100%',
                  opacity: isLocked("alert_template") ? 0.5 : 1
                }}
                disabled={isLocked("alert_template")}
              />
              {isLocked("alert_template") && (
                <div className="premium-field-overlay">
                  <span className="lock-tag">Professional Tier+</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px' }}>
              {getAvailableVars(monitor.type).map(v => (
                <button
                  key={v}
                  type="button"
                  className="var-btn"
                  onClick={() => setFormData(prev => ({ ...prev, custom_alert: prev.custom_alert + `{${v}}` }))}
                  title={`Insert {${v}}`}
                >
                  {`{${v}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-responsive">
            <div className="form-group">
              <label>Target Channels</label>
              <MultiSelect
                options={guildChannels}
                value={formData.target_channels}
                onChange={(val) => handleMultiChange('target_channels', val)}
                placeholder={loadingData ? "Loading..." : "Select channels"}
              />
            </div>
            <div className="form-group">
              <label>Ping Roles</label>
              <MultiSelect
                options={guildRoles}
                value={formData.target_roles}
                onChange={(val) => handleMultiChange('target_roles', val)}
                placeholder={loadingData ? "Loading..." : "Select roles"}
              />
            </div>
          </div>

          {monitor.type === 'youtube' && (
            <div className="form-group alert-toggle-container" style={{ 
              marginTop: '1rem', 
              background: 'rgba(255,255,255,0.03)', 
              padding: '0.75rem 1.25rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              opacity: isLocked("custom_color") ? 0.5 : 1
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', flex: 1 }}>
                <label style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>Use Native Discord Player</label>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.2' }}>
                  Bypass the custom layout and let Discord embed the video directly.
                </p>
              </div>
              {isLocked("custom_color") ? (
                <div className="hint-pill" style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703', whiteSpace: 'nowrap' }}>
                  <Info size={12} /> Starter Tier+
                </div>
              ) : (
                <label className="switch" style={{ margin: 0 }}>
                  <input 
                    type="checkbox" 
                    name="use_native_player"
                    checked={formData.use_native_player} 
                    onChange={handleChange}
                  />
                  <span className="slider round"></span>
                </label>
              )}
            </div>
          )}

          {(monitor.type === 'movie' || monitor.type === 'tv_series') && (
            <div className="grid-responsive" style={{ position: 'relative', marginTop: '1rem' }}>
              <div className="form-group" style={{ opacity: isLocked("genre_filter") ? 0.5 : 1 }}>
                <label>Target Genres</label>
                <MultiSelect
                  options={MOVIE_GENRES}
                  value={formData.target_genres}
                  onChange={(val) => handleMultiChange('target_genres', val)}
                  placeholder={isLocked("genre_filter") ? "Unlock Starter Tier" : "Select genres"}
                  disabled={isLocked("genre_filter")}
                />
              </div>
              <div className="form-group" style={{ opacity: isLocked("tmdb_language_filter") ? 0.5 : 1 }}>
                <label>Languages</label>
                <MultiSelect
                  options={LANGUAGES}
                  value={formData.target_languages}
                  onChange={(val) => handleMultiChange('target_languages', val)}
                  placeholder={isLocked("tmdb_language_filter") ? "Unlock Starter Tier" : "Select languages"}
                  disabled={isLocked("tmdb_language_filter")}
                />
              </div>
              {(isLocked("genre_filter") || isLocked("tmdb_language_filter")) && (
                <div className="premium-field-overlay">
                  <span className="lock-tag">Starter Tier+</span>
                </div>
              )}
            </div>
          )}

          {(!['youtube'].includes(monitor.type) || (monitor.type === 'youtube' && !formData.use_native_player)) && (
            <div className="form-group" style={{ position: 'relative', marginTop: '1rem' }}>
              <label>Embed Accent Color</label>
              <ColorPicker 
                value={formData.embed_color || '#3d3f45'} 
                onChange={(color) => !isLocked("custom_color") && handleMultiChange('embed_color', color)}
                disabled={isLocked("custom_color")}
              />
              {isLocked("custom_color") && (
                <div className="premium-field-overlay-small" style={{ top: '40px' }}>
                  <span className="lock-tag">Starter Tier+</span>
                </div>
              )}
            </div>
          )}

          <div className="form-group highlighted-group" style={{ background: 'rgba(255, 255, 255, 0.02)', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label>Custom Image URL</label>
              {isLocked("custom_color") ? (
                <div className="hint-pill" style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703' }}>
                  <Info size={12} /> Starter Tier Required
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
                name="custom_image"
                value={formData.custom_image}
                onChange={handleChange}
                className="styled-input-main"
                placeholder={isLocked("custom_color") ? "Unlock Starter Tier to use custom images" : "https://imgur.com/example.png"}
                style={{ 
                  width: '100%',
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




          {monitor.type === 'epic_games' && (
            <div className="checkbox-card">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="include_upcoming"
                  name="include_upcoming"
                  checked={formData.include_upcoming}
                  onChange={handleChange}
                />
                <div className="checkbox-text">
                  <label htmlFor="include_upcoming">Include Upcoming Games</label>
                  <span>Also notify about the free games coming next week.</span>
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || loadingData}>
              {saving ? 'Saving...' : 'Update Monitor'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
          display: flex; align-items: flex-start; justify-content: center;
          z-index: 1000; padding: 2rem; overflow-y: auto;
        }
        .modal-content {
          width: 100%; max-width: 700px; margin-top: 2rem; margin-bottom: 2rem;
          background: rgba(15, 15, 25, 0.95); border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 40px 100px rgba(0,0,0,0.8); padding: 2.5rem; border-radius: 28px;
          animation: modalAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        @keyframes modalAppear { from { opacity: 0; transform: scale(0.9) translateY(40px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
        .modal-header { display: flex; align-items: center; gap: 20px; margin-bottom: 2.5rem; }
        .header-platform-icon { position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; }
        .header-platform-icon img { width: 32px; height: 32px; object-fit: contain; z-index: 2; }
        .platform-glow { position: absolute; width: 100%; height: 100%; background: var(--p-color); filter: blur(20px); opacity: 0.2; border-radius: 16px; z-index: 1; }
        .header-main-info { flex: 1; }
        .modal-header h3 { margin: 0; font-size: 1.6rem; letter-spacing: -0.5px; font-weight: 800; }
        .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; }
        .type-badge { background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; color: var(--accent-color); border: 1px solid rgba(255,255,255,0.1); }
        
        .grid-responsive {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .close-btn { background: rgba(255,255,255,0.05); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .close-btn:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        .modal-form { display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem; }
        .form-group { display: flex; flex-direction: column; gap: 10px; }
        .form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

        .styled-input-main {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          color: white; padding: 0.8rem 1.2rem; border-radius: 12px; outline: none; transition: all 0.25s;
        }
        .styled-input-main:focus { border-color: var(--accent-color); background: rgba(123, 44, 191, 0.05); }

        .highlighted-group { background: rgba(123, 44, 191, 0.04); padding: 1.25rem; border-radius: 16px; border: 1px solid rgba(123, 44, 191, 0.1); }
        .hint-pill { font-size: 0.7rem; font-weight: 600; background: rgba(50, 150, 255, 0.1); color: #3296ff; padding: 2px 8px; border-radius: 10px; display: flex; align-items: center; gap: 4px; }
        
        .compact-input {
          padding: 0.6rem 0.8rem !important;
          font-size: 0.9rem !important;
        }

        .var-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--accent-color);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-family: monospace;
          cursor: pointer;
          transition: all 0.2s;
        }
        .var-btn:hover {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }

        .delete-icon-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .delete-icon-btn:hover {
          background: #ef4444;
          color: white;
        }

        .add-pair-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          color: var(--text-secondary);
          padding: 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .add-pair-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--accent-color);
          color: white;
        }

        .color-trigger {
          width: 48px; height: 48px; border-radius: 12px; 
          cursor: pointer; transition: all 0.2s;
          border: 2px solid rgba(255,255,255,0.1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .color-trigger:hover { transform: scale(1.05); border-color: rgba(255,255,255,0.3); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
        .color-trigger:active { transform: scale(0.95); }

        .checkbox-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 1.2rem; border-radius: 16px; }
        .checkbox-wrapper { display: flex; gap: 1rem; align-items: flex-start; }
        .checkbox-wrapper input { width: 20px; height: 20px; accent-color: var(--accent-color); margin-top: 3px; cursor: pointer; }
        .checkbox-text { display: flex; flex-direction: column; }
        .checkbox-text label { font-weight: 600; cursor: pointer; }
        .checkbox-text span { font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; }

        .modal-footer { display: flex; gap: 1rem; margin-top: 1rem; }
        .btn-ghost { flex: 1; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); padding: 0.8rem; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { background: rgba(255,255,255,0.05); color: white; border-color: rgba(255,255,255,0.2); }
        
        .btn-primary { 
          flex: 2; background: var(--accent-color); border: none; color: white; padding: 0.8rem; border-radius: 12px; 
          font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 20px rgba(123, 44, 191, 0.2);
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 10px 30px rgba(123, 44, 191, 0.3); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .premium-field-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 5;
        }

        .premium-field-overlay-small {
          position: absolute;
          top: 24px; left: 0; right: 0; bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 5;
        }

        .lock-tag {
          background: rgba(255, 183, 3, 0.9);
          color: black;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          pointer-events: auto;
        }
        
        /* Switch Toggle Styles */
        .switch {
          position: relative;
          display: inline-block;
          width: 46px;
          height: 24px;
          flex-shrink: 0;
        }

        .switch input { 
          opacity: 0; width: 0; height: 0;
        }

        .slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); transition: .3s;
        }

        .slider:before {
          position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 3px;
          background-color: white; transition: .3s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        input:checked + .slider { background-color: var(--accent-color); border-color: var(--accent-color); }
        input:focus + .slider { box-shadow: 0 0 1px var(--accent-color); }
        input:checked + .slider:before { transform: translateX(20px); }
        .slider.round { border-radius: 24px; }
        .slider.round:before { border-radius: 50%; }
      `}</style>
    </div>
  );
}
