"use client";

import { useState, useEffect } from 'react';
import { Trash2, Copy, Check, Zap, X, ShieldAlert, RefreshCcw, Activity, Terminal } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import LogStreamer from '@/components/LogStreamer';

export default function DevSettings() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState('30');
  const [customDays, setCustomDays] = useState('30');
  const [maxUses, setMaxUses] = useState('1');
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(null);
  const [tier, setTier] = useState('3');

  // Status & Presence State
  const [statuses, setStatuses] = useState([]);
  const [rotationMode, setRotationMode] = useState('random');
  const [rotationInterval, setRotationInterval] = useState('60');
  const [newStatusType, setNewStatusType] = useState('watching');
  const [newStatusText, setNewStatusText] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [showPresence, setShowPresence] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '', type: 'info' });
  const [announceLoading, setAnnounceLoading] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [resetAllLoading, setResetAllLoading] = useState(false);
  const [resetAllStatus, setResetAllStatus] = useState(null);
  const [confirmNuclear, setConfirmNuclear] = useState(false);
  const [factoryLoading, setFactoryLoading] = useState(false);
  const [factoryStatus, setFactoryStatus] = useState(null);
  const [confirmFactory, setConfirmFactory] = useState(false);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState({ show: false, title: '', message: '', action: null, type: 'danger' });

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
  
  const TIER_OPTIONS = [
    { value: '1', label: 'Scout (Tier 1)' },
    { value: '2', label: 'Operator (Tier 2)' },
    { value: '3', label: 'Architect (Tier 3)' }
  ];

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/premium');
      const data = await res.json();
      if (Array.isArray(data)) setKeys(data);
    } catch (err) { console.error(err); }
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

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) return;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return;

      const data = await res.json();
      if (Array.isArray(data)) setAnnouncements(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchKeys();
    fetchStatuses();
    fetchBotSettings();
    fetchAnnouncements();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const daysToGenerate = duration === 'custom' ? parseInt(customDays) : parseInt(duration);
    try {
      const res = await fetch('/api/premium/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: daysToGenerate, uses: parseInt(maxUses), tier: parseInt(tier) })
      });
      if (res.ok) fetchKeys();
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  const handleDelete = async (code) => {
    try {
      const res = await fetch(`/api/premium?code=${code}`, { method: 'DELETE' });
      if (res.ok) setKeys(keys.filter(k => k.code !== code));
    } catch (err) { console.error(err); }
  };

  const handleRevoke = async (code) => {
    try {
      const res = await fetch(`/api/premium?code=${code}`, { method: 'PATCH' });
      if (res.ok) setKeys(keys.map(k => k.code === code ? { ...k, is_revoked: true } : k));
    } catch (err) { console.error(err); }
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

  const handleSendAnnouncement = async () => {
    if (!newAnnounce.title || !newAnnounce.content) return;
    setAnnounceLoading(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAnnounce)
      });
      if (res.ok) {
        setNewAnnounce({ title: '', content: '', type: 'info' });
        fetchAnnouncements();
      }
    } catch (err) { console.error(err); }
    setAnnounceLoading(false);
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      const res = await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchAnnouncements();
    } catch (err) { console.error(err); }
  };

  const handleResetAllHistory = async () => {
    if (!modalConfig.show && !confirmNuclear) {
      setModalConfig({
        show: true,
        title: 'Nuclear History Reset',
        message: 'This will clear publication history for ALL monitors. Every feed entry will be re-posted to Discord. Continue?',
        type: 'danger',
        action: () => setConfirmNuclear(true)
      });
      return;
    }

    setResetAllLoading(true);
    setResetAllStatus(null);
    try {
      const res = await fetch('/api/admin/reset-history', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'history' })
      });
      const data = await res.json();
      if (res.ok) {
        setResetAllStatus({ type: 'success', message: 'Nuclear Reset Complete! ALL monitor history cleared.' });
        setConfirmNuclear(false);
      } else {
        setResetAllStatus({ type: 'error', message: data.error || 'Reset failed' });
      }
    } catch (err) {
      setResetAllStatus({ type: 'error', message: 'Connection failed' });
    }
    setResetAllLoading(false);
  };

  const handleFactoryReset = async () => {
    if (!modalConfig.show && !confirmFactory) {
      setModalConfig({
        show: true,
        title: 'TOTAL FACTORY RESET',
        message: 'This is irreversible. All monitors, settings, and premium keys will be permanently deleted. Are you absolutely sure?',
        type: 'extreme',
        action: () => setConfirmFactory(true)
      });
      return;
    }

    setFactoryLoading(true);
    setFactoryStatus(null);
    try {
      const res = await fetch('/api/admin/reset-history', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'factory' })
      });
      const data = await res.json();
      if (res.ok) {
        setFactoryStatus({ type: 'success', message: 'FACTORY RESET COMPLETE. SYSTEM WIPED.' });
        setConfirmFactory(false);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setFactoryStatus({ type: 'error', message: data.error || 'Reset failed' });
      }
    } catch (err) {
      setFactoryStatus({ type: 'error', message: 'Connection failed' });
    }
    setFactoryLoading(false);
  };

  return (
    <div className="dev-page-wrapper" style={{ maxWidth: '1450px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem' }}>
      
      {/* Custom Confirmation Modal */}
      {modalConfig.show && (
        <div className="modal-overlay">
          <div className={`modal-content ${modalConfig.type}`}>
            <div className="modal-header">
              <ShieldAlert size={24} />
              <h3>{modalConfig.title}</h3>
            </div>
            <div className="modal-body">
              <p>{modalConfig.message}</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setModalConfig({ ...modalConfig, show: false })}>Cancel</button>
              <button className="modal-btn confirm" onClick={() => { modalConfig.action(); setModalConfig({ ...modalConfig, show: false }); }}>Confirm Intent</button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2>Developer Controls</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Master administrator tools for logs, announcements, and premium management.
          </p>
        </div>
      </header>

      <section style={{ marginBottom: '1rem' }}>
        <LogStreamer />
      </section>

      {/* Broadcast Notifications Section */}
      <div 
        onClick={() => setShowBroadcast(!showBroadcast)} 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          padding: '1.25rem 1.5rem',
          background: 'rgba(59, 130, 246, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: showBroadcast ? '24px 24px 0 0' : '24px',
          transition: 'all 0.3s ease',
          userSelect: 'none',
          marginBottom: showBroadcast ? '0' : '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={20} color="#60a5fa" />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Global Broadcasts</h3>
        </div>
        <span style={{ fontSize: '0.9rem', transform: showBroadcast ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: '#60a5fa' }}>▼</span>
      </div>

      <div style={{ 
        maxHeight: showBroadcast ? '1000px' : '0', 
        overflow: 'hidden', 
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: showBroadcast ? 1 : 0,
        background: 'rgba(15, 15, 25, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderTop: 'none',
        borderRadius: '0 0 24px 24px',
        padding: showBroadcast ? '2rem' : '0 2rem',
        marginBottom: showBroadcast ? '1rem' : '0'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Message Title</label>
              <input 
                type="text" 
                value={newAnnounce.title} 
                onChange={(e) => setNewAnnounce({ ...newAnnounce, title: e.target.value })}
                placeholder="e.g. Scheduled Maintenance"
                className="styled-input-basic"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Content Markdown</label>
              <textarea 
                value={newAnnounce.content} 
                onChange={(e) => setNewAnnounce({ ...newAnnounce, content: e.target.value })}
                placeholder="Details of the announcement..."
                className="styled-input-basic"
                style={{ minHeight: '120px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Alert Type</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['info', 'warning', 'danger'].map(type => (
                      <button 
                        key={type}
                        onClick={() => setNewAnnounce({ ...newAnnounce, type })}
                        className={`type-btn ${newAnnounce.type === type ? 'active' : ''} ${type}`}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
               </div>
               <button className="btn" style={{ padding: '0.8rem 2rem' }} onClick={handleSendAnnouncement} disabled={announceLoading}>
                 {announceLoading ? 'Sending...' : 'Broadcast to Owners'}
               </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Broadcasts</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {announcements.map(a => (
                <div key={a.id} className="announce-mini-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className={`mini-type ${a.type}`}>{a.type}</span>
                    <button onClick={() => handleDeleteAnnouncement(a.id)} className="icon-btn-small"><X size={12} /></button>
                  </div>
                  <p className="mini-title">{a.title}</p>
                </div>
              ))}
              {announcements.length === 0 && <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '2rem' }}>No active broadcasts.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Discord Presence Section */}
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
          borderRadius: showPresence ? '24px 24px 0 0' : '24px',
          transition: 'all 0.3s ease',
          userSelect: 'none',
          marginBottom: showPresence ? '0' : '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Discord Rich Presence</h3>
        </div>
        <span style={{ fontSize: '0.9rem', transform: showPresence ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: 'var(--accent-hover)' }}>▼</span>
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
        borderRadius: '0 0 24px 24px',
        padding: showPresence ? '2rem' : '0 2rem',
        marginBottom: showPresence ? '1rem' : '0'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Global Configuration</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rotation Mode</label>
              <CustomSelect options={ROTATION_OPTIONS} value={rotationMode} onChange={(val) => { setRotationMode(val); handleUpdateBotSetting('status_rotation_mode', val); }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rotation Interval</label>
              <div style={{ position: 'relative' }}>
                <input type="number" value={rotationInterval} onChange={(e) => setRotationInterval(e.target.value)} onBlur={(e) => handleUpdateBotSetting('presence_interval_seconds', e.target.value)} className="styled-input-basic" style={{ width: '100%', paddingRight: '3rem' }} min="10" />
                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>sec</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Add New Pattern</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Activity Type</label>
              <CustomSelect options={ACTIVITY_OPTIONS} value={newStatusType} onChange={(val) => setNewStatusType(val)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Text Pattern</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" value={newStatusText} onChange={(e) => setNewStatusText(e.target.value)} placeholder="e.g. {count} servers" className="styled-input-basic" style={{ flex: 1 }} />
                <button className="btn" onClick={handleAddStatus} disabled={statusLoading}>{statusLoading ? '...' : 'ADD'}</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {statuses.map(s => (
            <div key={s.id} className="status-mini-card">
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span className="mini-type-badge">{s.type}</span>
                <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.text}</span>
              </div>
              <button className="icon-btn-danger" onClick={() => handleDeleteStatus(s.id)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Premium Key Management Section */}
      <div 
        onClick={() => setShowPremium(!showPremium)} 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          padding: '1.25rem 1.5rem',
          background: 'rgba(168, 85, 247, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: showPremium ? '24px 24px 0 0' : '24px',
          transition: 'all 0.3s ease',
          userSelect: 'none',
          marginBottom: showPremium ? '0' : '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={20} color="#c084fc" />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Premium Key Management</h3>
        </div>
        <span style={{ fontSize: '0.9rem', transform: showPremium ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: '#c084fc' }}>▼</span>
      </div>

      <div style={{ 
        maxHeight: showPremium ? '3000px' : '0', 
        overflow: 'hidden', 
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: showPremium ? 1 : 0,
        background: 'rgba(15, 15, 25, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderTop: 'none',
        borderRadius: '0 0 24px 24px',
        padding: showPremium ? '2rem' : '0 2rem',
        marginBottom: showPremium ? '1rem' : '0'
      }}>
        <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Generate New Access Keys</h4>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duration</label>
            <CustomSelect options={DURATION_OPTIONS} value={duration} onChange={(val) => setDuration(val)} width="250px" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tier</label>
            <CustomSelect options={TIER_OPTIONS} value={tier} onChange={(val) => setTier(val)} width="200px" />
          </div>
          {duration === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Days</label>
              <input type="number" value={customDays} onChange={(e) => setCustomDays(e.target.value)} className="styled-input-basic" style={{ width: '100px' }} min="1" />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Uses</label>
            <input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="styled-input-basic" style={{ width: '100px' }} min="1" />
          </div>
          <button className="btn" onClick={handleGenerate} disabled={generating}>{generating ? 'Generating...' : 'Generate New Key'}</button>
        </div>

        <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Active & Unused Keys</h4>
        <div className="keys-grid">
          {loading ? <div style={{ textAlign: 'center', padding: '2rem', gridColumn: '1/-1' }}>Loading...</div> : keys.map(k => (
            <div key={k.code} className="key-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="key-code">{k.code}</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`tier-badge tier-${k.tier || 3}`}>Tier {k.tier || 3}</span>
                  <span>• {k.duration_days === 0 ? 'Lifetime' : `${k.duration_days}d`}</span>
                  <span>• {k.used_count}/{k.max_uses} uses</span>
                  {k.is_revoked && <span style={{ color: '#ef4444' }}>[REVOKED]</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="icon-btn" onClick={() => copyToClipboard(k.code)}>{copying === k.code ? <Check size={16} /> : <Copy size={16} />}</button>
                <button className="icon-btn" onClick={() => handleRevoke(k.code)} style={{ color: '#f59e0b' }} disabled={k.is_revoked}><ShieldAlert size={16} /></button>
                <button className="icon-btn" onClick={() => handleDelete(k.code)} style={{ color: '#ef4444' }}><X size={16} /></button>
              </div>
            </div>
          ))}
          {!loading && keys.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', gridColumn: '1/-1', color: 'var(--text-secondary)' }}>No keys found.</div>}
        </div>
      </div>

      {/* System Maintenance Section */}
      <div 
        onClick={() => setShowMaintenance(!showMaintenance)} 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          padding: '1.25rem 1.5rem',
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: showMaintenance ? '24px 24px 0 0' : '24px',
          transition: 'all 0.3s ease',
          userSelect: 'none',
          marginBottom: showMaintenance ? '0' : '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert size={20} color="#ef4444" />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>System Maintenance</h3>
        </div>
        <span style={{ fontSize: '0.9rem', transform: showMaintenance ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: '#ef4444' }}>▼</span>
      </div>

      <div style={{ 
        maxHeight: showMaintenance ? '1000px' : '0', 
        overflow: 'hidden', 
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: showMaintenance ? 1 : 0,
        background: 'rgba(15, 15, 25, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderTop: 'none',
        borderRadius: '0 0 24px 24px',
        padding: showMaintenance ? '2rem' : '0 2rem',
        marginBottom: showMaintenance ? '1rem' : '0'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px dashed rgba(239, 68, 68, 0.2)' }}>
            <h4 style={{ color: '#ef4444', fontSize: '1rem', marginBottom: '0.5rem' }}>Nuclear Options</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Warning: This will clear the publication history for <strong>ALL</strong> monitors across <strong>ALL</strong> servers. 
              The bot will re-process every feed and potentially send thousands of messages if not handled carefully.
            </p>
            
            <button 
              className={`btn danger ${confirmNuclear ? 'confirm-active' : ''}`} 
              style={{ 
                padding: '1rem 2rem', 
                background: confirmNuclear ? '#b91c1c' : '#ef4444',
                borderColor: '#b91c1c',
                width: '100%',
                fontWeight: 800,
                letterSpacing: '1px',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }} 
              onClick={handleResetAllHistory}
              disabled={resetAllLoading}
            >
              {resetAllLoading ? 'Processing Nuclear Reset...' : (confirmNuclear ? 'CONFIRM NUCLEAR RESET (CLICK AGAIN)' : 'RESET ENTIRE SYSTEM HISTORY')}
            </button>

            {resetAllStatus && (
              <div style={{ marginTop: '1rem', color: resetAllStatus.type === 'success' ? '#10b981' : '#ef4444', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                {resetAllStatus.message}
              </div>
            )}
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <h4 style={{ color: '#ef4444', fontSize: '1rem', marginBottom: '0.5rem' }}>Extreme Danger: Factory Reset</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              This is the ultimate wipe. It will delete <strong>ALL MONITORS</strong>, <strong>ALL SETTINGS</strong>, <strong>ALL PREMIUM KEYS</strong>, and all history. 
              The system will be completely empty.
            </p>
            
            <button 
              className={`btn danger ${confirmFactory ? 'confirm-active' : ''}`} 
              style={{ 
                padding: '1rem 2rem', 
                background: confirmFactory ? '#ef4444' : 'transparent',
                border: '2px solid #ef4444',
                color: confirmFactory ? 'white' : '#ef4444',
                width: '100%',
                fontWeight: 800,
                letterSpacing: '2px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }} 
              onClick={handleFactoryReset}
              disabled={factoryLoading}
            >
              {factoryLoading ? 'WIPING SYSTEM...' : (confirmFactory ? 'CONFIRM FULL FACTORY RESET (FINAL WARNING)' : 'FULL FACTORY RESET')}
            </button>

            {factoryStatus && (
              <div style={{ marginTop: '1rem', color: factoryStatus.type === 'success' ? '#10b981' : '#ef4444', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                {factoryStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .styled-input-basic { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem 1rem; border-radius: 12px; outline: none; }
        .styled-input-basic:focus { border-color: var(--accent-color); }
        .keys-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1rem; }
        .key-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1.25rem; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; }
        .key-code { font-family: monospace; font-weight: 700; color: var(--accent-hover); letter-spacing: 1px; }
        .tier-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; }
        .tier-1 { background: rgba(34, 197, 94, 0.1); color: #4ade80; }
        .tier-2 { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        .tier-3 { background: rgba(168, 85, 247, 0.1); color: #c084fc; }
        .type-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.4); font-size: 0.75rem; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .type-btn.active.info { background: rgba(59,130,246,0.2); color: #60a5fa; border-color: #3b82f6; }
        .type-btn.active.warning { background: rgba(245,158,11,0.2); color: #fbbf24; border-color: #f59e0b; }
        .type-btn.active.danger { background: rgba(239,68,68,0.2); color: #f87171; border-color: #ef4444; }
        .announce-mini-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 14px; }
        .status-mini-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
        .mini-type-badge { font-size: 0.6rem; font-weight: 900; color: var(--accent-hover); text-transform: uppercase; margin-bottom: 2px; }
        .icon-btn-danger { background: transparent; border: none; color: rgba(255,255,255,0.2); cursor: pointer; transition: 0.2s; }
        .icon-btn-danger:hover { color: #ef4444; }
        .icon-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .icon-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-1px); }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease;
        }

        .modal-content {
          background: rgba(20, 20, 30, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 2rem;
          width: 90%;
          max-width: 450px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-content.extreme {
          border-color: #ef4444;
          background: linear-gradient(145deg, rgba(30, 10, 10, 0.95), rgba(20, 20, 30, 0.95));
          box-shadow: 0 0 40px rgba(239, 68, 68, 0.2);
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1rem;
          color: #ef4444;
        }

        .modal-header h3 { margin: 0; font-size: 1.25rem; }

        .modal-body p {
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          margin-top: 2rem;
        }

        .modal-btn {
          flex: 1;
          padding: 0.8rem;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .modal-btn.cancel {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .modal-btn.confirm {
          background: #ef4444;
          color: white;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }

        .modal-btn:hover { transform: translateY(-2px); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
