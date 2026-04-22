"use client";

import { useState, useEffect, useRef } from 'react';
import MultiSelect from './MultiSelect';
import { X } from 'lucide-react';
import { ChevronRight, ChevronLeft, Info } from 'lucide-react';

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', logo: '/emojis/youtube.png', color: '#FF0000', description: 'Monitor a channel for new videos.', inputLabel: 'Channel Info', inputKey: 'channel_id', placeholder: 'UC... or @handle', hint: 'The alphanumeric ID or the @handle of the channel.' },
  { id: 'rss', name: 'RSS Feed', logo: '/emojis/rss.png', color: '#EE802F', description: 'Generic RSS/Atom feed monitoring.', inputLabel: 'Feed URL', inputKey: 'rss_url', placeholder: 'https://example.com/feed', hint: 'Provide the full URL to the RSS or Atom feed.' },
  { id: 'steam_news', name: 'Steam News', logo: '/emojis/steam.png', color: '#171a21', description: 'Game updates and news from Steam.', inputLabel: 'App ID', inputKey: 'app_id', placeholder: '730', hint: 'The application ID from the Steam store URL.' },
  { id: 'stream', name: 'Twitch', logo: '/emojis/twitch.png', color: '#9146FF', description: 'Go live alerts for Twitch streamers.', inputLabel: 'Username', inputKey: 'username', placeholder: 'twitch_user', hint: 'The exact Twitch username of the creator.' },
  { id: 'github', name: 'GitHub', logo: '/emojis/github.png', color: '#ffffff', description: 'New releases or commits from a repo.', inputLabel: 'Repository', inputKey: 'repo', placeholder: 'owner/repo', hint: 'Format: "username/repository-name".' },
  { id: 'crypto', name: 'Crypto', logo: '/emojis/crypto.png', color: '#F7931A', description: 'Price alerts and coin news.', inputLabel: 'Symbols', inputKey: 'symbols', placeholder: 'BTC, ETH', hint: 'Comma separated list of coin symbols.' },
  { id: 'epic_games', name: 'Epic Free', logo: '/emojis/epic-games.png', color: '#ffffff', description: 'Weekly free games from Epic Store.', isGlobal: true },
  { id: 'steam_free', name: 'Steam Free', logo: '/emojis/steam.png', color: '#66c0f4', description: 'New free games discovered on Steam.', isGlobal: true },
  { id: 'gog_free', name: 'GOG Free', logo: '/emojis/gog.png', color: '#b237c1', description: 'Limited time free offers on GOG.com.', isGlobal: true },
  { id: 'movie', name: 'Movies', logo: '/emojis/tmdb.png', color: '#00d1b2', description: 'Trending and new popular movies.', isGlobal: true },
  { id: 'tv_series', name: 'TV Series', logo: '/emojis/tmdb.png', color: '#3273dc', description: 'Daily trending and new TV shows.', isGlobal: true }
];

export default function CreateMonitorModal({ guildId, isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    target_channels: [],
    target_roles: [],
    embed_color: '#7b2cbf',
    platform_input: '',
  });

  const [guildChannels, setGuildChannels] = useState([]);
  const [guildRoles, setGuildRoles] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [creating, setCreating] = useState(false);
  const colorInputRef = useRef(null);

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
      setFormData({ name: '', target_channels: [], target_roles: [], embed_color: '#7b2cbf', platform_input: '' });
    }
  }, [isOpen, guildId]);

  if (!isOpen) return null;

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setFormData(prev => ({ 
      ...prev, 
      name: platform.name,
      embed_color: platform.color !== '#ffffff' && platform.color !== '#171a21' ? platform.color : '#7b2cbf'
    }));
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    const payload = {
      type: selectedPlatform.id,
      name: formData.name,
      guildId: guildId,
      target_channels: formData.target_channels,
      target_roles: formData.target_roles,
      embed_color: formData.embed_color,
    };

    if (!selectedPlatform.isGlobal && selectedPlatform.inputKey) {
      payload[selectedPlatform.inputKey] = formData.platform_input;
    }

    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
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
              <div key={p.id} className="platform-card" onClick={() => handlePlatformSelect(p)}>
                <div className="p-icon">
                  <img src={p.logo} alt={p.name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                </div>
                <div className="p-info">
                  <span className="p-name">{p.name}</span>
                  <span className="p-desc">{p.description}</span>
                </div>
                <ChevronRight size={18} className="p-arrow" />
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

               {!selectedPlatform.isGlobal && (
                 <div className="form-group highlighted-group">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <label>{selectedPlatform.inputLabel}</label>
                     <div className="hint-pill"><Info size={12} /> {selectedPlatform.hint}</div>
                   </div>
                   <input 
                     type="text" 
                     value={formData.platform_input} 
                     onChange={(e) => setFormData({...formData, platform_input: e.target.value})}
                     required 
                     className="styled-input-main accent-border"
                     placeholder={selectedPlatform.placeholder}
                   />
                 </div>
               )}
            </div>

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
                      className="styled-input-main"
                      style={{ flex: 1 }}
                    />
                  </div>
               </div>
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
          width: 100%; max-width: 650px;
          background: rgba(15, 15, 25, 0.95); border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 40px 100px rgba(0,0,0,0.8); padding: 2.5rem; border-radius: 28px;
          animation: modalAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalAppear { from { opacity: 0; transform: scale(0.9) translateY(40px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
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
          background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15);
          transform: translateX(8px);
        }
        .p-icon { width: 44px; height: 44px; background: rgba(0,0,0,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .p-info { flex: 1; display: flex; flex-direction: column; }
        .p-name { font-weight: 700; font-size: 1.05rem; }
        .p-desc { font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px; }
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
      `}</style>
    </div>
  );
}
