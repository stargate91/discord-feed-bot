"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Rss, Play, Zap, Check, AlertCircle, ChevronRight, ChevronLeft, RefreshCw, Music, Shield } from "lucide-react";
import CustomSelect from './CustomSelect';
import MultiSelect from './MultiSelect';
import { useToast } from '@/context/ToastContext';

const platforms = [
  { id: 'youtube', name: 'YouTube', icon: <img src="/emojis/youtube.png" alt="YT" style={{ width: '24px', height: '24px' }} />, color: '#ff0000', emoji: '/emojis/youtube.png' },
  { id: 'stream', name: 'Twitch', icon: <img src="/emojis/twitch.png" alt="Twitch" style={{ width: '24px', height: '24px' }} />, color: '#9146ff', emoji: '/emojis/twitch.png' },
  { id: 'rss', name: 'RSS Feed', icon: <Rss />, color: '#ee802f', emoji: '/emojis/rss.png' },
  { id: 'github', name: 'GitHub', icon: <img src="/emojis/github.png" alt="GH" style={{ width: '24px', height: '24px' }} />, color: '#fafafa', emoji: '/emojis/github.png' },
  { id: 'steam_news', name: 'Steam News', icon: <img src="/emojis/steam.png" alt="Steam" style={{ width: '24px', height: '24px' }} />, color: '#171a21', emoji: '/emojis/steam.png' },
];

