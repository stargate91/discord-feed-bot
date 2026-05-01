"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Rss, Play, Zap, Check, AlertCircle, ChevronRight, ChevronLeft, RefreshCw, Music, Shield } from "lucide-react";
import CustomSelect from './CustomSelect';
import MultiSelect from './MultiSelect';
import { useToast } from '@/context/ToastContext';
import ColorPicker from './ColorPicker';

const platforms = [
  { id: 'youtube', name: 'YouTube', icon: <img src="/emojis/youtube.png" alt="YT" style={{ width: '24px', height: '24px' }} />, color: '#ff0000', emoji: '/emojis/youtube.png', placeholder: 'https://youtube.com/@handle\n@username\nUCID', hint: 'Links, @handles or UCIDs' },
  { id: 'stream', name: 'Twitch', icon: <img src="/emojis/twitch.png" alt="Twitch" style={{ width: '24px', height: '24px' }} />, color: '#9146ff', emoji: '/emojis/twitch.png', placeholder: 'twitch_user\nhttps://twitch.tv/user', hint: 'Usernames or Links' },
  { id: 'kick', name: 'Kick', icon: <img src="/emojis/kick.png" alt="Kick" style={{ width: '24px', height: '24px' }} />, color: '#53fc18', emoji: '/emojis/kick.png', placeholder: 'kick_user\nhttps://kick.com/user', hint: 'Usernames or Links' },
  { id: 'rss', name: 'RSS Feed', icon: <Rss />, color: '#ee802f', emoji: '/emojis/rss.png', placeholder: 'https://site.com/feed.xml\nhttps://blog.com/rss', hint: 'Full RSS/Atom URLs' },
  { id: 'github', name: 'GitHub', icon: <img src="/emojis/github.png" alt="GH" style={{ width: '24px', height: '24px' }} />, color: '#fafafa', emoji: '/emojis/github.png', placeholder: 'owner/repo\nhttps://github.com/owner/repo', hint: '"owner/repo" or Links' },
  { id: 'steam_news', name: 'Steam News', icon: <img src="/emojis/steam.png" alt="Steam" style={{ width: '24px', height: '24px' }} />, color: '#66c0f4', emoji: '/emojis/steam.png', placeholder: '730\nhttps://store.steampowered.com/app/730', hint: 'App IDs or Store URLs' },
];

