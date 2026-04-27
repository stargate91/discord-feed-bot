"use client";

import { signIn, signOut } from "next-auth/react";

export default function LoginButton({ session }) {
  if (session) {
    return (
      <button 
        className="nav-login-btn"
        onClick={() => signOut()}
        title="Click to Sign Out"
      >
        <div className="avatar-mini">
          {session.user.image ? (
            <img 
              src={session.user.image} 
              alt="Avatar" 
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'rgba(123, 44, 191, 0.2)' }} />
          )}
        </div>
        <span>
          {session.user.name}
        </span>
      </button>
    );
  }

  return (
    <button 
      className="lp-btn lp-btn-primary" 
      onClick={() => signIn("discord", { callbackUrl: "/select-server" })}
    >
      Sign in with Discord
    </button>
  );
}
