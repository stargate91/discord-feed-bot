"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Globe,
  Hash,
  Shield,
  Crown,
  Save,
  CheckCircle,
  AlertTriangle,
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
import { useConfig } from '@/hooks/useConfig';

// --- PLATFORM CONFIG ---
const PLATFORMS = [
  { id: 'twitch', name: 'Twitch', icon: '/emojis/twitch.png', tags: ['{name}', '{game}', '{title}', '{viewers}', '{platform}'] },
  { id: 'kick', name: 'Kick', icon: '/emojis/kick.png', tags: ['{name}', '{game}', '{title}', '{viewers}', '{platform}'] },
  { id: 'youtube', name: 'YouTube', icon: '/emojis/youtube.png', tags: ['{name}', '{title}'] },
  { id: 'rss', name: 'RSS Feed', icon: '/emojis/rss.png', tags: ['{name}', '{author}', '{title}', '{description}'] },
  { id: 'steam_news', name: 'Steam News', icon: '/emojis/steam.png', tags: ['{name}', '{author}', '{title}'] },
  { id: 'epic_games', name: 'Epic Games', icon: '/emojis/epic-games.png', tags: ['{name}', '{title}'] },
  { id: 'crypto', name: 'Crypto Alerts', icon: '/emojis/crypto.png', tags: ['{name}', '{price}', '{threshold}', '{direction}', '{percent}'] },
  { id: 'steam_free', name: 'Steam Free', icon: '/emojis/steam.png', tags: ['{name}', '{title}'] },
  { id: 'gog_free', name: 'GOG Free', icon: '/emojis/gog.png', tags: ['{name}', '{title}'] },
  { id: 'movie', name: 'Movies', icon: '/emojis/tmdb.png', tags: ['{name}', '{title}', '{rating}', '{year}'] },
  { id: 'tv_series', name: 'TV Series', icon: '/emojis/tmdb.png', tags: ['{name}', '{title}', '{rating}', '{year}'] },
];

