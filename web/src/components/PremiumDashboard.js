"use client";

import { useState, useEffect } from 'react';
import PricingCard from '@/components/PricingCard';
import { tiers } from '@/lib/premium-data';
import styles from './Premium.module.css';

import LoginButton from '@/components/LoginButton';

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
    <div className={styles.premiumDashboardContainer}>
      <header className="ui-dashboard-header">
        <div className="ui-dashboard-info">
          <h1 className="ui-dashboard-title">Premium Plans</h1>
          <p className="ui-dashboard-subtitle">
            Manage your server's premium status and unlock advanced features.
          </p>
        </div>

        <div className="page-header-actions">
          <LoginButton session={session} />
        </div>
      </header>

      <div className="ui-billing-toggle-wrapper">
        <div className="ui-billing-toggle">
          <button 
            onClick={() => setBillingInterval('mo')} 
            className={billingInterval === 'mo' ? 'ui-active' : ''}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingInterval('yr')} 
            className={billingInterval === 'yr' ? 'ui-active' : ''}
          >
            Yearly <span className="ui-billing-save">SAVE 20%</span>
          </button>
        </div>
      </div>

      <div className={styles.dashboardPricingGrid}>
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


    </div>
  );
}
