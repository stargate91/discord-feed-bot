"use client";

import { useState, useEffect, useRef } from 'react';
import MultiSelect from './MultiSelect';
import { X, Plus, Trash2, Info } from 'lucide-react';

// --- STATIC OPTIONS ---
const MOVIE_GENRES = [
  { id: 'Action', name: 'Action' },
  { id: 'Adventure', name: 'Adventure' },
  { id: 'Animation', name: 'Animation' },
  { id: 'Comedy', name: 'Comedy' },
  { id: 'Crime', name: 'Crime' },
  { id: 'Documentary', name: 'Documentary' },
  { id: 'Drama', name: 'Drama' },
  { id: 'Family', name: 'Family' },
  { id: 'Fantasy', name: 'Fantasy' },
  { id: 'History', name: 'History' },
  { id: 'Horror', name: 'Horror' },
  { id: 'Music', name: 'Music' },
  { id: 'Mystery', name: 'Mystery' },
  { id: 'Romance', name: 'Romance' },
  { id: 'Science Fiction', name: 'Science Fiction' },
  { id: 'Thriller', name: 'Thriller' },
  { id: 'War', name: 'War' },
  { id: 'Western', name: 'Western' }
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

export default function EditMonitorModal({ monitor, guildId, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    target_channels: [],
    target_roles: [],
    embed_color: '',
    steam_patch_only: false,
    target_genres: [],
    target_languages: []
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
        embed_color: monitor.embed_color || '',
        steam_patch_only: !!monitor.steam_patch_only,
        target_genres: monitor.target_genres || [],
        target_languages: monitor.target_languages || []
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
    };

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

    await onSave(monitor.id, updateData);
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3>Edit Monitor</h3>
            <p className="subtitle">{monitor.name} ({monitor.type})</p>
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

          {monitor.type !== 'youtube' && (
            <div className="form-group">
              <label>Embed Accent Color</label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input 
                  type="color" 
                  ref={colorInputRef}
                  value={formData.embed_color || '#3d3f45'}
                  onChange={(e) => handleMultiChange('embed_color', e.target.value)}
                  style={{ display: 'none' }}
                />
                <div 
                  className="color-trigger"
                  onClick={() => colorInputRef.current.click()}
                  style={{ background: formData.embed_color || '#3d3f45' }}
                  title="Open color picker"
                ></div>
                <input 
                  type="text" 
                  name="embed_color" 
                  value={formData.embed_color} 
                  onChange={handleChange} 
                  placeholder="#3d3f45"
                  className="styled-input-main"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}

          {monitor.type === 'steam_news' && (
            <div className="checkbox-card">
              <div className="checkbox-wrapper">
                <input 
                  type="checkbox" 
                  id="steam_patch_only"
                  name="steam_patch_only" 
                  checked={formData.steam_patch_only} 
                  onChange={handleChange} 
                />
                <div className="checkbox-text">
                  <label htmlFor="steam_patch_only">Partial Updates Only</label>
                  <span>Only notify on Patch Notes and Game Updates (skips general blog posts)</span>
                </div>
              </div>
            </div>
          )}

          {(monitor.type === 'movie' || monitor.type === 'tv_series') && (
            <div className="grid-responsive">
               <div className="form-group">
                <label>Target Genres</label>
                <MultiSelect 
                  options={MOVIE_GENRES}
                  value={formData.target_genres}
                  onChange={(val) => handleMultiChange('target_genres', val)}
                  placeholder="Select genres"
                />
              </div>
              <div className="form-group">
                <label>Languages</label>
                <MultiSelect 
                  options={LANGUAGES}
                  value={formData.target_languages}
                  onChange={(val) => handleMultiChange('target_languages', val)}
                  placeholder="Select languages"
                />
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
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 1.5rem;
        }
        .modal-content {
          width: 100%; max-width: 700px;
          background: rgba(15, 15, 25, 0.9); border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 60px rgba(0,0,0,0.6); padding: 2.5rem; border-radius: 24px;
          animation: modalAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalAppear { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; marginBottom: 2rem; }
        .modal-header h3 { margin: 0; font-size: 1.5rem; }
        .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
        
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
      `}</style>
    </div>
  );
}
