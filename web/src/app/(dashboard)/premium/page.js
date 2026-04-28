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
import styles from './premium.module.css';
function PremiumRouter() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  
  const guildId = searchParams.get('guild');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={styles.loadingContainer}><div className={styles.loader}></div></div>;
  }

  const HeaderSection = ({ title, subtitle, centered }) => (
    <div className={`page-header ${centered ? 'is-centered' : ''}`}>
      <div className="page-header-info">
        <h2 className="page-title">{title}</h2>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className={styles.pageContainer}>
      {guildId ? (
        <PremiumDashboard guildId={guildId} session={session} />
      ) : (
        <PremiumLanding session={session} />
      )}
      
      <div className={`${styles.tableWrapper} ${!guildId ? styles.isCentered : ''}`}>
        <HeaderSection 
          title={guildId ? "Surgical Precision" : "Choose Your Power"}
          subtitle={guildId 
            ? "Compare technical limits and find the perfect configuration for your server's needs."
            : "From casual tracking to professional intelligence - discover the tier that drives your community forward."
          }
          centered={!guildId}
        />
        <PremiumComparisonTable />
      </div>
      
      {!guildId && <Footer />}
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<div className={styles.loadingContainer}><div className={styles.loader}></div></div>}>
      <PremiumRouter />
    </Suspense>
  );
}
