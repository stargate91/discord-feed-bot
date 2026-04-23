"use client";

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

// We use dynamic imports with ssr: false to prevent ANY hydration issues 
// between the complex landing page and the dashboard view.
const PremiumLanding = dynamic(() => import('@/components/PremiumLanding'), { ssr: false });
const PremiumDashboard = dynamic(() => import('@/components/PremiumDashboard'), { ssr: false });

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
    return <PremiumDashboard guildId={guildId} session={session} />;
  }

  return <PremiumLanding session={session} />;
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<div className="loading-container"><div className="loader"></div></div>}>
      <PremiumRouter />
    </Suspense>
  );
}
