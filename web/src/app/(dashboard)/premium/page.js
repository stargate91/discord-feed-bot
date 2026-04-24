"use client";

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

// We use dynamic imports with ssr: false to prevent ANY hydration issues 
// between the complex landing page and the dashboard view.
const PremiumLanding = dynamic(() => import('@/components/PremiumLanding'), { ssr: false });
const PremiumDashboard = dynamic(() => import('@/components/PremiumDashboard'), { ssr: false });
const PremiumComparisonTable = dynamic(() => import('@/components/PremiumComparisonTable'), { ssr: false });
import Footer from '@/components/Footer';

function PremiumRouter() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  
  const guildId = searchParams.get('guild');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="loading-container"><div className="loader"></div></div>;
  }

  const HeaderSection = ({ title, subtitle, badge }) => (
    <div style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '4rem' }}>
      <span style={{ 
        background: 'rgba(123, 44, 191, 0.1)', 
        color: '#9d4edd', 
        padding: '5px 15px', 
        borderRadius: '20px', 
        fontSize: '0.7rem', 
        fontWeight: '900', 
        letterSpacing: '2px',
        textTransform: 'uppercase',
        border: '1px solid rgba(123, 44, 191, 0.2)',
        marginBottom: '1rem',
        display: 'inline-block'
      }}>
        {badge}
      </span>
      <h2 style={{ 
        fontSize: '3rem', 
        fontWeight: '900', 
        color: 'white', 
        margin: '0.5rem 0',
        background: 'linear-gradient(to bottom, #fff 0%, #a0a0b0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-1px'
      }}>
        {title}
      </h2>
      <p style={{ color: '#a0a0b0', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
        {subtitle}
      </p>
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {guildId ? (
        <PremiumDashboard guildId={guildId} session={session} />
      ) : (
        <PremiumLanding session={session} />
      )}
      
      <div style={{ maxWidth: '1450px', margin: '0 auto', padding: '0 1rem 10rem' }}>
        <HeaderSection 
          badge={guildId ? "Advanced Intel" : "Master the Feeds"}
          title={guildId ? "Surgical Precision" : "Choose Your Power"}
          subtitle={guildId 
            ? "Compare technical limits and find the perfect configuration for your server's needs."
            : "From casual tracking to professional intelligence – discover the tier that drives your community forward."
          }
        />
        <PremiumComparisonTable />
      </div>
      
      <Footer />
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<div className="loading-container"><div className="loader"></div></div>}>
      <PremiumRouter />
    </Suspense>
  );
}
