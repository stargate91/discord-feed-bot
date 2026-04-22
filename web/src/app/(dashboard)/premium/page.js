"use client";

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PricingCard from '@/components/PricingCard';
import { Sparkles } from 'lucide-react';

function PremiumContent() {
  const searchParams = useSearchParams();
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
        { text: "Basic Bot Support" },
        { text: "Bulk Actions", disabled: true },
        { text: "Advanced Filters", disabled: true }
      ]
    },
    {
      tier: 1,
      title: "Scout",
      description: "Getting serious",
      price: { mo: "3.99", yr: "39" },
      isPopular: false,
      features: [
        { text: "25 Feed Monitors" },
        { text: "2 min Refresh Rate" },
        { text: "5 Target Channels" },
        { text: "5 Ping Roles" },
        { text: "Bulk Pause/Start" },
        { text: "Crypto & Repost Mon." },
        { text: "Standard Support" }
      ]
    },
    {
      tier: 2,
      title: "Operator",
      description: "Power user favorite",
      price: { mo: "7.99", yr: "79" },
      isPopular: true,
      features: [
        { text: "50 Feed Monitors" },
        { text: "2 min Refresh Rate" },
        { text: "10 Target Channels" },
        { text: "10 Ping Roles" },
        { text: "Bulk Pause/Start" },
        { text: "Custom Alert Templates" },
        { text: "Priority Support" }
      ]
    },
    {
      tier: 3,
      title: "Architect",
      description: "The ultimate control",
      price: { mo: "14.99", yr: "149" },
      isPopular: false,
      features: [
        { text: "100 Feed Monitors" },
        { text: "2 min Refresh Rate" },
        { text: "15 Target Channels" },
        { text: "15 Ping Roles" },
        { text: "Bulk Actions (All)" },
        { text: "Language & Genre Filters" },
        { text: "24/7 Dedicated Support" }
      ]
    }
  ];

  return (
    <div className="premium-page-container">
      <header className="header" style={{ marginBottom: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '10px', 
          background: 'rgba(123, 44, 191, 0.1)', padding: '8px 16px', 
          borderRadius: '30px', border: '1px solid rgba(123, 44, 191, 0.2)',
          marginBottom: '1.5rem', color: 'var(--accent-color)', fontSize: '0.9rem', fontWeight: '700'
        }}>
          <Sparkles size={16} />
          <span>UPGRADE YOUR EXPERIENCE</span>
        </div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1.5rem', letterSpacing: '-1.5px', background: 'linear-gradient(to right, #fff, #a0a0b0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Select your plan
        </h1>
        
        {/* Billing Toggle */}
        <div className="billing-toggle-container" style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          background: 'rgba(255, 255, 255, 0.03)', padding: '6px',
          borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)',
          marginTop: '1rem'
        }}>
          <button 
            onClick={() => setBillingInterval('mo')}
            style={{
              padding: '10px 24px', borderRadius: '12px', border: 'none',
              background: billingInterval === 'mo' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: billingInterval === 'mo' ? 'white' : '#777',
              fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingInterval('yr')}
            style={{
              padding: '10px 24px', borderRadius: '12px', border: 'none',
              background: billingInterval === 'yr' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: billingInterval === 'yr' ? 'white' : '#777',
              fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            Yearly
            <span style={{ fontSize: '0.65rem', background: 'rgba(123, 44, 191, 0.2)', color: 'var(--accent-color)', padding: '2px 8px', borderRadius: '10px' }}>SAVE 20%</span>
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
            href={`http://localhost:8080/checkout?guild_id=${guildId || ''}&tier=${t.tier}&interval=${billingInterval}`}
          />
        ))}
      </div>

      <style jsx>{`
        .premium-page-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 4rem 2rem 8rem 2rem;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
          justify-items: center;
          margin-top: 2rem;
        }
        @media (max-width: 768px) {
          .premium-page-container { padding: 2rem 1rem; }
          .pricing-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<div className="loading-container"><div className="loader"></div></div>}>
      <PremiumContent />
    </Suspense>
  );
}
