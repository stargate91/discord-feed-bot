"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function InviteCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild_id');

  useEffect(() => {
    // If we have a guild_id, redirect to dashboard for that guild
    // Otherwise just go to the selector
    if (guildId) {
      router.push(`/?guild=${guildId}`);
    } else {
      router.push('/select-server');
    }
  }, [guildId, router]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      textAlign: 'center'
    }}>
      <h2 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>Success!</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Redirecting you back to NOVABOT Dashboard...</p>
      <div className="loader" style={{ marginTop: '2rem' }}></div>
    </div>
  );
}

export default function InviteCallback() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InviteCallbackContent />
    </Suspense>
  );
}
