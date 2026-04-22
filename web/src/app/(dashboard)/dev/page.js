"use client";

import { useState, useEffect } from 'react';
import CustomSelect from '@/components/CustomSelect';

export default function DevSettings() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState('30');
  const [customDays, setCustomDays] = useState('30');
  const [maxUses, setMaxUses] = useState('1');
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(null);

  // Status & Presence State
  const [statuses, setStatuses] = useState([]);
  const [rotationMode, setRotationMode] = useState('random');
  const [rotationInterval, setRotationInterval] = useState('60');
  const [newStatusType, setNewStatusType] = useState('watching');
  const [newStatusText, setNewStatusText] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [showPresence, setShowPresence] = useState(false);

  // Options Definitions
  const ROTATION_OPTIONS = [
    { value: 'random', label: 'Random Rotation' },
    { value: 'sequential', label: 'Sequential Rotation' }
  ];

  const ACTIVITY_OPTIONS = [
    { value: 'playing', label: 'Playing' },
    { value: 'watching', label: 'Watching' },
    { value: 'listening', label: 'Listening to' },
    { value: 'streaming', label: 'Streaming' },
    { value: 'competing', label: 'Competing in' }
  ];

  const DURATION_OPTIONS = [
    { value: '30', label: '1 Month (30 Days)' },
    { value: '90', label: '3 Months (90 Days)' },
    { value: '180', label: '6 Months (180 Days)' },
    { value: '365', label: '1 Year (365 Days)' },
    { value: '0', label: 'Lifetime (Infinity)' },
    { value: 'custom', label: 'Custom Days...' }
  ];

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/premium');
      const data = await res.json();
      if (Array.isArray(data)) {
        setKeys(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/bot/status');
      const data = await res.json();
      if (Array.isArray(data)) setStatuses(data);
    } catch (err) { console.error(err); }
  };

  const fetchBotSettings = async () => {
    try {
      const res = await fetch('/api/bot/settings');
      const data = await res.json();
      if (data.status_rotation_mode) setRotationMode(data.status_rotation_mode);
      if (data.presence_interval_seconds) setRotationInterval(data.presence_interval_seconds);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchKeys();
    fetchStatuses();
    fetchBotSettings();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const daysToGenerate = duration === 'custom' ? parseInt(customDays) : parseInt(duration);
    
    try {
      const res = await fetch('/api/premium/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          days: daysToGenerate,
          uses: parseInt(maxUses)
        })
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const handleDelete = async (code) => {
    try {
      const res = await fetch(`/api/premium?code=${code}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys(keys.filter(k => k.code !== code));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevoke = async (code) => {
    try {
      const res = await fetch(`/api/premium?code=${code}`, { method: 'PATCH' });
      if (res.ok) {
        setKeys(keys.map(k => k.code === code ? { ...k, is_revoked: true } : k));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopying(text);
    setTimeout(() => setCopying(null), 2000);
  };

  const handleAddStatus = async () => {
    if (!newStatusText.trim()) return;
    setStatusLoading(true);
    try {
      const res = await fetch('/api/bot/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newStatusType, text: newStatusText })
      });
      if (res.ok) {
        setNewStatusText('');
        fetchStatuses();
      }
    } catch (err) { console.error(err); }
    setStatusLoading(false);
  };

  const handleDeleteStatus = async (id) => {
    try {
      const res = await fetch(`/api/bot/status?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchStatuses();
    } catch (err) { console.error(err); }
  };

  const handleUpdateBotSetting = async (key, value) => {
    try {
      await fetch('/api/bot/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2>Dev Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Master Administrator Controls
          </p>
        </div>
      </header>

      <div 
        onClick={() => setShowPresence(!showPresence)} 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          padding: '1.25rem 1.5rem',
          background: 'rgba(123, 44, 191, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(123, 44, 191, 0.3)',
          borderRadius: showPresence ? '16px 16px 0 0' : '16px',
          transition: 'all 0.3s ease',
          marginBottom: showPresence ? '0' : '2rem',
          userSelect: 'none',
          boxShadow: showPresence ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.1)'
        }}
        className="glass-presence-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', letterSpacing: '0.5px' }}>Discord Rich Presence</h3>
        </div>
        <span style={{ 
          fontSize: '0.9rem', 
          transition: 'transform 0.3s', 
          transform: showPresence ? 'rotate(180deg)' : 'rotate(0deg)',
          color: 'var(--accent-hover)'
        }}>
          {showPresence ? 'HIDE CONFIG' : 'OPEN CONFIG'} ▼
        </span>
      </div>
      
      <div style={{ 
        maxHeight: showPresence ? '3000px' : '0', 
        overflow: 'hidden', 
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: showPresence ? 1 : 0,
        background: 'rgba(15, 15, 25, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(123, 44, 191, 0.2)',
        borderTop: 'none',
        borderRadius: '0 0 16px 16px',
        marginBottom: '3rem',
        padding: showPresence ? '2rem' : '0 2rem'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Global Configuration</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rotation Mode</label>
              <CustomSelect 
                options={ROTATION_OPTIONS}
                value={rotationMode}
                onChange={(val) => {
                  setRotationMode(val);
                  handleUpdateBotSetting('status_rotation_mode', val);
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rotation Interval</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  value={rotationInterval} 
                  onChange={(e) => setRotationInterval(e.target.value)}
                  onBlur={(e) => handleUpdateBotSetting('presence_interval_seconds', e.target.value)}
                  className="styled-input-basic"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', paddingRight: '3rem' }}
                  min="10"
                />
                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>sec</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Add New Pattern</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Activity Type</label>
              <CustomSelect 
                options={ACTIVITY_OPTIONS}
                value={newStatusType}
                onChange={(val) => setNewStatusType(val)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Text Pattern</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={newStatusText} 
                  onChange={(e) => setNewStatusText(e.target.value)}
                  placeholder="e.g. {count} servers"
                  className="styled-input-basic"
                  style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }}
                />
                <button className="btn" onClick={handleAddStatus} disabled={statusLoading}>
                  {statusLoading ? '...' : 'ADD'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {statuses.map(s => (
            <div key={s.id} className="key-card" style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--accent-hover)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {s.type}
                </span>
                <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.text}</span>
              </div>
              <button 
                className="icon-btn" 
                onClick={() => handleDeleteStatus(s.id)}
                style={{ color: '#ef4444', height: '30px', width: '30px' }}
              >
                🗑️
              </button>
            </div>
          ))}
          {statuses.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center', gridColumn: '1/-1' }}>No custom statuses defined.</p>}
        </div>
      </div>

      <section className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.05), rgba(0,0,0,0))' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Premium Key Generator</h3>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duration</label>
            <CustomSelect 
              options={DURATION_OPTIONS}
              value={duration}
              onChange={(val) => setDuration(val)}
              width="250px"
            />
          </div>

          {duration === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Days</label>
              <input 
                type="number" 
                value={customDays} 
                onChange={(e) => setCustomDays(e.target.value)}
                className="styled-input-basic"
                style={{ width: '100px' }}
                min="1"
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Uses</label>
            <input 
              type="number" 
              value={maxUses} 
              onChange={(e) => setMaxUses(e.target.value)}
              className="styled-input-basic"
              style={{ width: '100px' }}
              min="1"
            />
          </div>

          <button 
            className="btn" 
            onClick={handleGenerate} 
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate New Key'}
          </button>
        </div>
      </section>

      <h3 style={{ marginBottom: '1.5rem', marginTop: '3rem' }}>Active & Unused Keys</h3>
      
      <div className="keys-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading keys...</div>
        ) : (
          <div className="keys-grid">
            {keys.map(k => (
              <div key={k.code} className="key-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="key-code">{k.code}</span>
                  <span className="key-meta">
                    {k.duration_days === 0 ? 'Lifetime' : `${k.duration_days} Days`} • Uses: {k.used_count}/{k.max_uses}
                    {k.is_revoked && <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '8px' }}>[REVOKED]</span>}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="icon-btn" 
                    onClick={() => copyToClipboard(k.code)}
                    title="Copy to clipboard"
                  >
                    {copying === k.code ? '✅' : '📋'}
                  </button>
                  <button 
                    className="icon-btn" 
                    onClick={() => handleRevoke(k.code)}
                    style={{ color: '#f59e0b' }}
                    title="Revoke Key"
                    disabled={k.is_revoked}
                  >
                    {k.is_revoked ? '🚫' : '⚠️'}
                  </button>
                  <button 
                    className="icon-btn" 
                    onClick={() => handleDelete(k.code)}
                    style={{ color: '#ef4444' }}
                    title="Delete Key"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            
            {keys.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', gridColumn: '1/-1' }}>
                No premium keys generated yet.
              </div>
            )}
          </div>
        )}
      </div>


      <style jsx>{`
        .styled-input-basic {
          background: rgba(15, 15, 25, 0.8);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          outline: none;
          transition: border-color 0.2s;
        }
        .styled-input-basic:focus {
          border-color: var(--accent-color);
        }
        .keys-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1rem;
        }
        .key-card {
          background: var(--bg-panel);
          border: 1px solid var(--border-color);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: border-color 0.2s;
        }
        .key-card:hover {
          border-color: var(--accent-color);
        }
        .glass-presence-header:hover {
          background: rgba(123, 44, 191, 0.2) !important;
          border-color: rgba(123, 44, 191, 0.5) !important;
        }
        .key-code {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--accent-hover);
          letter-spacing: 1px;
        }
        .key-meta {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .icon-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-color);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .icon-btn:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }
        .icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          filter: grayscale(1);
          transform: none;
        }
      `}</style>
    </>
  );
}
