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

  if (guildId) {
    return (
      <div style={{ width: '100%' }}>
        <PremiumDashboard guildId={guildId} session={session} />
        <div style={{ maxWidth: '1450px', margin: '0 auto', padding: '0 1rem 10rem' }}>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '900', textAlign: 'center', marginBottom: '3rem', color: 'white', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Full Feature Breakdown
          </h3>
          <PremiumComparisonTable />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <PremiumLanding session={session} />
      <div style={{ maxWidth: '1450px', margin: '0 auto', padding: '0 1rem 10rem' }}>
        <h3 style={{ fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', marginBottom: '4rem', color: 'white', textTransform: 'uppercase', letterSpacing: '3px' }}>
          Compare Tiers
        </h3>
        <PremiumComparisonTable />
      </div>
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
