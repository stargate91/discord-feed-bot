"use client";

import { useState, useEffect } from 'react';
import PricingCard from '@/components/PricingCard';
import { tiers } from '@/lib/premium-data';

export default function PremiumDashboard({ guildId, session }) {
  const [billingInterval, setBillingInterval] = useState('mo');
  const [currentTier, setCurrentTier] = useState(0);
  const [isMaster, setIsMaster] = useState(false);
  const [stripeConfig, setStripeConfig] = useState(null);

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

    // Fetch billing config
    fetch('/api/billing/config')
      .then(res => res.json())
      .then(data => setStripeConfig(data))
      .catch(err => console.error("Failed to fetch billing config:", err));
  }, [guildId]);

  const [checkoutLoading, setCheckoutLoading] = useState(null); // stores the tier being loaded

  const handlePurchaseClick = async (tier) => {
    if (!stripeConfig?.products) {
      alert("Billing configuration not loaded. Please refresh the page.");
      return;
    }

    // Find the priceId that matches this tier and interval
    const priceId = Object.keys(stripeConfig.products).find(pid => {
      const p = stripeConfig.products[pid];
      return p.tier === tier && p.interval === billingInterval;
    });

    if (!priceId) {
      alert(`No Price ID found for this plan. Please contact support.`);
      return;
    }

    setCheckoutLoading(tier);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, guildId })
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("An error occurred. Please try again.");
    }
    setCheckoutLoading(null);
  };

  return (
    <div className="premium-dashboard-container">
      <header className="header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2>Premium Plans</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage your server's premium status and unlock advanced features.
          </p>
        </div>

        <div className="billing-toggle-container">
          <button onClick={() => setBillingInterval('mo')} className={billingInterval === 'mo' ? 'active' : ''}>Monthly</button>
          <button onClick={() => setBillingInterval('yr')} className={billingInterval === 'yr' ? 'active' : ''}>
            Yearly <span className="save-badge">SAVE 20%</span>
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
            isLoading={checkoutLoading === t.tier}
          />
        ))}
      </div>

      <style jsx>{`
        .premium-dashboard-container {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
          padding: 2rem 1rem 5rem;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          width: 100%;
        }

        .billing-toggle-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 5px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .billing-toggle-container button {
          padding: 8px 20px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #a0a0b0;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
        }
        .billing-toggle-container button.active {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }
        .save-badge {
          font-size: 0.6rem;
          background: rgba(123, 44, 191, 0.2);
          color: #9d4edd;
          padding: 1px 6px;
          border-radius: 8px;
          margin-left: 5px;
        }

        @media (max-width: 1000px) {
          .pricing-grid { grid-template-columns: repeat(2, 1fr); }
          .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
        }
        @media (max-width: 600px) {
          .pricing-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
