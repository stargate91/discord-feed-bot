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
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loader" style={{ marginBottom: '1rem' }}></div>
        <p style={{ opacity: 0.6 }}>Processing login error...</p>
      </div>

      <style jsx>{`
        .loader {
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid #7b2cbf;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
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
