"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    // Redirect back to landing page with a clean error message
    // If it's a callback error (like 'Cancel' on Discord), we'll call it auth_cancelled
    const errorType = error === "Callback" ? "auth_cancelled" : "auth_error";
    router.push(`/?error=${errorType}`);
  }, [router, error]);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#0a0a0f',
      color: 'white',
      fontFamily: 'var(--font-display), sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="ui-loader-simple" style={{ marginBottom: '1rem' }}></div>
        <p style={{ opacity: 0.6, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.75rem' }}>Processing login error...</p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
