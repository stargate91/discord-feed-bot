"use client";

import { useState, useEffect, useRef } from 'react';
import MultiSelect from './MultiSelect';
import { X, ChevronRight, ChevronLeft, Info, Plus, Trash2 } from 'lucide-react';
import { useToast } from "@/context/ToastContext";

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', logo: '/emojis/youtube.png', color: '#FF0000', description: 'Monitor a channel for new videos.', inputLabel: 'Channel Info', inputKey: 'channel_id', placeholder: '@handle, Link or Name', hint: 'Enter a channel handle (@name), full URL, name or UCID.' },

  { id: 'rss', name: 'RSS Feed', logo: '/emojis/rss.png', color: '#ee802f', description: 'Generic RSS/Atom feed monitoring.', inputLabel: 'Feed URL', inputKey: 'rss_url', placeholder: 'https://example.com/feed', hint: 'Provide the full URL to the RSS or Atom feed.' },
  { id: 'steam_news', name: 'Steam News', logo: '/emojis/steam.png', color: '#66c0f4', description: 'Game updates and news from Steam.', inputLabel: 'App ID', inputKey: 'app_id', placeholder: '730', hint: 'The application ID from the Steam store URL.' },
  { id: 'twitch', name: 'Twitch', logo: '/emojis/twitch.png', color: '#9146FF', description: 'Go live alerts for Twitch streamers.', inputLabel: 'Username', inputKey: 'username', placeholder: 'twitch_user', hint: 'The exact Twitch username of the creator.' },
  { id: 'kick', name: 'Kick', logo: '/emojis/kick.png', color: '#53fc18', description: 'Go live alerts for Kick streamers.', inputLabel: 'Username', inputKey: 'username', placeholder: 'kick_user', hint: 'The exact Kick username of the creator.' },
  { id: 'github', name: 'GitHub', logo: '/emojis/github.png', color: '#ffffff', description: 'New releases or commits from a repo.', inputLabel: 'Repository', inputKey: 'repo', placeholder: 'owner/repo', hint: 'Format: "username/repository-name".' },
  { id: 'crypto', name: 'Crypto', logo: '/emojis/crypto.png', color: '#F7931A', description: 'Price alerts and coin news.', isCrypto: true },
  { id: 'epic_games', name: 'Epic Free', logo: '/emojis/epic-games.png', color: '#ffffff', description: 'Weekly free games from Epic Store.', isGlobal: true },
  { id: 'steam_free', name: 'Steam Free', logo: '/emojis/steam.png', color: '#66c0f4', description: 'New free games discovered on Steam.', isGlobal: true },
  { id: 'gog_free', name: 'GOG Free', logo: '/emojis/gog.png', color: '#b237c1', description: 'Limited time free offers on GOG.com.', isGlobal: true },
  { id: 'movie', name: 'Movies', logo: '/emojis/tmdb.png', color: '#00d1b2', description: 'Trending and new popular movies.', isGlobal: true },
  { id: 'tv_series', name: 'TV Series', logo: '/emojis/tmdb.png', color: '#3273dc', description: 'Daily trending and new TV shows.', isGlobal: true }
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

