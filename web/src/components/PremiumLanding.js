"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import PricingCard from '@/components/PricingCard';
import { Sparkles } from 'lucide-react';
import LoginButton from '@/components/LoginButton';
import MarketingNavbar from '@/components/MarketingNavbar';
import { tiers } from '@/lib/premium-data';
import styles from './Premium.module.css';

export default function PremiumLanding({ session }) {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState('mo');

  const handlePurchaseClick = (tier) => {
    if (!session) {
      signIn('discord');
      return;
    }
    router.push('/select-server');
  };

  return (
    <div className={`${styles.premiumLandingRoot} ui-full-width-content`}>
      {/* ── Navbar ── */}
      <MarketingNavbar session={session} />

      <div className={styles.landingContainer}>
        <header className={styles.marketingHeader}>
          <div className="ui-badge-neon">
            <Sparkles size={16} />
            <span>UPGRADE YOUR EXPERIENCE</span>
          </div>
          <h2 className="ui-title-hero" style={{ fontSize: '3.5rem', marginTop: '1.5rem' }}>Select your plan</h2>
          <p className="ui-text-lead">Upgrade your experience with advanced features and higher limits tailored for your community.</p>

          <div className={styles.billingSwitcherWrapper}>
            <div className={styles.dashboardBillingToggle}>
              <button onClick={() => setBillingInterval('mo')} className={billingInterval === 'mo' ? styles.active : ''}>Monthly</button>
              <button onClick={() => setBillingInterval('yr')} className={billingInterval === 'yr' ? styles.active : ''}>
                Yearly <span className={styles.saveBadge}>SAVE 20%</span>
              </button>
            </div>
          </div>
        </header>

        <div className={styles.pricingGrid}>
          {tiers.map((t) => (
            <PricingCard
              key={t.tier}
              tier={t.tier}
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
  );
}
