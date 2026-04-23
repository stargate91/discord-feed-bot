"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Globe, 
  Hash, 
  Shield, 
  Crown, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ChevronDown,
  Clock,
  MessageSquare,
  Lock,
  Zap,
  Info
} from 'lucide-react';
import Link from 'next/link';
import SettingCard from '@/components/SettingCard';

// --- PLATFORM CONFIG ---
const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', tags: ['{name}', '{title}', '{url}'] },
  { id: 'rss', name: 'RSS Feed', tags: ['{name}', '{title}', '{url}', '{description}'] },
  { id: 'epic_games', name: 'Epic Games', tags: ['{name}', '{title}', '{url}'] },
  { id: 'crypto', name: 'Crypto Alerts', tags: ['{name}', '{price}', '{threshold}', '{direction}', '{percent}'] },
  { id: 'steam_free', name: 'Steam Free', tags: ['{name}', '{title}', '{url}'] },
  { id: 'gog_free', name: 'GOG Free', tags: ['{name}', '{title}', '{url}'] },
  { id: 'stream', name: 'Live Stream', tags: ['{name}', '{url}', '{status}'] },
  { id: 'movie', name: 'Movies', tags: ['{name}', '{title}', '{url}', '{rating}', '{year}'] },
  { id: 'tv_series', name: 'TV Series', tags: ['{name}', '{title}', '{url}', '{rating}', '{year}'] },
];

const TAG_DESCRIPTIONS = {
  '{name}': 'Platform or Channel name',
  '{title}': 'Content title or Video title',
  '{url}': 'Direct link to the post/video',
  '{description}': 'Short summary or description',
  '{price}': 'Current cryptocurrency price (USD)',
  '{threshold}': 'The price limit you set',
  '{direction}': 'Up or Down direction emoji',
  '{percent}': 'Percentage difference from threshold',
  '{status}': 'Online or Offline status',
  '{rating}': 'Movie or TV Show rating (e.g., 8.5)',
  '{year}': 'Release year of the content'
};

// --- Custom Role Select Component ---
function CustomRoleSelect({ roles, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const selectedRole = roles.find(r => r.id === value);
  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <div 
        className={`select-trigger ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="selected-value">
          <div 
            className="role-dot" 
            style={{ backgroundColor: selectedRole?.color || 'transparent', border: !selectedRole?.color ? '1px dashed rgba(255,255,255,0.3)' : 'none' }}
          ></div>
          <span className={!selectedRole ? 'placeholder' : ''}>
            {selectedRole ? selectedRole.name : "None (Owner & Admins only)"}
          </span>
        </div>
        <ChevronDown size={18} className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </div>

      {isOpen && (
        <div className="select-dropdown">
          <div className="select-search-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="select-search-input" 
              placeholder="Search roles..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          
          <div className="select-options">
            <div 
              className={`select-option ${value === '0' || !value ? 'active' : ''}`}
              onClick={() => {
                onChange('0');
                setIsOpen(false);
              }}
            >
              <div className="role-dot transparent"></div>
              <span>None (Owner & Admins only)</span>
            </div>

            {filteredRoles.map(role => (
              <div 
                key={role.id} 
                className={`select-option ${value === role.id ? 'active' : ''}`}
                onClick={() => {
                  onChange(role.id);
                  setIsOpen(false);
                }}
              >
                <div 
                  className="role-dot" 
                  style={{ backgroundColor: role.color || '#99aab5' }}
                ></div>
                <span style={{ color: role.color || 'white' }}>{role.name}</span>
              </div>
            ))}

            {filteredRoles.length === 0 && search && (
              <div className="select-no-results">No roles found</div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-select-container { position: relative; width: 100%; user-select: none; }
        .select-trigger {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px; padding: 0.75rem 1rem; cursor: pointer; transition: all 0.2s;
        }
        .select-trigger:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); }
        .select-trigger.open { border-color: var(--accent-color); background: rgba(123, 44, 191, 0.1); box-shadow: 0 0 15px rgba(123, 44, 191, 0.2); }
        .selected-value { display: flex; align-items: center; gap: 12px; font-size: 1rem; color: white; }
        .placeholder { color: var(--text-secondary); }
        .role-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .role-dot.transparent { border: 1px dashed rgba(255, 255, 255, 0.3); }
        .chevron { color: var(--text-secondary); transition: transform 0.2s; }
        .chevron.rotate { transform: rotate(180deg); }
        .select-dropdown {
          position: absolute; top: calc(100% + 8px); left: 0; right: 0;
          background: rgba(15, 15, 20, 0.95); backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); z-index: 100; overflow: hidden;
          animation: dropIn 0.2s ease-out;
        }
        @keyframes dropIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .select-search-wrapper { padding: 12px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: rgba(255, 255, 255, 0.02); }
        .search-icon { color: var(--text-secondary); }
        .select-search-input { flex: 1; background: none; border: none; color: white; font-size: 0.95rem; outline: none; }
        .select-options { max-height: 250px; overflow-y: auto; padding: 8px; }
        .select-option { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 0.15s; color: var(--text-secondary); }
        .select-option:hover { background: rgba(255, 255, 255, 0.05); color: white; }
        .select-option.active { background: rgba(123, 44, 191, 0.15); color: white; }
      `}</style>
    </div>
  );
}

