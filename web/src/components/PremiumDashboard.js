"use client";

import { useState, useEffect } from 'react';
import PricingCard from '@/components/PricingCard';
import { tiers } from '@/lib/premium-data';

export default function PremiumDashboard({ guildId, session }) {
  const [billingInterval, setBillingInterval] = useState('mo');
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
    window.location.href = `http://localhost:8080/checkout?guild_id=${guildId}&tier=${tier}&interval=${billingInterval}`;
  };

  return (
    <div className="premium-dashboard-container">
      <header className="dashboard-header">
        <div className="header-text">
          <h2>Premium Plans</h2>
          <p>Manage your server's premium status and unlock advanced features.</p>
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
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
          gap: 2rem;
        }
        .header-text h2 { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; color: white; }
        .header-text p { color: #a0a0b0; font-size: 0.95rem; }

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