export default function BulkAddModal({ isOpen, onClose, guildId, onSuccess, tier, isPremium, guildLoading }) {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [inputList, setInputList] = useState('');
  const [targetChannels, setTargetChannels] = useState([]);
  const [targetRoles, setTargetRoles] = useState([]);
  const [embedColor, setEmbedColor] = useState('#3d3f45');
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [sendInitialAlert, setSendInitialAlert] = useState(false);
  const [useNativePlayer, setUseNativePlayer] = useState(false);
  const [customImage, setCustomImage] = useState('');

  useEffect(() => {
    if (isOpen && guildId) {
      fetchGuildData();
      setStep(1);
      setSelectedPlatform(null);
      setInputList('');
      setResults(null);
      setCustomImage('');
    }
  }, [isOpen, guildId]);

  const fetchGuildData = async () => {
    try {
      const [chanRes, roleRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/channels`),
        fetch(`/api/guilds/${guildId}/roles`)
      ]);

      if (chanRes.ok) setChannels(await chanRes.json());
      if (roleRes.ok) setRoles(await roleRes.json());
    } catch (err) {
      console.error("Failed to fetch guild data:", err);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedPlatform) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    const items = inputList.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    if (items.length === 0) {
      addToast("Please enter at least one source.", "error", "Empty List");
      return;
    }

    if (targetChannels.length === 0) {
      addToast("Please select at least one target channel.", "error", "Missing Channel");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/monitors/bulk-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          type: selectedPlatform.id,
          sources: items,
          targetChannels,
          targetRoles,
          embedColor,
          sendInitialAlert: ['stream', 'kick'].includes(selectedPlatform.id) ? sendInitialAlert : false,
          use_native_player: selectedPlatform.id === 'youtube' ? useNativePlayer : undefined,
          custom_image: customImage
        })
      });

      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setStep(3);
        if (onSuccess) onSuccess();
      } else {
        addToast(data.error || "Failed to process bulk add.", "error", "Processing Failed");
      }
    } catch (err) {
      console.error("Bulk add error:", err);
      addToast("An unexpected error occurred.", "error", "Error");
    }
    setProcessing(false);
  };

  if (!isOpen) return null;

  const isMaster = isPremium && tier === 0;
  const isTierEligible = isMaster || (isPremium && tier >= 2);

  return createPortal(
    <div className="ui-modal-overlay">
      <div className="ui-modal-content">
        <div className="ui-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div className="ui-platform-icon-wrapper" style={{ width: '48px', height: '48px', background: 'rgba(123, 44, 191, 0.1)', borderColor: 'rgba(123, 44, 191, 0.2)' }}>
              <Zap size={20} style={{ color: 'var(--accent-color)' }} />
              <div className="ui-platform-icon-glow" style={{ background: 'var(--accent-color)', opacity: 0.2 }}></div>
            </div>
            <div>
              <h3 className="ui-modal-title">Bulk Import Wizard</h3>
              <p className="ui-modal-subtitle">Step {step} of 3: {step === 1 ? 'Select Platform' : step === 2 ? 'Configure Feeds' : 'Results'}</p>
            </div>
          </div>
          <button className="ui-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {guildLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1.5rem' }}>
              <RefreshCw size={48} className="animate-spin" style={{ color: 'var(--accent-color)', opacity: 0.5 }} />
              <p className="loading-text">Verifying permissions...</p>
            </div>
          ) : !isTierEligible ? (
            <div className="premium-lock">
              <div className="lock-content">
                <Shield size={48} color="#ffd700" style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.3))' }} />
                <h4>Professional Feature</h4>
                <p>The Bulk Import Wizard is available exclusively for **Professional** and **Ultimate** tiers.</p>
                <a href={`/premium?guild=${guildId}`} className="upgrade-btn">Upgrade to Professional</a>
              </div>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="ui-platform-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', padding: '2rem' }}>
                  {platforms.map(p => (
                    <div
                      key={p.id}
                      className={`ui-platform-card ${selectedPlatform?.id === p.id ? 'active' : ''}`}
                      onClick={() => setSelectedPlatform(p)}
                      style={{ "--platform-color": p.color, flexDirection: 'column', textAlign: 'center', padding: '2rem 1rem' }}
                    >
                      <div className="ui-platform-icon-wrapper" style={{ width: '50px', height: '50px', marginBottom: '0.5rem' }}>
                        {p.icon}
                        <div className="ui-platform-icon-glow"></div>
                      </div>
                      <div className="ui-platform-info" style={{ alignItems: 'center' }}>
                        <span className="ui-monitor-name" style={{ fontSize: '1rem' }}>{p.name}</span>
                      </div>
                      {selectedPlatform?.id === p.id && (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--accent-color)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px var(--accent-glow)' }}>
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="ui-modal-body" style={{ padding: '2rem' }}>
                  <div className="ui-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <label className="ui-form-label">Enter {selectedPlatform.name} sources (one per line)</label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-hover)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {selectedPlatform.hint}
                      </span>
                    </div>
                    <textarea
                      placeholder={selectedPlatform.placeholder}
                      value={inputList}
                      onChange={(e) => setInputList(e.target.value)}
                      className="ui-input ui-textarea ui-input-mono"
                      style={{ height: '180px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div className="ui-form-group">
                      <label className="ui-form-label">Target Channels</label>
                      <MultiSelect
                        options={channels.map(c => ({ id: c.id, name: `#${c.name}` }))}
                        value={targetChannels}
                        onChange={setTargetChannels}
                        placeholder="Select channels..."
                      />
                    </div>
                    <div className="ui-form-group">
                      <label className="ui-form-label">Ping Roles (Optional)</label>
                      <MultiSelect
                        options={roles.map(r => ({ id: r.id, name: r.name }))}
                        value={targetRoles}
                        onChange={setTargetRoles}
                        placeholder="No ping roles"
                      />
                    </div>
                  </div>
                  {(!['youtube'].includes(selectedPlatform?.id) || (selectedPlatform?.id === 'youtube' && !useNativePlayer)) && (
                    <div className="ui-form-group" style={{ marginTop: '1.5rem' }}>
                      <label className="ui-form-label">Accent Color</label>
                      <ColorPicker 
                        value={embedColor} 
                        onChange={setEmbedColor}
                      />
                    </div>
                  )}

                  <div className="ui-form-group" style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    padding: '1.5rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    marginTop: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <label className="ui-form-label">Custom Image URL</label>
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800 }}>
                         Imgur, Discord, etc.
                      </div>
                    </div>
                    <input
                      type="text"
                      value={customImage}
                      onChange={(e) => setCustomImage(e.target.value)}
                      className="ui-input"
                      placeholder="https://imgur.com/example.png"
                    />
                  </div>

                  {['stream', 'kick'].includes(selectedPlatform?.id) && (
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
                          Post updates immediately for any source that is already live.
                        </p>
                      </div>
                      <label className="ui-switch">
                        <input
                          type="checkbox"
                          checked={sendInitialAlert}
                          onChange={(e) => setSendInitialAlert(e.target.checked)}
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
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label className="ui-form-label" style={{ color: 'white' }}>Use Native Discord Player</label>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', maxWidth: '300px' }}>
                          Bypass the custom layout and let Discord embed the video directly.
                        </p>
                      </div>
                      <label className="ui-switch">
                        <input
                          type="checkbox"
                          checked={useNativePlayer}
                          onChange={(e) => setUseNativePlayer(e.target.checked)}
                        />
                        <span className="ui-switch-slider"></span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && results && (
                <div className="ui-modal-body" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>
                    <Check size={32} />
                  </div>
                  <h4 className="ui-modal-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Import Completed</h4>
                  <p className="ui-modal-subtitle" style={{ textTransform: 'none', color: 'rgba(255,255,255,0.6)' }}>Successfully processed <strong>{results.successCount + results.errorCount}</strong> items.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', margin: '2rem 0' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '20px' }}>
                      <span style={{ display: 'block', fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>{results.successCount}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(16, 185, 129, 0.6)', textTransform: 'uppercase' }}>Added Successfully</span>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '20px' }}>
                      <span style={{ display: 'block', fontSize: '2rem', fontWeight: 900, color: '#ef4444' }}>{results.errorCount}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(239, 68, 68, 0.6)', textTransform: 'uppercase' }}>Failed / Duplicates</span>
                    </div>
                  </div>

                  {results.errors?.length > 0 && (
                    <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Issues encountered:</label>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {results.errors.map((err, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                            <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} /> {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="ui-modal-footer">
          {!guildLoading && isTierEligible && step < 3 && (
            <>
              {step > 1 && (
                <button className="ui-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={handleBack} disabled={processing}>
                  <ChevronLeft size={18} /> Back
                </button>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                <button className="ui-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={onClose} disabled={processing}>Cancel</button>
                {step === 1 ? (
                  <button className="ui-btn ui-btn-primary" onClick={handleNext} disabled={!selectedPlatform}>
                    Next <ChevronRight size={18} />
                  </button>
                ) : (
                  <button className="ui-btn ui-btn-primary" onClick={handleSubmit} disabled={processing}>
                    {processing ? <><RefreshCw size={18} className="animate-spin" /> Processing...</> : <><Zap size={18} /> Create Monitors</>}
                  </button>
                )}
              </div>
            </>
          )}
          {(!isTierEligible || step === 3) && (
            <button className="ui-btn ui-btn-primary" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
