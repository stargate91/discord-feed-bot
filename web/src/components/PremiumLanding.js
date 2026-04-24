"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import PricingCard from '@/components/PricingCard';
import { Sparkles } from 'lucide-react';
import LoginButton from '@/components/LoginButton';
import { tiers } from '@/lib/premium-data';

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
    <div className="premium-landing-root">
      {/* ── Navbar ── */}
      <nav className="lp-navbar">
        <div className="lp-navbar-inner">
          <a href="/" className="lp-brand">
            <img src="/nova_v2.jpg" alt="NovaFeeds" className="lp-brand-img" />
            <span className="lp-brand-text">NovaFeeds</span>
          </a>
          <div className="lp-nav-links">
            <a href="/" className="lp-nav-link">Home</a>
            <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer" className="lp-nav-link">Support</a>
            <a href="/premium" className="lp-nav-link">Premium</a>
          </div>
          <div className="lp-nav-right">
            {session && (
              <a href="/select-server" className="lp-nav-link" style={{ marginRight: '1rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                Servers
              </a>
            )}
            <LoginButton session={session} />
          </div>
        </div>
      </nav>

      <div className="landing-container">
        <header className="marketing-header">
          <div className="sparkle-badge">
            <Sparkles size={16} />
            <span>UPGRADE YOUR EXPERIENCE</span>
          </div>
          <h2>Select your plan</h2>
          <p>Upgrade your experience with advanced features and higher limits tailored for your community.</p>

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

      <style jsx>{`
        .premium-landing-root {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
          background: transparent;
          color: white;
          font-family: var(--font-inter);
        }
        .landing-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 8rem 2rem;
          width: 100%;
        }
        .marketing-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 5rem;
        }
        .marketing-header h2 { font-size: 3.5rem; font-weight: 900; margin-bottom: 1rem; }
        .marketing-header p { color: #a0a0b0; max-width: 600px; font-size: 1.1rem; }
        
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          width: 100%;
        }

        .sparkle-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(123, 44, 191, 0.1);
          padding: 8px 16px;
          border-radius: 30px;
          border: 1px solid rgba(123, 44, 191, 0.2);
          margin-bottom: 1.5rem;
          color: #9d4edd;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .billing-toggle-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 6px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-top: 2.5rem;
        }
        .billing-toggle-container button {
          padding: 10px 24px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #a0a0b0;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .billing-toggle-container button.active {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }
        .save-badge {
          font-size: 0.65rem;
          background: rgba(123, 44, 191, 0.2);
          color: #9d4edd;
          padding: 2px 8px;
          border-radius: 10px;
          margin-left: 8px;
        }


        @media (max-width: 1200px) {
          .pricing-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr; }
          .marketing-header h2 { font-size: 2.5rem; }
          .lp-footer-inner { grid-template-columns: 1fr; gap: 3rem; }
          .lp-nav-links { display: none; }
        }
      `}</style>

      <style jsx global>{`
        /* When rendering PremiumLanding inside the dashboard layout, override the dashboard padding */
        .main-content {
          padding: 0 !important;
          max-width: 100% !important;
        }
      `}</style>
    </div>
  );
}
