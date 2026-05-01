"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Trash2, Copy, Check, Zap, X, ShieldAlert, Activity } from 'lucide-react';
import LoginButton from '@/components/LoginButton';
import CustomSelect from '@/components/CustomSelect';
import LogStreamer from '@/components/LogStreamer';
import devService from '@/services/devService';
import { DEV_ROTATION_OPTIONS, DEV_ACTIVITY_OPTIONS, DEV_DURATION_OPTIONS, DEV_TIER_OPTIONS } from '@/lib/constants';
import styles from './dev.module.css';

export default function DevSettings() {
  const { data: session } = useSession();

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
  
  // Broadcast State
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '', type: 'info' });
  const [announceLoading, setAnnounceLoading] = useState(false);
  
  // Maintenance State
  const [showPremium, setShowPremium] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [resetAllLoading, setResetAllLoading] = useState(false);
  const [resetAllStatus, setResetAllStatus] = useState(null);
  const [confirmNuclear, setConfirmNuclear] = useState(false);
  const [factoryLoading, setFactoryLoading] = useState(false);
  const [factoryStatus, setFactoryStatus] = useState(null);
  const [confirmFactory, setConfirmFactory] = useState(false);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState({ show: false, title: '', message: '', action: null, type: 'danger' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedKeys, fetchedStatuses, botSettings, fetchedAnnouncements] = await Promise.all([
        devService.getKeys(),
        devService.getStatuses(),
        devService.getBotSettings(),
        devService.getAnnouncements()
      ]);
      
      if (Array.isArray(fetchedKeys)) setKeys(fetchedKeys);
      if (Array.isArray(fetchedStatuses)) setStatuses(fetchedStatuses);
      if (botSettings.status_rotation_mode) setRotationMode(botSettings.status_rotation_mode);
      if (botSettings.presence_interval_seconds) setRotationInterval(botSettings.presence_interval_seconds);
      if (Array.isArray(fetchedAnnouncements)) setAnnouncements(fetchedAnnouncements);
    } catch (err) {
      console.error("Error fetching dev data", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Premium Keys ---
  const handleGenerate = async () => {
    setGenerating(true);
    const daysToGenerate = duration === 'custom' ? parseInt(customDays) : parseInt(duration);
    try {
      await devService.generateKey(daysToGenerate, parseInt(maxUses), parseInt(tier));
      const newKeys = await devService.getKeys();
      setKeys(newKeys);
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  const handleDelete = async (code) => {
    try {
      await devService.deleteKey(code);
      setKeys(keys.filter(k => k.code !== code));
    } catch (err) { console.error(err); }
  };

  const handleRevoke = async (code) => {
    try {
      await devService.revokeKey(code);
      setKeys(keys.map(k => k.code === code ? { ...k, is_revoked: true } : k));
    } catch (err) { console.error(err); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopying(text);
    setTimeout(() => setCopying(null), 2000);
  };

  // --- Bot Status ---
  const handleAddStatus = async () => {
    if (!newStatusText.trim()) return;
    setStatusLoading(true);
    try {
      await devService.addStatus(newStatusType, newStatusText);
      setNewStatusText('');
      const fetchedStatuses = await devService.getStatuses();
      setStatuses(fetchedStatuses);
    } catch (err) { console.error(err); }
    setStatusLoading(false);
  };

  const handleDeleteStatus = async (id) => {
    try {
      await devService.deleteStatus(id);
      const fetchedStatuses = await devService.getStatuses();
      setStatuses(fetchedStatuses);
    } catch (err) { console.error(err); }
  };

  const handleUpdateBotSetting = async (key, value) => {
    try {
      await devService.updateBotSetting(key, value);
    } catch (err) { console.error(err); }
  };

  // --- Announcements ---
  const handleSendAnnouncement = async () => {
    if (!newAnnounce.title || !newAnnounce.content) return;
    setAnnounceLoading(true);
    try {
      await devService.addAnnouncement(newAnnounce);
      setNewAnnounce({ title: '', content: '', type: 'info' });
      const fetchedAnnouncements = await devService.getAnnouncements();
      setAnnouncements(fetchedAnnouncements);
    } catch (err) { console.error(err); }
    setAnnounceLoading(false);
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await devService.deleteAnnouncement(id);
      const fetchedAnnouncements = await devService.getAnnouncements();
      setAnnouncements(fetchedAnnouncements);
    } catch (err) { console.error(err); }
  };

  // --- System Administration ---
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
      await devService.resetHistory();
      setResetAllStatus({ type: 'success', message: 'Nuclear Reset Complete! ALL monitor history cleared.' });
      setConfirmNuclear(false);
    } catch (err) {
      setResetAllStatus({ type: 'error', message: err.message || 'Connection failed' });
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
      await devService.factoryReset();
      setFactoryStatus({ type: 'success', message: 'FACTORY RESET COMPLETE. SYSTEM WIPED.' });
      setConfirmFactory(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setFactoryStatus({ type: 'error', message: err.message || 'Connection failed' });
    }
    setFactoryLoading(false);
  };

  return (
    <div className={styles.devPageWrapper}>
      
      {/* Custom Confirmation Modal */}
      {modalConfig.show && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${modalConfig.type === 'extreme' ? styles.extreme : ''}`}>
            <div className={styles.modalHeader}>
              <ShieldAlert size={24} />
              <h3>{modalConfig.title}</h3>
            </div>
            <div className={styles.modalBody}>
              <p>{modalConfig.message}</p>
            </div>
            <div className={styles.modalFooter}>
              <button className={`${styles.modalBtn} ${styles.cancel}`} onClick={() => setModalConfig({ ...modalConfig, show: false })}>Cancel</button>
              <button className={`${styles.modalBtn} ${styles.confirm}`} onClick={() => { modalConfig.action(); setModalConfig({ ...modalConfig, show: false }); }}>Confirm Intent</button>
            </div>
          </div>
        </div>
      )}

      <header className="ui-dashboard-header">
        <div className="ui-dashboard-info">
          <h1 className="ui-dashboard-title">Developer Controls</h1>
          <p className="ui-dashboard-subtitle">Master administrator tools for logs, announcements, and premium management.</p>
        </div>
        <div className="page-header-actions">
          <LoginButton session={session} />
        </div>
      </header>

      <section style={{ marginBottom: '1rem' }}>
        <LogStreamer />
      </section>

      {/* Broadcast Notifications Section */}
      <div 
        onClick={() => setShowBroadcast(!showBroadcast)} 
        className={`${styles.accordionHeader} ${styles.broadcast} ${showBroadcast ? styles.accordionHeaderOpen : styles.accordionHeaderClosed}`}
      >
        <div className={styles.accordionTitleContainer}>
          <Activity size={20} color="#60a5fa" />
          <h3 className="ui-monitor-name" style={{ marginBottom: 0 }}>Global Broadcasts</h3>
        </div>
        <span className={styles.accordionArrow} style={{ transform: showBroadcast ? 'rotate(180deg)' : 'rotate(0deg)', color: '#60a5fa' }}>▼</span>
      </div>

      <div className={`${styles.accordionContent} ${styles.broadcast} ${showBroadcast ? styles.accordionContentOpen : styles.accordionContentClosed}`}>
        <div className={styles.broadcastGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Message Title</label>
              <input 
                type="text" 
                value={newAnnounce.title} 
                onChange={(e) => setNewAnnounce({ ...newAnnounce, title: e.target.value })}
                placeholder="e.g. Scheduled Maintenance"
                className={styles.styledInputBasic}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Content Markdown</label>
              <textarea 
                value={newAnnounce.content} 
                onChange={(e) => setNewAnnounce({ ...newAnnounce, content: e.target.value })}
                placeholder="Details of the announcement..."
                className={styles.styledInputBasic}
                style={{ minHeight: '120px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <label className={styles.formLabel}>Alert Type</label>
                  <div className={styles.typeBtnGroup}>
                    {['info', 'warning', 'danger'].map(type => (
                      <button 
                        key={type}
                        onClick={() => setNewAnnounce({ ...newAnnounce, type })}
                        className={`${styles.typeBtn} ${newAnnounce.type === type ? styles[`active${type.charAt(0).toUpperCase() + type.slice(1)}`] : ''}`}
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
                <div key={a.id} className={styles.announceMiniCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className={`${styles.miniType} ${styles[a.type]}`}>{a.type}</span>
                    <button onClick={() => handleDeleteAnnouncement(a.id)} className={styles.iconBtnDanger}><X size={12} /></button>
                  </div>
                  <p className={styles.miniTitle}>{a.title}</p>
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
        className={`${styles.accordionHeader} ${styles.presence} ${showPresence ? styles.accordionHeaderOpen : styles.accordionHeaderClosed}`}
      >
        <div className={styles.accordionTitleContainer}>
          <div className={styles.presenceIndicator}></div>
          <h3 className="ui-monitor-name" style={{ marginBottom: 0 }}>Discord Rich Presence</h3>
        </div>
        <span className={styles.accordionArrow} style={{ transform: showPresence ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--accent-hover)' }}>▼</span>
      </div>
      
      <div className={`${styles.accordionContent} ${styles.presence} ${showPresence ? styles.accordionContentOpen : styles.accordionContentClosed}`}>
        <div className={styles.presenceGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Global Configuration</h4>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Rotation Mode</label>
              <CustomSelect options={DEV_ROTATION_OPTIONS} value={rotationMode} onChange={(val) => { setRotationMode(val); handleUpdateBotSetting('status_rotation_mode', val); }} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Rotation Interval</label>
              <div className={styles.inputWithSuffix}>
                <input type="number" value={rotationInterval} onChange={(e) => setRotationInterval(e.target.value)} onBlur={(e) => handleUpdateBotSetting('presence_interval_seconds', e.target.value)} className={styles.styledInputBasic} style={{ width: '100%', paddingRight: '3rem' }} min="10" />
                <span className={styles.inputSuffix}>sec</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Add New Pattern</h4>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Activity Type</label>
              <CustomSelect options={DEV_ACTIVITY_OPTIONS} value={newStatusType} onChange={(val) => setNewStatusType(val)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Text Pattern</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" value={newStatusText} onChange={(e) => setNewStatusText(e.target.value)} placeholder="e.g. {count} servers" className={styles.styledInputBasic} style={{ flex: 1 }} />
                <button className="btn" onClick={handleAddStatus} disabled={statusLoading}>{statusLoading ? '...' : 'ADD'}</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {statuses.map(s => (
            <div key={s.id} className={styles.statusMiniCard}>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span className={styles.miniTypeBadge}>{s.type}</span>
                <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.text}</span>
              </div>
              <button className={styles.iconBtnDanger} onClick={() => handleDeleteStatus(s.id)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Premium Key Management Section */}
      <div 
        onClick={() => setShowPremium(!showPremium)} 
        className={`${styles.accordionHeader} ${styles.premium} ${showPremium ? styles.accordionHeaderOpen : styles.accordionHeaderClosed}`}
      >
        <div className={styles.accordionTitleContainer}>
          <Zap size={20} color="#c084fc" />
          <h3 className="ui-monitor-name" style={{ marginBottom: 0 }}>Premium Key Management</h3>
        </div>
        <span className={styles.accordionArrow} style={{ transform: showPremium ? 'rotate(180deg)' : 'rotate(0deg)', color: '#c084fc' }}>▼</span>
      </div>

      <div className={`${styles.accordionContent} ${styles.premium} ${showPremium ? styles.accordionContentOpen : styles.accordionContentClosed}`}>
        <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Generate New Access Keys</h4>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '3rem' }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Duration</label>
            <CustomSelect options={DEV_DURATION_OPTIONS} value={duration} onChange={(val) => setDuration(val)} width="250px" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tier</label>
            <CustomSelect options={DEV_TIER_OPTIONS} value={tier} onChange={(val) => setTier(val)} width="200px" />
          </div>
          {duration === 'custom' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Days</label>
              <input type="number" value={customDays} onChange={(e) => setCustomDays(e.target.value)} className={styles.styledInputBasic} style={{ width: '100px' }} min="1" />
            </div>
          )}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Max Uses</label>
            <input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={styles.styledInputBasic} style={{ width: '100px' }} min="1" />
          </div>
          <button className="btn" onClick={handleGenerate} disabled={generating}>{generating ? 'Generating...' : 'Generate New Key'}</button>
        </div>

        <h4 style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Active & Unused Keys</h4>
        <div className={styles.keysGrid}>
          {loading ? <div style={{ textAlign: 'center', padding: '2rem', gridColumn: '1/-1' }}>Loading...</div> : keys.map(k => (
            <div key={k.code} className={styles.keyCard}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={styles.keyCode}>{k.code}</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`${styles.tierBadge} ${styles[`tier${k.tier || 3}`]}`}>Tier {k.tier || 3}</span>
                  <span>• {k.duration_days === 0 ? 'Lifetime' : `${k.duration_days}d`}</span>
                  <span>• {k.used_count}/{k.max_uses} uses</span>
                  {k.is_revoked && <span style={{ color: '#ef4444' }}>[REVOKED]</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={styles.iconBtn} onClick={() => copyToClipboard(k.code)}>{copying === k.code ? <Check size={16} /> : <Copy size={16} />}</button>
                <button className={styles.iconBtn} onClick={() => handleRevoke(k.code)} style={{ color: '#f59e0b' }} disabled={k.is_revoked}><ShieldAlert size={16} /></button>
                <button className={styles.iconBtn} onClick={() => handleDelete(k.code)} style={{ color: '#ef4444' }}><X size={16} /></button>
              </div>
            </div>
          ))}
          {!loading && keys.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', gridColumn: '1/-1', color: 'var(--text-secondary)' }}>No keys found.</div>}
        </div>
      </div>

      {/* System Maintenance Section */}
      <div 
        onClick={() => setShowMaintenance(!showMaintenance)} 
        className={`${styles.accordionHeader} ${styles.maintenance} ${showMaintenance ? styles.accordionHeaderOpen : styles.accordionHeaderClosed}`}
      >
        <div className={styles.accordionTitleContainer}>
          <ShieldAlert size={20} color="#ef4444" />
          <h3 className="ui-monitor-name" style={{ marginBottom: 0 }}>System Maintenance</h3>
        </div>
        <span className={styles.accordionArrow} style={{ transform: showMaintenance ? 'rotate(180deg)' : 'rotate(0deg)', color: '#ef4444' }}>▼</span>
      </div>

      <div className={`${styles.accordionContent} ${styles.maintenance} ${showMaintenance ? styles.accordionContentOpen : styles.accordionContentClosed}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={styles.nuclearCard}>
            <h4 style={{ color: '#ef4444', fontSize: '1rem', marginBottom: '0.5rem' }}>Nuclear Options</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Warning: This will clear the publication history for <strong>ALL</strong> monitors across <strong>ALL</strong> servers. 
              The bot will re-process every feed and potentially send thousands of messages if not handled carefully.
            </p>
            
            <button 
              className="btn danger" 
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

          <div className={styles.factoryCard}>
            <h4 style={{ color: '#ef4444', fontSize: '1rem', marginBottom: '0.5rem' }}>Extreme Danger: Factory Reset</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              This is the ultimate wipe. It will delete <strong>ALL MONITORS</strong>, <strong>ALL SETTINGS</strong>, <strong>ALL PREMIUM KEYS</strong>, and all history. 
              The system will be completely empty.
            </p>
            
            <button 
              className="btn danger" 
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
    </div>
  );
}