const TAG_DESCRIPTIONS = {
  '{name}': 'Platform, Channel or Monitor name',
  '{title}': 'Content title, Stream title or Video title',
  '{description}': 'Short summary or description (mostly RSS)',
  '{price}': 'Current cryptocurrency price (USD)',
  '{threshold}': 'The price limit you set',
  '{direction}': 'Up or Down direction emoji',
  '{percent}': 'Percentage difference from threshold',
  '{game}': 'The game currently being played',
  '{viewers}': 'Current viewer count',
  '{platform}': 'Platform name (Twitch or Kick)',
  '{author}': 'Author or creator name (RSS/Steam)',
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
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); z-index: 9999; overflow: hidden;
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
  const { config, getTierConfig, hasFeature } = useConfig();
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = searchParams.get('guild');

  const [settings, setSettings] = useState({
    language: 'en',
    admin_role_id: '0',
    refresh_interval: 20,
    alert_templates: {},
    custom_branding: null,
    isMaster: false,
    tier: 0,
    premium_until: null,
    hasStripeSubscription: false
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Redemption State
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
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

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to open billing portal' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'An error occurred' });
    }
    setPortalLoading(false);
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

  if (loading || !config) return <div className="loading-container"><div className="loader"></div></div>;

  const isPremiumActive = settings.isMaster || (settings.premium_until && new Date(settings.premium_until) > new Date());
  const currentTierConfig = getTierConfig(settings.tier, settings.isMaster);
  const minInterval = currentTierConfig.min_refresh_interval || 20;

  const currentPlatform = PLATFORMS.find(p => p.id === activePlatform);

  return (
    <div className="settings-container">
      <header className="header" style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '900', letterSpacing: '-1px' }}>Server Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Adjust bot preferences, management roles, and custom alert templates.
          </p>
        </div>

        <button className="save-button" onClick={handleSave} disabled={saving} style={{ padding: '0.8rem 2rem', fontSize: '1rem', borderRadius: '14px' }}>
          {saving ? <div className="button-loader"></div> : <Save size={20} />}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </header>

      {notification && (
        <div className={`notification-banner ${notification.type}`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="settings-grid">
        <div className="settings-main">
          {/* 1. Language */}
          <SettingCard title="System Language" description="Select the language Nova uses for automated messages and alerts on your Discord server. This does not affect the dashboard's interface." icon={Globe}>
            <div className="language-toggle">
              <button className={`lang-btn ${settings.language === 'en' ? 'active' : ''}`} onClick={() => setSettings({ ...settings, language: 'en' })}>
                <img src="https://flagcdn.com/w40/gb.png" alt="English" className="flag-icon-img" />
                <span>English</span>
              </button>
              <button className={`lang-btn ${settings.language === 'hu' ? 'active' : ''}`} onClick={() => setSettings({ ...settings, language: 'hu' })}>
                <img src="https://flagcdn.com/w40/hu.png" alt="Magyar" className="flag-icon-img" />
                <span>Magyar</span>
              </button>
            </div>
          </SettingCard>

          {/* 2. Management Role */}
          <SettingCard 
            title="Management Role" 
            description="Specify which Discord role is authorized to manage Nova's feeds and settings. Server owners and Administrators have access by default." 
            icon={Shield}
            style={{ zIndex: 10 }}
          >
            <CustomRoleSelect roles={roles} value={settings.admin_role_id} onChange={(newId) => setSettings({ ...settings, admin_role_id: newId })} />
          </SettingCard>

          {/* 3. Refresh Interval */}
          <SettingCard 
            title="Refresh Frequency" 
            description="Controls how often Nova checks your feeds for new content. Lower values mean faster notifications but require a higher tier." 
            icon={Clock}
          >
            <div className="interval-input-wrapper">
              <div className="number-input-container">
                <input 
                  type="number" 
                  className="interval-number-input" 
                  min={minInterval} 
                  max={1440} 
                  value={settings.refresh_interval} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || minInterval;
                    setSettings({ ...settings, refresh_interval: Math.max(val, minInterval) });
                  }} 
                />
                <span className="unit-label">minutes</span>
              </div>

              <div className="speed-tiers">
                {Object.entries(config.tier_config || {}).map(([tId, tCfg]) => (
                  <button 
                    key={tId}
                    className={`speed-chip ${settings.refresh_interval === tCfg.min_refresh_interval ? 'active' : ''} ${tCfg.min_refresh_interval < minInterval ? 'locked' : ''}`}
                    onClick={() => {
                      if (tCfg.min_refresh_interval >= minInterval) {
                        setSettings({ ...settings, refresh_interval: tCfg.min_refresh_interval });
                      }
                    }}
                    title={tCfg.min_refresh_interval < minInterval ? `Requires ${tCfg.name} tier or higher` : `Set to ${tCfg.min_refresh_interval}m`}
                  >
                    {tCfg.min_refresh_interval < minInterval && <Lock size={10} />}
                    {tCfg.min_refresh_interval}m
                  </button>
                ))}
              </div>

              {settings.refresh_interval < minInterval && (
                <div className="upgrade-nudge">
                  <Zap size={14} />
                  <span>Your <strong>{currentTierConfig.name}</strong> plan allows a minimum of <strong>{minInterval}m</strong>.</span>
                  <Link href={`/premium?guild=${guildId}`}>
                    <button className="nudge-upgrade-btn">Go Faster</button>
                  </Link>
                </div>
              )}
            </div>
          </SettingCard>

          {/* 4. Alert Templates */}
          <SettingCard title="Alert Templates" description="Craft unique message formats for each platform using dynamic tags." icon={MessageSquare}>
            {!hasFeature(settings.tier, settings.isMaster, "alert_template") ? (
              <div className="premium-lock-overlay">
                <Lock size={32} />
                <p>Available for Professional Tier & above</p>
                <Link href={`/premium?guild=${guildId}`}>
                  <button className="upgrade-btn-small">Upgrade Now</button>
                </Link>
              </div>
            ) : (
              <div className="template-editor-wrapper">
                <div className="platform-tabs-container">
                  <div className="platform-tabs">
                    {PLATFORMS.map(p => (
                      <button 
                        key={p.id} 
                        className={`platform-tab ${activePlatform === p.id ? 'active' : ''}`} 
                        onClick={() => setActivePlatform(p.id)}
                      >
                        {p.icon && (
                          <img 
                            src={p.icon} 
                            alt="" 
                            className="tab-icon-img"
                            style={{ filter: activePlatform === p.id ? 'none' : 'grayscale(1) opacity(0.6)' }} 
                          />
                        )}
                        {p.name}
                      </button>
                    ))}
                  </div>
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
                </div>
              </div>
            )}
          </SettingCard>

          {/* 5. Custom Branding */}
          <SettingCard title="Custom Branding (Footer)" description="Override or remove the 'Delivered by Nova' footer." icon={Crown}>
            {!hasFeature(settings.tier, settings.isMaster, "remove_branding") ? (
              <div className="premium-lock-overlay">
                <Lock size={32} />
                <p>Available for Starter Tier & above</p>
                <Link href={`/premium?guild=${guildId}`}>
                  <button className="upgrade-btn-small">Upgrade Now</button>
                </Link>
              </div>
            ) : (
              <div className="branding-input-wrapper">
                <input
                  type="text"
                  className="branding-input"
                  placeholder="Leave empty to hide footer..."
                  value={settings.custom_branding !== null ? settings.custom_branding : ""}
                  onChange={(e) => setSettings({ ...settings, custom_branding: e.target.value })}
                />
              </div>
            )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                  <div>
                    <p className="expiry-label">Access Level:</p>
                    <p className="expiry-date">{settings.isMaster ? 'LIFETIME' : new Date(settings.premium_until).toLocaleDateString()}</p>
                  </div>
                  {!settings.isMaster && settings.hasStripeSubscription && (
                    <button className="manage-sub-btn" onClick={handleManageSubscription} disabled={portalLoading}>
                      {portalLoading ? '...' : 'Manage'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <Link href={`/premium?guild=${guildId}`}>
                <button className="upgrade-btn">Upgrade to Premium</button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-container { max-width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
        .notification-banner { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; border-radius: 12px; animation: slideIn 0.3s ease-out; }
        .notification-banner.success { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #4ade80; }
        .notification-banner.error { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #f87171; }
        .settings-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 2rem; }
        .settings-main { display: flex; flex-direction: column; gap: 1.5rem; }
        .language-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .lang-btn { display: flex; align-items: center; justify-content: center; gap: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0.75rem; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-weight: 600; }
        .lang-btn.active { background: rgba(123, 44, 191, 0.15); border-color: var(--accent-color); color: white; }
        .flag-icon-img { width: 22px; height: 16px; object-fit: cover; border-radius: 2px; }
        .number-input-container { display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 0.75rem 1rem; width: fit-content; }
        .interval-number-input { background: none; border: none; color: white; font-size: 1.1rem; font-weight: 600; width: 80px; outline: none; }
        .unit-label { color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; }
        .interval-input-wrapper { display: flex; flex-direction: column; gap: 1.25rem; }
        .speed-tiers { display: flex; flex-wrap: wrap; gap: 8px; }
        .speed-chip { 
          display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; 
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); 
          color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-size: 0.8rem; font-weight: 700;
        }
        .speed-chip.active { background: var(--accent-color); border-color: transparent; color: white; box-shadow: 0 4px 12px var(--accent-glow); }
        .speed-chip.locked { opacity: 0.5; cursor: not-allowed; border-style: dashed; }
        .premium-lock-overlay { padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1); color: var(--text-secondary); }
        .upgrade-btn-small { background: var(--accent-color); border: none; color: white; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .template-editor-wrapper { display: flex; flex-direction: column; gap: 1.5rem; }
        .platform-tabs { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
        .platform-tab { padding: 8px 16px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: var(--text-secondary); cursor: pointer; transition: all 0.3s; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .platform-tab.active { background: var(--accent-color); color: white; box-shadow: 0 8px 20px var(--accent-glow); }
        .template-textarea { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: white; min-height: 120px; font-family: 'Inter', sans-serif; resize: vertical; outline: none; }
        .premium-status-card { background: linear-gradient(135deg, rgba(123, 44, 191, 0.1) 0%, rgba(60, 9, 108, 0.05) 100%); border: 1px solid rgba(123, 44, 191, 0.2); border-radius: 24px; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .premium-icon { width: 48px; height: 48px; background: rgba(255, 183, 3, 0.1); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #ffb703; }
        .upgrade-btn { width: 100%; background: #ffb703; color: #3c096c; border: none; padding: 1rem; border-radius: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 20px rgba(255, 183, 3, 0.2); }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