export default function BulkAddModal({ isOpen, onClose, guildId, onSuccess, tier, isPremium }) {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [inputList, setInputList] = useState('');
  const [targetChannels, setTargetChannels] = useState([]);
  const [targetRoles, setTargetRoles] = useState([]);
  const [embedColor, setEmbedColor] = useState('#7b2cbf');
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (isOpen && guildId) {
      fetchGuildData();
      setStep(1);
      setSelectedPlatform(null);
      setInputList('');
      setResults(null);
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
          embedColor
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '2rem',
      overflowY: 'auto',
    }}>
      <div className="modal-content bulk-modal">
        <header className="modal-header">
          <div className="title-group">
            <div className="icon-wrapper">
              <Zap size={20} className="wand-icon" />
            </div>
            <div>
              <h3>Bulk Import Wizard</h3>
              <p>Step {step} of 3: {step === 1 ? 'Select Platform' : step === 2 ? 'Configure Feeds' : 'Results'}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body">
          {!isTierEligible ? (
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
                <div className="step-1-grid">
                  {platforms.map(p => (
                    <button 
                      key={p.id} 
                      className={`platform-card ${selectedPlatform?.id === p.id ? 'active' : ''}`}
                      onClick={() => setSelectedPlatform(p)}
                    >
                      <div className="p-icon" style={{ background: `${p.color}20`, color: p.color }}>
                        {p.icon}
                      </div>
                      <span className="p-name">{p.name}</span>
                      {selectedPlatform?.id === p.id && <div className="check-badge"><Check size={12} /></div>}
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="step-2-form">
                  <div className="form-section">
                    <label>Enter {selectedPlatform.name} links or usernames (one per line)</label>
                    <textarea 
                      placeholder={selectedPlatform.id === 'youtube' ? 'https://youtube.com/@channel\n@username\n...' : 'Source 1\nSource 2\n...'}
                      value={inputList}
                      onChange={(e) => setInputList(e.target.value)}
                      className="bulk-textarea"
                    />
                  </div>

                  <div className="settings-grid">
                    <div className="form-group">
                      <label>Target Channels</label>
                      <MultiSelect 
                        options={channels.map(c => ({ id: c.id, name: `#${c.name}` }))}
                        value={targetChannels}
                        onChange={setTargetChannels}
                        placeholder="Select channels..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Ping Roles (Optional)</label>
                      <MultiSelect 
                        options={roles.map(r => ({ id: r.id, name: r.name }))}
                        value={targetRoles}
                        onChange={setTargetRoles}
                        placeholder="No ping roles"
                      />
                    </div>
                    <div className="form-group">
                      <label>Accent Color</label>
                      <div className="color-input-wrapper">
                        <input 
                          type="color" 
                          value={embedColor} 
                          onChange={(e) => setEmbedColor(e.target.value)} 
                          className="color-picker"
                        />
                        <input 
                          type="text" 
                          value={embedColor} 
                          onChange={(e) => setEmbedColor(e.target.value)} 
                          className="color-text"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && results && (
                <div className="step-3-results">
                  <div className="results-header">
                    <div className="success-circle">
                      <Check size={32} />
                    </div>
                    <h4>Import Completed</h4>
                    <p>Successfully processed **{results.successCount + results.errorCount}** items.</p>
                  </div>

                  <div className="results-summary">
                    <div className="summary-card success">
                      <span className="count">{results.successCount}</span>
                      <span className="label">Added Successfully</span>
                    </div>
                    <div className="summary-card error">
                      <span className="count">{results.errorCount}</span>
                      <span className="label">Failed / Duplicates</span>
                    </div>
                  </div>

                  {results.errors?.length > 0 && (
                    <div className="error-log">
                      <label>Issues encountered:</label>
                      <ul>
                        {results.errors.map((err, i) => (
                          <li key={i}><AlertCircle size={14} /> {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="modal-footer">
          {isTierEligible && step < 3 && (
            <>
              {step > 1 && (
                <button className="btn btn-ghost" onClick={handleBack} disabled={processing}>
                  <ChevronLeft size={18} /> Back
                </button>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-ghost" onClick={onClose} disabled={processing}>Cancel</button>
                {step === 1 ? (
                  <button className="btn btn-primary" onClick={handleNext} disabled={!selectedPlatform}>
                    Next <ChevronRight size={18} />
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleSubmit} disabled={processing}>
                    {processing ? <><RefreshCw size={18} className="animate-spin" /> Processing...</> : <><Zap size={18} /> Create Monitors</>}
                  </button>
                )}
              </div>
            </>
          )}
          {(!isTierEligible || step === 3) && (
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
          )}
        </footer>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 2rem;
            overflow-y: auto;
            animation: overlayIn 0.3s ease-out;
          }

          @keyframes overlayIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .modal-content {
            width: 100%;
            background: rgba(15, 15, 25, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 28px;
            padding: 2.5rem;
            animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.9) translateY(40px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
          }

          .title-group {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .icon-wrapper {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            background: rgba(123, 44, 191, 0.1);
            border: 1px solid rgba(123, 44, 191, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .modal-header h3 {
            margin: 0;
            font-size: 1.4rem;
            font-weight: 800;
            letter-spacing: -0.5px;
          }

          .modal-header p {
            margin: 4px 0 0;
            color: var(--accent-hover);
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .close-btn {
            background: rgba(255,255,255,0.05);
            border: none;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }
          .close-btn:hover {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
          }

          .modal-body {
            min-height: 200px;
          }

          .modal-footer {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255,255,255,0.05);
          }

          .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 0.85rem 1.5rem;
            border-radius: 14px;
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }

          .btn-ghost {
            flex: 1;
            background: transparent;
            border: 1px solid rgba(255,255,255,0.1);
            color: var(--text-secondary);
          }
          .btn-ghost:hover {
            background: rgba(255,255,255,0.05);
            color: white;
            border-color: rgba(255,255,255,0.2);
          }

          .btn-primary {
            flex: 2;
            background: var(--accent-color);
            color: white;
            box-shadow: 0 10px 25px rgba(123, 44, 191, 0.3);
          }
          .btn-primary:hover:not(:disabled) {
            transform: translateY(-3px);
            filter: brightness(1.1);
            box-shadow: 0 15px 35px rgba(123, 44, 191, 0.4);
          }
          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .bulk-modal {
            max-width: 650px;
            width: 90%;
            background: #0f0f13;
            border: 1px solid rgba(255,255,255,0.05);
            box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          }

          .wand-icon {
            color: var(--accent-color);
            filter: drop-shadow(0 0 8px var(--accent-glow));
          }

          .step-1-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 1.25rem;
            padding: 0.5rem;
          }

          .platform-card {
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
            padding: 2rem 1.5rem;
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            color: white;
          }

          .platform-card:hover {
            background: rgba(255,255,255,0.05);
            transform: translateY(-5px);
            border-color: rgba(255,255,255,0.1);
          }

          .platform-card.active {
            background: rgba(123, 44, 191, 0.1);
            border-color: var(--accent-color);
            box-shadow: 0 10px 25px rgba(123, 44, 191, 0.15);
          }

          .p-icon {
            width: 50px;
            height: 50px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s;
          }

          .platform-card:hover .p-icon {
            transform: scale(1.1) rotate(5deg);
          }

          .p-name {
            font-weight: 700;
            font-size: 0.95rem;
          }

          .check-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: var(--accent-color);
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .step-2-form {
            display: flex;
            flex-direction: column;
            gap: 2rem;
          }

          .bulk-textarea {
            width: 100%;
            height: 180px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 1rem;
            color: white;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 0.9rem;
            resize: none;
            outline: none;
            transition: border-color 0.2s;
          }

          .bulk-textarea:focus {
            border-color: var(--accent-color);
            background: rgba(255,255,255,0.05);
          }

          .settings-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
          }

          .color-input-wrapper {
            display: flex;
            gap: 10px;
          }

          .color-picker {
            width: 45px;
            height: 45px;
            padding: 0;
            border: none;
            border-radius: 8px;
            background: transparent;
            cursor: pointer;
          }

          .color-text {
            flex: 1;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
            padding: 0 12px;
            color: white;
            font-size: 0.85rem;
            font-family: monospace;
          }

          .premium-lock {
            padding: 4rem 2rem;
            text-align: center;
            background: rgba(255,215,0,0.02);
            border-radius: 24px;
            border: 1px dashed rgba(255,215,0,0.1);
          }

          .lock-content h4 {
            font-size: 1.5rem;
            font-weight: 900;
            color: #ffd700;
            margin-bottom: 0.5rem;
          }

          .lock-content p {
            color: rgba(255,255,255,0.5);
            margin-bottom: 2rem;
            max-width: 350px;
            margin-left: auto;
            margin-right: auto;
          }

          .upgrade-btn {
            display: inline-block;
            background: linear-gradient(45deg, #ffd700, #ffa500);
            color: black;
            font-weight: 800;
            padding: 1rem 2rem;
            border-radius: 12px;
            text-decoration: none;
            transition: all 0.3s;
            box-shadow: 0 10px 20px rgba(255,165,0,0.2);
          }

          .upgrade-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 30px rgba(255,165,0,0.3);
          }

          .step-3-results {
            text-align: center;
            padding: 1rem;
          }

          .success-circle {
            width: 80px;
            height: 80px;
            background: rgba(74, 222, 128, 0.1);
            color: #4ade80;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            border: 2px solid rgba(74, 222, 128, 0.2);
          }

          .results-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin: 2.5rem 0;
          }

          .summary-card {
            padding: 1.5rem;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .summary-card.success { background: rgba(74, 222, 128, 0.05); border: 1px solid rgba(74, 222, 128, 0.1); }
          .summary-card.error { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); }

          .summary-card .count { font-size: 2rem; font-weight: 900; }
          .summary-card.success .count { color: #4ade80; }
          .summary-card.error .count { color: #ef4444; }

          .summary-card .label { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; opacity: 0.6; }

          .error-log {
            text-align: left;
            background: rgba(0,0,0,0.2);
            padding: 1.25rem;
            border-radius: 12px;
            max-height: 150px;
            overflow-y: auto;
          }

          .error-log label { font-size: 0.8rem; font-weight: 700; color: #ef4444; margin-bottom: 10px; display: block; }
          .error-log ul { list-style: none; padding: 0; margin: 0; }
          .error-log li { font-size: 0.75rem; color: rgba(255,255,255,0.5); display: flex; gap: 8px; align-items: center; margin-bottom: 5px; }

          @media (max-width: 600px) {
            .settings-grid { grid-template-columns: 1fr; }
            .step-1-grid { grid-template-columns: 1fr 1fr; }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}
