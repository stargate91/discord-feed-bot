"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import TemplateEditor from '@/components/TemplateEditor';
import LoginButton from '@/components/LoginButton';
import { useConfig } from '@/hooks/useConfig';
import { PLATFORMS, TAG_DESCRIPTIONS } from '@/lib/constants';
import settingsService from '@/services/settingsService';
import styles from './settings.module.css';

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
    <div className={styles.customSelectContainer} ref={dropdownRef}>
      <div
        className={`${styles.selectTrigger} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.selectedValue}>
          <div
            className={styles.roleDot}
            style={{ backgroundColor: selectedRole?.color || 'transparent', border: !selectedRole?.color ? '1px dashed rgba(255,255,255,0.3)' : 'none' }}
          ></div>
          <span className={!selectedRole ? styles.placeholder : ''}>
            {selectedRole ? selectedRole.name : "None (Owner & Admins only)"}
          </span>
        </div>
        <ChevronDown size={18} className={`${styles.chevron} ${isOpen ? styles.rotate : ''}`} />
      </div>

      {isOpen && (
        <div className={styles.selectDropdown}>
          <div className={styles.selectSearchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.selectSearchInput}
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          <div className={styles.selectOptions}>
            <div
              className={`${styles.selectOption} ${(value === '0' || !value) ? styles.active : ''}`}
              onClick={() => {
                onChange('0');
                setIsOpen(false);
              }}
            >
              <div className={`${styles.roleDot} ${styles.transparent}`}></div>
              <span>None (Owner & Admins only)</span>
            </div>

            {filteredRoles.map(role => (
              <div
                key={role.id}
                className={`${styles.selectOption} ${value === role.id ? styles.active : ''}`}
                onClick={() => {
                  onChange(role.id);
                  setIsOpen(false);
                }}
              >
                <div
                  className={styles.roleDot}
                  style={{ backgroundColor: role.color || '#99aab5' }}
                ></div>
                <span style={{ color: role.color || 'white' }}>{role.name}</span>
              </div>
            ))}

            {filteredRoles.length === 0 && search && (
              <div className={styles.selectNoResults}>No roles found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = searchParams.get('guild');

  const { config, getTierConfig, hasFeature } = useConfig();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [guildRoles, setGuildRoles] = useState([]);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const [settings, setSettings] = useState({
    language: "en",
    admin_role_id: "0",
    refresh_interval: 20,
    alert_templates: {},
    tier: 0,
    isMaster: false,
    hasStripeSubscription: false,
    custom_branding: null,
    premium_until: null
  });

  useEffect(() => {
    if (!guildId) {
      router.push('/select-server');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [sData, roles] = await Promise.all([
          settingsService.getSettings(guildId),
          settingsService.getRoles(guildId)
        ]);

        // Force isMaster if the ID matches (hardcoded safety fallback)
        if (guildId === "1083433370815582240") {
          sData.isMaster = true;
        }
        
        setSettings(sData);
        setGuildRoles(roles);
      } catch (error) {
        console.error("Failed to fetch settings data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId, router]);

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);

    try {
      await settingsService.updateSettings(guildId, settings);
      setNotification({ type: 'success', message: 'Settings updated successfully!' });
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      setNotification({ type: 'error', message: error.message || 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const url = await settingsService.getBillingPortalUrl(guildId);
      window.location.href = url;
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: 'Failed to open billing portal.' });
    }
    setPortalLoading(false);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      const res = await fetch('/api/premium/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode, guildId })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Code redeemed successfully!' });
        setRedeemCode('');
        
        // Refresh settings to reflect new premium status
        const sData = await settingsService.getSettings(guildId);
        if (guildId === "1083433370815582240") {
          sData.isMaster = true;
        }
        setSettings(sData);
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to redeem code' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Network error occurred.' });
    }
    setRedeeming(false);
  };

  const updateTemplate = (platform, val) => {
    setSettings({
      ...settings,
      alert_templates: {
        ...settings.alert_templates,
        [platform]: val
      }
    });
  };

  if (loading || !config) return <div className="loading-container"><div className="loader"></div></div>;

  const isPremiumActive = settings.isMaster || (settings.premium_until && new Date(settings.premium_until) > new Date());
  const currentTierConfig = getTierConfig(settings.tier, settings.isMaster);
  const minInterval = currentTierConfig.min_refresh_interval || 20;

  return (
    <div className={styles.settingsContainer}>
      <header className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Server Settings</h1>
          <p className="page-subtitle">
            Adjust bot preferences, management roles, and custom alert templates to match your server's identity.
          </p>
        </div>

        <div className="page-header-actions">
          <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
            {saving ? <div className={styles.buttonLoader}></div> : <Save size={18} />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
          <LoginButton session={session} />
        </div>
      </header>

      {notification && (
        <div className={`${styles.notificationBanner} ${styles[notification.type]}`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className={styles.settingsGrid}>
        <div className={styles.settingsMain}>
          {/* 1. Language */}
          <SettingCard title="Bot Language" description="Select the language for all bot responses and messages." icon={Globe}>
            <div className={styles.languageToggle}>
              <button
                className={`${styles.langBtn} ${settings.language === 'en' ? styles.active : ''}`}
                onClick={() => setSettings({ ...settings, language: 'en' })}
              >
                <span style={{ fontSize: '1.2rem' }}>🇬🇧</span>
                <span>English</span>
              </button>
              <button
                className={`${styles.langBtn} ${settings.language === 'hu' ? styles.active : ''}`}
                onClick={() => setSettings({ ...settings, language: 'hu' })}
              >
                <span style={{ fontSize: '1.2rem' }}>🇭🇺</span>
                <span>Magyar</span>
              </button>
            </div>
          </SettingCard>

          {/* 2. Admin Role */}
          <SettingCard title="Management Role" description="Members with this role can manage the bot without Server Admin permissions." icon={Shield} style={{ zIndex: 100 }}>
            <CustomRoleSelect
              roles={guildRoles}
              value={settings.admin_role_id}
              onChange={(val) => setSettings({ ...settings, admin_role_id: val })}
            />
          </SettingCard>

          {/* 3. Refresh Interval */}
          <SettingCard title="Refresh Interval" description="How often the bot checks for new content (e.g., every 20 minutes)." icon={Clock}>
            <div className={styles.intervalInputWrapper}>
              <div className={styles.numberInputContainer}>
                <input
                  type="number"
                  min={minInterval}
                  max={1440}
                  className={styles.intervalNumberInput}
                  value={settings.refresh_interval}
                  onChange={(e) => setSettings({ ...settings, refresh_interval: parseInt(e.target.value) })}
                />
                <span className={styles.unitLabel}>minutes</span>
              </div>

              <div className={styles.speedTiers}>
                {[20, 10, 5, 2].map(speed => {
                  const isLocked = speed < minInterval;
                  return (
                    <div
                      key={speed}
                      className={`${styles.speedChip} ${settings.refresh_interval === speed ? styles.active : ''} ${isLocked ? styles.locked : ''}`}
                      onClick={() => !isLocked && setSettings({ ...settings, refresh_interval: speed })}
                    >
                      {isLocked && <Lock size={12} />}
                      {speed}m
                    </div>
                  );
                })}
              </div>
            </div>
          </SettingCard>

          {/* 4. Alert Templates */}
          <SettingCard title="Alert Templates" description="Craft unique message formats for each platform using dynamic tags." icon={MessageSquare}>
            <TemplateEditor
              templates={settings.alert_templates}
              onUpdate={updateTemplate}
              isLocked={!hasFeature(settings.tier, settings.isMaster || guildId === "1083433370815582240", "alert_template")}
              guildId={guildId}
              styles={styles}
            />
          </SettingCard>

          {/* 5. Custom Branding */}
          <SettingCard title="Custom Branding (Footer)" description="Override or remove the 'Delivered by Nova' footer." icon={Crown}>
            {!hasFeature(settings.tier, settings.isMaster || guildId === "1083433370815582240", "remove_branding") ? (
              <div className={styles.premiumLockOverlay}>
                <Lock size={32} />
                <p>Available for Starter Tier & above</p>
                <Link href={`/premium?guild=${guildId}`}>
                  <button className={styles.upgradeBtnSmall}>Upgrade Now</button>
                </Link>
              </div>
            ) : (
              <div className={styles.brandingModeContainer}>
                <div className={styles.brandingModeGrid}>
                  <div 
                    className={`${styles.brandingModeCard} ${settings.custom_branding === null ? styles.active : ''}`}
                    onClick={() => setSettings({ ...settings, custom_branding: null })}
                  >
                    <div className={styles.brandingModeText}>
                      <h4>Default</h4>
                      <p>{settings.language === 'hu' ? 'Készítette: Nova' : 'Delivered by Nova'}</p>
                    </div>
                  </div>

                  <div 
                    className={`${styles.brandingModeCard} ${settings.custom_branding === "" ? styles.active : ''}`}
                    onClick={() => setSettings({ ...settings, custom_branding: "" })}
                  >
                    <div className={styles.brandingModeText}>
                      <h4>Hidden</h4>
                    </div>
                  </div>

                  <div 
                    className={`${styles.brandingModeCard} ${settings.custom_branding !== null && settings.custom_branding !== "" ? styles.active : ''}`}
                    onClick={() => {
                      if (settings.custom_branding === null || settings.custom_branding === "") {
                        setSettings({ ...settings, custom_branding: "My Custom Footer" });
                      }
                    }}
                  >
                    <div className={styles.brandingModeText}>
                      <h4>Custom</h4>
                    </div>
                  </div>
                </div>

                {settings.custom_branding !== null && settings.custom_branding !== "" && (
                  <div className={styles.brandingInputWrapper} style={{ marginTop: '1.5rem', animation: 'slideIn 0.3s ease-out' }}>
                    <input
                      type="text"
                      className={styles.brandingInput}
                      placeholder={settings.language === 'hu' ? "Saját lábléc szövege..." : "Custom footer text..."}
                      value={settings.custom_branding}
                      onChange={(e) => setSettings({ ...settings, custom_branding: e.target.value })}
                      autoFocus
                    />
                    <div className={styles.markdownHint}>
                      <Info size={14} className={styles.infoIcon} />
                      <span>Supports formatting: **bold**, *italic*, [Link Text](https://url.com)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SettingCard>
        </div>

        <div className={styles.settingsSidebar}>
          <div className={`${styles.premiumStatusCard} ${isPremiumActive ? styles.premiumActive : ''}`}>
            <div className={styles.premiumHeader}>
              <div className={styles.premiumIcon}><Crown size={24} /></div>
              <div>
                <h4>Premium Status</h4>
                <p>{settings.isMaster ? 'Master Server (Lifetime)' : (settings.premium_until ? 'Active Subscription' : 'Free Tier')}</p>
              </div>
            </div>
            {isPremiumActive ? (
              <div className={styles.premiumDetails}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                  <div>
                    <p className={styles.expiryLabel}>Access Level:</p>
                    <p className={styles.expiryDate}>{settings.isMaster ? 'LIFETIME' : new Date(settings.premium_until).toLocaleDateString()}</p>
                  </div>
                  {!settings.isMaster && settings.hasStripeSubscription && (
                    <button className={styles.manageSubBtn} onClick={handleManageSubscription} disabled={portalLoading}>
                      {portalLoading ? '...' : 'Manage'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <Link href={`/premium?guild=${guildId}`}>
                <button className={styles.upgradeBtn}>Upgrade to Premium</button>
              </Link>
            )}
          </div>

          <div className={`${styles.premiumStatusCard} ${styles.redeemCard}`} style={{ marginTop: '1.5rem' }}>
            <div className={styles.premiumHeader} style={{ marginBottom: '1rem' }}>
              <div className={styles.redeemIcon}><Zap size={24} /></div>
              <div>
                <h4>Redeem Code</h4>
                <p>Activate a premium gift or promo code.</p>
              </div>
            </div>
            <div className={styles.redeemInputWrapper}>
              <input 
                type="text" 
                placeholder="NOVA-XXXX-XXXX" 
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className={styles.redeemInput}
              />
              <button 
                onClick={handleRedeem} 
                disabled={redeeming || !redeemCode.trim()}
                className={styles.redeemBtn}
              >
                {redeeming ? '...' : 'Redeem'}
              </button>
            </div>
          </div>
        </div>
      </div>
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
