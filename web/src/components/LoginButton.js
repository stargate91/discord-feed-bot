"use client";

import { signIn, signOut } from "next-auth/react";

export default function LoginButton({ session }) {
  if (session) {
    return (
      <button 
        onClick={() => signOut()}
        title="Click to Sign Out"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '4px',
          paddingRight: '16px',
          borderRadius: '50px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.querySelector('span').style.color = '#fff';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.querySelector('span').style.color = 'rgba(255, 255, 255, 0.9)';
        }}
      >
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0
        }}>
          {session.user.image ? (
            <img 
              src={session.user.image} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'rgba(123, 44, 191, 0.2)' }} />
          )}
        </div>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: '700',
          color: 'rgba(255, 255, 255, 0.9)',
          transition: 'color 0.2s ease',
          whiteSpace: 'nowrap'
        }}>
          {session.user.name}
        </span>
      </button>
    );
  }

  return (
    <button 
      className="btn" 
      onClick={() => signIn("discord", { callbackUrl: "/select-server" })}
      style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
    >
      Sign in with Discord
    </button>
  );
}