// --- Main Settings Page Component ---
function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = searchParams.get('guild');

  const [settings, setSettings] = useState({
    language: 'en',
    admin_role_id: '0',
    refresh_interval: 15,
    alert_templates: {},
    isMaster: false
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Redemption State
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState(null); // { type: 'success'|'error', message: string }

  // Template Editor State
  const [activePlatform, setActivePlatform] = useState(PLATFORMS[0].id);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, rolesRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/settings`),
        fetch(`/api/guilds/${guildId}/roles`)
      ]);

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setSettings(sData);
      }
      
      if (rolesRes.ok) {
        const rData = await rolesRes.json();
        setRoles(rData);
      }
    } catch (err) {
      console.error("Failed to fetch settings/roles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!guildId) {
      router.push('/select-server');
      return;
    }

    fetchData();
  }, [guildId, router]);

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    setRedeemStatus(null);

    try {
      const res = await fetch('/api/premium/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode, guildId })
      });

      const data = await res.json();
      if (res.ok) {
        setRedeemStatus({ type: 'success', message: 'Premium activated successfully!' });
        setRedeemCode("");
        // Refresh settings locally or re-fetch
        fetchData();
      } else {
        setRedeemStatus({ type: 'error', message: data.error || 'Failed to redeem' });
      }
    } catch (err) {
      setRedeemStatus({ type: 'error', message: 'Connection error' });
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setNotification({ type: 'success', message: 'Settings saved successfully!' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.error || "Failed to save");
      }
    } catch (err) {
      setNotification({ type: 'error', message: `Error: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (val) => {
    setSettings({
      ...settings,
      alert_templates: {
        ...settings.alert_templates,
        [activePlatform]: val
      }
    });
  };

  if (loading) return <div className="loading-container"><div className="loader"></div></div>;

  const isPremiumActive = settings.isMaster || (settings.premium_until && new Date(settings.premium_until) > new Date());
  const minInterval = settings.isMaster ? 1 : (isPremiumActive ? 2 : 15);
  const currentPlatform = PLATFORMS.find(p => p.id === activePlatform);

  return (
    <div className="settings-container">
      <header className="header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2>Server Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Adjust bot preferences, management roles, and custom alert templates.
          </p>
        </div>
        
        <button className="save-button" onClick={handleSave} disabled={saving}>
          {saving ? <div className="button-loader"></div> : <Save size={18} />}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </header>

      {notification && (
        <div className={`notification-banner ${notification.type}`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="settings-grid">
        <div className="settings-main">
          {/* 1. Language */}
          <SettingCard title="System Language" description="Default language for bot messages" icon={Globe}>
            <div className="language-toggle">
              <button className={`lang-btn ${settings.language === 'en' ? 'active' : ''}`} onClick={() => setSettings({...settings, language: 'en'})}>
                <img src="https://flagcdn.com/w40/gb.png" alt="English" className="flag-icon-img" />
                <span>English</span>
              </button>
              <button className={`lang-btn ${settings.language === 'hu' ? 'active' : ''}`} onClick={() => setSettings({...settings, language: 'hu'})}>
                <img src="https://flagcdn.com/w40/hu.png" alt="Magyar" className="flag-icon-img" />
                <span>Magyar</span>
              </button>
            </div>
          </SettingCard>

          {/* 2. Refresh Interval */}
          <SettingCard title="Refresh Frequency" description={`How often the bot checks for updates (Min. ${minInterval}m)`} icon={Clock}>
            <div className="interval-input-wrapper">
              <div className="number-input-container">
                <input type="number" className="interval-number-input" min={minInterval} max={1440} value={settings.refresh_interval} onChange={(e) => setSettings({...settings, refresh_interval: parseInt(e.target.value) || minInterval})} />
                <span className="unit-label">minutes</span>
              </div>
            </div>
          </SettingCard>

          {/* 3. Alert Templates (Premium) */}
          <SettingCard title="Alert Templates" description="Customize how bot messages look per platform" icon={MessageSquare}>
            {!isPremiumActive ? (
              <div className="premium-lock-overlay">
                <Lock size={32} />
                <p>This is a Premium Feature</p>
                <Link href={`/premium?guild=${guildId}`}>
                  <button className="upgrade-btn-small">Upgrade Now</button>
                </Link>
              </div>
            ) : (
              <div className="template-editor-wrapper">
                <div className="platform-tabs">
                  {PLATFORMS.map(p => (
                    <button key={p.id} className={`platform-tab ${activePlatform === p.id ? 'active' : ''}`} onClick={() => setActivePlatform(p.id)}>
                      {p.name}
                    </button>
                  ))}
                </div>
                
                <div className="editor-container">
                  <div className="tags-hint">
                    <Zap size={14} />
                    <span>Available tags (hover for detail):</span>
                    <div className="tags-list">
                      {currentPlatform?.tags.map(tag => (
                        <div key={tag} className="tag-wrapper">
                          <code 
                            className="tag-pill" 
                            onClick={() => updateTemplate((settings.alert_templates[activePlatform] || "") + tag)}
                            data-tooltip={TAG_DESCRIPTIONS[tag]}
                          >
                            {tag}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <textarea 
                    className="template-textarea"
                    placeholder="Enter your custom template..."
                    value={settings.alert_templates[activePlatform] || ""}
                    onChange={(e) => updateTemplate(e.target.value)}
                  />
                  
                  <p className="template-tip">
                    <Info size={14} />
                    Leave empty to use the system default template.
                  </p>
                </div>
              </div>
            )}
          </SettingCard>

          {/* 4. Roles */}
          <SettingCard title="Management Role" description="Role allowed to configure the bot" icon={Shield}>
            <CustomRoleSelect roles={roles} value={settings.admin_role_id} onChange={(newId) => setSettings({...settings, admin_role_id: newId})} />
          </SettingCard>
        </div>

        <div className="settings-sidebar">
          <div className={`premium-status-card ${isPremiumActive ? 'premium-active' : ''}`}>
            <div className="premium-header">
              <div className="premium-icon"><Crown size={24} /></div>
              <div>
                <h4>Premium Status</h4>
                <p>{settings.isMaster ? 'Master Server (Lifetime)' : (settings.premium_until ? 'Active Subscription' : 'Free Tier')}</p>
              </div>
            </div>
            {isPremiumActive ? (
               <div className="premium-details">
                 <p className="expiry-label">Access Level:</p>
                 <p className="expiry-date">{settings.isMaster ? 'LIFETIME' : new Date(settings.premium_until).toLocaleDateString()}</p>
               </div>
            ) : (
                <Link href={`/premium?guild=${guildId}`}>
                  <button className="upgrade-btn">Upgrade to Premium</button>
                </Link>
            )}
          </div>

          {!settings.isMaster && (
            <div className="card redeem-card">
              <div className="card-header-compact">
                <Zap size={18} className="zap-icon" />
                <h4>Redeem Code</h4>
              </div>
              <p className="card-hint">Have a premium key? Enter it below to activate features.</p>
              
              <div className="redeem-form">
                <input 
                  type="text" 
                  className="redeem-input" 
                  placeholder="PREM-XXXX-XXXX-XXXX" 
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  disabled={redeemLoading}
                />
                <button 
                  className="redeem-btn" 
                  onClick={handleRedeem}
                  disabled={redeemLoading || !redeemCode.trim()}
                >
                  {redeemLoading ? <div className="btn-loader-small"></div> : 'Redeem'}
                </button>
              </div>

              {redeemStatus && (
                <div className={`redeem-status ${redeemStatus.type}`}>
                  {redeemStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{redeemStatus.message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings-container { max-width: 1450px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
        .notification-banner { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; border-radius: 12px; animation: slideIn 0.3s ease-out; }
        .notification-banner.success { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #4ade80; }
        .notification-banner.error { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #f87171; }
        .settings-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        .settings-main { display: flex; flex-direction: column; gap: 1.5rem; }
        .language-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .lang-btn { display: flex; align-items: center; justify-content: center; gap: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0.75rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-weight: 600; }
        .lang-btn.active { background: rgba(123, 44, 191, 0.15); border-color: var(--accent-color); color: white; }
        .flag-icon-img { width: 22px; height: 16px; object-fit: cover; border-radius: 2px; }
        .number-input-container { display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 0.75rem 1rem; width: fit-content; }
        .interval-number-input { background: none; border: none; color: white; font-size: 1.1rem; font-weight: 600; width: 80px; outline: none; }
        .unit-label { color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; }
        
        .premium-lock-overlay { padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1); color: var(--text-secondary); }
        .upgrade-btn-small { background: var(--accent-color); border: none; color: white; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
        
        .template-editor-wrapper { display: flex; flex-direction: column; gap: 1.5rem; }
        .platform-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
        .platform-tab { white-space: nowrap; padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
        .platform-tab.active { background: var(--accent-color); color: white; border-color: transparent; }
        .editor-container { display: flex; flex-direction: column; gap: 12px; }
        .tags-hint { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 0.85rem; }
        .tags-list { display: flex; gap: 6px; flex-wrap: wrap; }
        .tag-wrapper { position: relative; }
        .tag-pill { background: rgba(123, 44, 191, 0.15); border: 1px solid rgba(123, 44, 191, 0.3); color: #c8b3ff; padding: 2px 8px; border-radius: 4px; cursor: pointer; transition: all 0.15s; font-family: monospace; position: relative; }
        .tag-pill:hover { background: rgba(123, 44, 191, 0.3); transform: scale(1.05); }
        
        .tag-pill::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-8px);
          background: rgba(15, 15, 20, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s;
          pointer-events: none;
          box-shadow: 0 5px 15px rgba(0,0,0,0.5);
          z-index: 100;
        }

        .tag-pill:hover::after {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(-12px);
        }

        .template-textarea { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: white; min-height: 120px; font-family: 'Inter', sans-serif; resize: vertical; outline: none; transition: border-color 0.2s; }
        .template-textarea:focus { border-color: var(--accent-color); }
        .template-tip { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-secondary); }

        .save-button { display: flex; align-items: center; gap: 0.75rem; background: var(--accent-color); border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .save-button:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 10px 20px rgba(123, 44, 191, 0.3); }
        .save-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .premium-status-card { background: linear-gradient(135deg, rgba(123, 44, 191, 0.15), rgba(60, 9, 108, 0.15)); border: 1px solid rgba(123, 44, 191, 0.3); border-radius: 20px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .premium-header { display: flex; gap: 1rem; align-items: center; }
        .premium-icon { color: #ffb703; }
        .expiry-date { font-size: 1.2rem; font-weight: 700; margin: 0; }
        .upgrade-btn { width: 100%; background: #ffb703; color: #3c096c; border: none; padding: 0.75rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }

        /* Redeem Card Styling */
        .redeem-card {
          margin-top: 1rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .card-header-compact { display: flex; align-items: center; gap: 10px; }
        .card-header-compact h4 { margin: 0; font-size: 1rem; font-weight: 800; }
        .zap-icon { color: var(--accent-color); }
        .card-hint { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; }
        .redeem-form { display: flex; flex-direction: column; gap: 10px; }
        .redeem-input {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          color: white;
          font-family: monospace;
          font-size: 0.9rem;
          outline: none;
          text-align: center;
        }
        .redeem-input:focus { border-color: var(--accent-color); }
        .redeem-btn {
          background: var(--accent-color);
          border: none;
          color: white;
          padding: 0.6rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .redeem-btn:hover:not(:disabled) { filter: brightness(1.1); transform: scale(1.02); }
        .redeem-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          padding: 8px;
          border-radius: 8px;
        }
        .redeem-status.success { background: rgba(34, 197, 94, 0.1); color: #4ade80; }
        .redeem-status.error { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        .btn-loader-small {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 968px) { .settings-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="loading-container"><div className="loader"></div></div>}>
      <SettingsContent />
    </Suspense>
  );
}