export default function CreateMonitorModal({ guildId, isOpen, onClose, onSuccess, tier = 0, isPremium = false }) {
  const isMaster = isPremium && tier === 0;
  
  const isLocked = (requiredTier) => {
    if (isMaster) return false;
    return tier < requiredTier;
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
  });

  const [cryptoPairs, setCryptoPairs] = useState([{ symbol: '', threshold: '' }]);
  const [guildChannels, setGuildChannels] = useState([]);
  const [guildRoles, setGuildRoles] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedChannel, setResolvedChannel] = useState(null);
  const colorInputRef = useRef(null);

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
      setFormData({ name: '', target_channels: [], target_roles: [], embed_color: '#3d3f45', platform_input: '', custom_alert: '', include_upcoming: false, target_genres: [], target_languages: [] });
      setCryptoPairs([{ symbol: '', threshold: '' }]);
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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3>Add New Monitor</h3>
            <p className="subtitle">Choose a platform to start</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {step === 1 ? (
          <div className="platform-grid">
             {PLATFORMS.map(p => (
              <div 
                key={p.id} 
                className="platform-card" 
                onClick={() => handlePlatformSelect(p)}
                style={{"--platform-color": p.color}}
              >
                <div className="p-icon">
                  <img src={p.logo} alt={p.name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <div className="p-icon-glow"></div>
                </div>
                <div className="p-info">
                  <span className="p-name">{p.name}</span>
                  <span className="p-desc">{p.description}</span>
                </div>
                <div className="p-arrow-wrapper">
                  <ChevronRight size={18} className="p-arrow" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-section">
               <h4 className="section-title">Essential Config</h4>
               <div className="form-group">
                 <label>Monitor Name</label>
                 <input 
                   type="text" 
                   value={formData.name} 
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                   required 
                   className="styled-input-main"
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
               ) : !selectedPlatform.isGlobal && (
                 <div className="form-group highlighted-group">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <label>{selectedPlatform.inputLabel}</label>
                     <div className="hint-pill"><Info size={12} /> {selectedPlatform.hint}</div>
                   </div>
                   <div style={{ display: 'flex', gap: '10px' }}>
                     <input 
                       type="text" 
                       value={formData.platform_input} 
                       onChange={(e) => setFormData({...formData, platform_input: e.target.value})}
                       required 
                       className="styled-input-main accent-border"
                       style={{ flex: 1 }}
                       placeholder={selectedPlatform.placeholder}
                     />
                     {selectedPlatform.id === 'youtube' && (
                       <button 
                         type="button" 
                         onClick={handleYouTubeResolve}
                         className="resolve-btn"
                         disabled={resolving || !formData.platform_input}
                       >
                         {resolving ? '...' : 'Find'}
                       </button>
                     )}
                   </div>
                   {selectedPlatform.id === 'youtube' && resolvedChannel && (
                     <div className="channel-preview">
                       <img src={resolvedChannel.thumbnail} alt="" />
                       <div className="channel-info">
                         <span className="channel-name">{resolvedChannel.title}</span>
                         <span className="channel-id">{resolvedChannel.id}</span>
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
                       onChange={(e) => setFormData({...formData, include_upcoming: e.target.checked})} 
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
              <div className="form-section">
                <h4 className="section-title">Advanced Filters</h4>
                <div className="grid-responsive" style={{ position: 'relative' }}>
                  <div className="form-group" style={{ opacity: isLocked(1) ? 0.5 : 1 }}>
                    <label>Target Genres</label>
                    <MultiSelect 
                      options={MOVIE_GENRES}
                      value={formData.target_genres}
                      onChange={(val) => setFormData({...formData, target_genres: val})}
                      placeholder={isLocked(1) ? "Unlock Starter Tier" : "Select genres"}
                      disabled={isLocked(1)}
                    />
                  </div>
                  <div className="form-group" style={{ opacity: isLocked(1) ? 0.5 : 1 }}>
                    <label>Languages</label>
                    <MultiSelect 
                      options={LANGUAGES}
                      value={formData.target_languages}
                      onChange={(val) => setFormData({...formData, target_languages: val})}
                      placeholder={isLocked(1) ? "Unlock Starter Tier" : "Select languages"}
                      disabled={isLocked(1)}
                    />
                  </div>
                  {isLocked(1) && (
                    <div className="premium-field-overlay">
                      <span className="lock-tag">Starter Tier+</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-section">
               <h4 className="section-title">Notification Settings</h4>
               <div className="grid-responsive">
                 <div className="form-group">
                   <label>Target Channels</label>
                   <MultiSelect 
                     options={guildChannels}
                     value={formData.target_channels}
                     onChange={(val) => setFormData({...formData, target_channels: val})}
                     placeholder={loadingContext ? "Loading..." : "Select channels"}
                   />
                 </div>
                 <div className="form-group">
                   <label>Ping Roles</label>
                   <MultiSelect 
                     options={guildRoles}
                     value={formData.target_roles}
                     onChange={(val) => setFormData({...formData, target_roles: val})}
                     placeholder={loadingContext ? "Loading..." : "Select roles"}
                   />
                 </div>
               </div>

               <div className="form-group highlighted-group" style={{ background: 'rgba(255, 255, 255, 0.02)', marginTop: '1rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                   <label>Custom Alert Message</label>
                   {isLocked(2) ? (
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
                     onChange={(e) => setFormData({...formData, custom_alert: e.target.value})}
                     className="styled-input-main"
                     placeholder={isLocked(2) ? "Unlock Professional Tier to customize messages" : `Leave empty to use default.\nExample: @everyone Here is a new post: {title}`}
                     rows={3}
                     style={{ 
                       resize: 'vertical', 
                       fontFamily: 'monospace', 
                       fontSize: '0.9rem',
                       width: '100%',
                       opacity: isLocked(2) ? 0.5 : 1
                     }}
                     disabled={isLocked(2)}
                   />
                   {isLocked(2) && (
                     <div className="premium-field-overlay">
                       <span className="lock-tag">Professional Tier+</span>
                     </div>
                   )}
                 </div>

                 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px', opacity: isLocked(2) ? 0.3 : 1 }}>
                   {getAvailableVars(selectedPlatform?.id).map(v => (
                     <button
                       key={v}
                       type="button"
                       className="var-btn"
                       onClick={() => !isLocked(2) && setFormData(prev => ({ ...prev, custom_alert: (prev.custom_alert || '') + `{${v}}` }))}
                       title={`Insert {${v}}`}
                       disabled={isLocked(2)}
                     >
                       {`{${v}}`}
                     </button>
                   ))}
                 </div>

               </div>

                <div className="form-group" style={{ 
                  marginTop: '1.5rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '1.25rem', 
                  borderRadius: '20px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Send initial alert</label>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '80%' }}>
                      Post an update immediately if the source is already live or has new items.
                    </p>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={formData.send_initial_alert} 
                      onChange={(e) => setFormData({...formData, send_initial_alert: e.target.checked})}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

               {selectedPlatform?.id !== 'youtube' && (
                 <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Embed Color</label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        ref={colorInputRef}
                        value={formData.embed_color}
                        onChange={(e) => setFormData({...formData, embed_color: e.target.value})}
                        style={{ display: 'none' }}
                      />
                      <div 
                        className="color-trigger"
                        onClick={() => colorInputRef.current.click()}
                        style={{ background: formData.embed_color }}
                      ></div>
                      <input 
                        type="text" 
                        value={formData.embed_color} 
                        onChange={(e) => setFormData({...formData, embed_color: e.target.value})}
                        placeholder="#3d3f45"
                        className="styled-input-main"
                        style={{ flex: 1 }}
                      />
                    </div>
                 </div>
               )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}><ChevronLeft size={18} /> Back</button>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create Monitor'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
          display: flex; align-items: flex-start; justify-content: center;
          z-index: 1000; padding: 2rem; overflow-y: auto;
        }
        .modal-content {
          width: 100%; max-width: 700px;
          background: rgba(15, 15, 25, 0.95); border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 40px 100px rgba(0,0,0,0.8); padding: 2.5rem; border-radius: 28px;
          animation: modalAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalAppear { from { opacity: 0; transform: scale(0.9) translateY(40px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
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
          position: absolute; cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(255,255,255,0.1);
          transition: .4s; border-radius: 34px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .slider:before {
          position: absolute; content: "";
          height: 18px; width: 18px;
          left: 2px; bottom: 2px;
          background-color: white;
          transition: .4s; border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        input:checked + .slider {
          background-color: #3b82f6;
          border-color: #60a5fa;
        }

        input:checked + .slider:before {
          transform: translateX(22px);
        }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .modal-header h3 { margin: 0; font-size: 1.6rem; letter-spacing: -0.5px; }
        .subtitle { margin: 6px 0 0; color: var(--accent-hover); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }
        
        .close-btn { background: rgba(255,255,255,0.05); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .close-btn:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        .platform-grid { display: flex; flex-direction: column; gap: 10px; }
        .platform-card {
          display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem;
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 18px; cursor: pointer; transition: all 0.25s;
        }
        .platform-card:hover {
          background: rgba(255, 255, 255, 0.05); border-color: var(--platform-color, rgba(255, 255, 255, 0.15));
          transform: translateX(8px);
          box-shadow: -5px 0 20px -5px var(--platform-color, transparent);
        }
        .p-icon { 
          width: 44px; height: 44px; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px; display: flex; align-items: center; justify-content: center; 
          transition: all 0.3s ease;
          position: relative;
        }
        .p-icon-glow {
          position: absolute; width: 100%; height: 100%;
          background: var(--platform-color); opacity: 0;
          filter: blur(15px); border-radius: 12px;
          transition: opacity 0.3s; z-index: -1;
        }
        .platform-card:hover .p-icon-glow { opacity: 0.3; }
        .platform-card:hover .p-icon {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--platform-color);
          transform: scale(1.05) rotate(-2deg);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .p-info { flex: 1; display: flex; flex-direction: column; }
        .p-name { font-weight: 700; font-size: 1.05rem; }
        .p-desc { font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px; }
        .p-arrow-wrapper {
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.03); border-radius: 10px;
          transition: all 0.3s;
        }
        .platform-card:hover .p-arrow-wrapper {
          background: var(--platform-color);
          transform: rotate(15deg);
        }
        .p-arrow { color: rgba(255,255,255,0.2); transition: color 0.2s; }
        .platform-card:hover .p-arrow { color: white; }

        .modal-form { display: flex; flex-direction: column; gap: 2.5rem; margin-top: 1rem; }
        .form-section { display: flex; flex-direction: column; gap: 1.25rem; }
        .section-title { font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 2px; margin: 0; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        
        .form-group { display: flex; flex-direction: column; gap: 10px; }
        .form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
        
        .highlighted-group { background: rgba(123, 44, 191, 0.04); padding: 1.25rem; border-radius: 16px; border: 1px solid rgba(123, 44, 191, 0.1); }
        .hint-pill { font-size: 0.7rem; font-weight: 600; background: rgba(50, 150, 255, 0.1); color: #3296ff; padding: 2px 8px; border-radius: 10px; display: flex; align-items: center; gap: 4px; }
        
        .styled-input-main {
          background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08);
          color: white; padding: 0.85rem 1.2rem; border-radius: 12px; outline: none; transition: all 0.25s;
        }
        .styled-input-main:focus { border-color: var(--accent-color); background: rgba(123, 44, 191, 0.05); }
        .accent-border { border-color: rgba(123, 44, 191, 0.3); }

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

        .grid-responsive { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
        
        .color-trigger { 
          width: 48px; height: 48px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.1); 
          cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .color-trigger:hover { transform: scale(1.05); border-color: rgba(255,255,255,0.3); }

        .modal-footer { display: flex; gap: 1rem; margin-top: 1rem; }
        .btn-ghost { 
          display: flex; align-items: center; gap: 8px; flex: 1; background: transparent; border: 1px solid rgba(255,255,255,0.1); 
          color: var(--text-secondary); padding: 0.85rem; border-radius: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; 
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.02); color: white; border-color: rgba(255,255,255,0.2); }
        
        .btn-primary { 
          flex: 2; background: var(--accent-color); border: none; color: white; padding: 0.85rem; border-radius: 14px; 
          font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 25px rgba(123, 44, 191, 0.3);
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 15px 35px rgba(123, 44, 191, 0.4); }
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

        .resolve-btn {
          background: var(--accent-color);
          color: white;
          border: none;
          padding: 0 1.5rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .resolve-btn:hover:not(:disabled) {
          filter: brightness(1.2);
          transform: translateY(-2px);
        }
        .resolve-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .channel-preview {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .channel-preview img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid var(--accent-color);
        }
        .channel-info {
          display: flex;
          flex-direction: column;
        }
        .channel-name {
          font-weight: 700;
          font-size: 0.9rem;
          color: white;
        }
        .channel-id {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-family: monospace;
        }
      `}</style>
    </div>
  );
}
