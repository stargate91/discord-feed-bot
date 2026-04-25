"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import PricingCard from '@/components/PricingCard';
import { Sparkles } from 'lucide-react';
import LoginButton from '@/components/LoginButton';

export default function PremiumContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const guildId = searchParams.get('guild');
  const [billingInterval, setBillingInterval] = useState('mo'); // 'mo' or 'yr'
  const [currentTier, setCurrentTier] = useState(0);
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    if (guildId) {
      fetch(`/api/guilds/${guildId}/settings`)
        .then(res => res.json())
        .then(data => {
          if (data.tier !== undefined) setCurrentTier(data.tier);
          if (data.isMaster !== undefined) setIsMaster(data.isMaster);
        })
        .catch(err => console.error("Failed to fetch current tier:", err));
    }
  }, [guildId]);

  const handlePurchaseClick = (tier) => {
    if (status === 'loading') return;

    if (!session) {
      signIn('discord');
      return;
    }

    if (!guildId) {
      router.push('/select-server');
      return;
    }

    window.location.href = `http://localhost:8080/checkout?guild_id=${guildId}&tier=${tier}&interval=${billingInterval}`;
  };

  const tiers = [
    {
      tier: 0,
      title: "Free",
      description: "For small communities",
      price: { mo: "0", yr: "0" },
      features: [
        { text: "5 Feed Monitors" },
        { text: "20 min Refresh Rate" },
        { text: "1 Target Channel" },
        { text: "1 Ping Role" },
        { text: "Bulk Actions (All)", disabled: true },
        { text: "Language & Genre Filters", disabled: true },
        { text: "Crypto & Repost Mon.", disabled: true },
        { text: "Custom Alert Templates", disabled: true }
      ]
    },
    {
      tier: 1,
      title: "Starter",
      description: "Getting serious",
      price: { mo: "3.99", yr: "39" },
      isPopular: false,
      features: [
        { text: "25 Feed Monitors" },
        { text: "2 min Refresh Rate" },
        { text: "5 Target Channels" },
        { text: "5 Ping Roles" },
        { text: "Bulk Actions (All)" },
        { text: "Language & Genre Filters" },
        { text: "Crypto & Repost Mon." },
        { text: "Custom Alert Templates" }
      ]
    },
    {
      tier: 2,
      title: "Professional",
      description: "Power user favorite",
      price: { mo: "9.99", yr: "99" },
      isPopular: true,
      features: [
        { text: "50 Feed Monitors" },
        { text: "2 min Refresh Rate" },
        { text: "10 Target Channels" },
        { text: "10 Ping Roles" },
        { text: "Bulk Actions (All)" },
        { text: "Language & Genre Filters" },
        { text: "Crypto & Repost Mon." },
        { text: "Custom Alert Templates" }
      ]
    },
    {
      tier: 3,
      title: "Ultimate",
      description: "The ultimate control",
      price: { mo: "19.99", yr: "199" },
      isPopular: false,
      features: [
        { text: "100 Feed Monitors" },
        { text: "2 min Refresh Rate" },
        { text: "15 Target Channels" },
        { text: "15 Ping Roles" },
        { text: "Bulk Actions (All)" },
        { text: "Language & Genre Filters" },
        { text: "Crypto & Repost Mon." },
        { text: "Custom Alert Templates" }
      ]
    }
  ];

  return (
    <div className={`premium-root ${!guildId ? 'is-marketing' : ''}`}>
      {!guildId && (
        <nav className="lp-navbar">
          <div className="lp-navbar-inner">
            <a href="/" className="lp-brand">
              <img src="/nova_v2.jpg" alt="NovaFeeds" className="lp-brand-img" />
              <span className="lp-brand-text">NovaFeeds</span>
            </a>
            <div className="lp-nav-links">
              <a href="/" className="lp-nav-link">Home</a>
              <a href="/premium" className="lp-nav-link">Premium</a>
              <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer" className="lp-nav-link">Support</a>
            </div>
            <div className="lp-nav-right">
              <LoginButton session={session} />
            </div>
          </div>
        </nav>
      )}

      <div className={`premium-page-container ${!guildId ? 'is-landing' : ''}`}>
        <div style={{ paddingTop: !guildId ? '6rem' : '0' }}>
          <header className={`header ${!guildId ? 'marketing-header' : ''}`} style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: !guildId ? 'center' : 'flex-start', textAlign: !guildId ? 'center' : 'left' }}>
              {!guildId && (
                <div className="sparkle-badge">
                  <Sparkles size={16} />
                  <span>UPGRADE YOUR EXPERIENCE</span>
                </div>
              )}
              <h2>{guildId ? 'Premium Plans' : 'Select your plan'}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Upgrade your experience with advanced features and higher limits tailored for your community.
              </p>
            </div>

            <div className="billing-toggle-container">
              <button
                onClick={() => setBillingInterval('mo')}
                className={billingInterval === 'mo' ? 'active' : ''}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yr')}
                className={billingInterval === 'yr' ? 'active' : ''}
              >
                Yearly
                <span className="save-badge">SAVE 20%</span>
              </button>
            </div>
          </header>

          <div className="pricing-grid">
            {tiers.map((t) => (
              <PricingCard
                key={t.tier}
                tier={t.tier}
                currentTier={currentTier}
                isMaster={isMaster}
                title={t.title}
                description={t.description}
                price={billingInterval === 'mo' ? t.price.mo : t.price.yr}
                interval={billingInterval === 'mo' ? 'mo' : 'yr'}
                isPopular={t.isPopular}
                features={t.features}
                onPurchaseClick={() => handlePurchaseClick(t.tier)}
              />
            ))}
          </div>
        </div>
      </div>

      {!guildId && (
        <footer className="lp-footer" style={{ marginTop: '6rem' }}>
          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <img src="/nova_v2.jpg" alt="NovaFeeds" className="lp-footer-logo" />
              <div>
                <div className="lp-footer-name">NovaFeeds</div>
                <p className="lp-footer-desc">Your friendly neighborhood Discord feed bot.</p>
              </div>
            </div>
            <div className="lp-footer-col">
              <h4>Product</h4>
              <a href="/dashboard">Dashboard</a>
              <a href="/premium">Premium</a>
            </div>
            <div className="lp-footer-col">
              <h4>Resources</h4>
              <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer">Support Server</a>
              <a href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=8&scope=bot%20applications.commands`} target="_blank" rel="noopener noreferrer">Invite Bot</a>
            </div>
            <div className="lp-footer-col">
              <h4>Legal</h4>
              <a href="/terms">Terms of Service</a>
              <a href="/privacy">Privacy Policy</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} NovaFeeds. All rights reserved.</span>
          </div>
        </footer>
      )}
    </div>
  );
}
