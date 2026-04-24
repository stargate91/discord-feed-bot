"use client";

import { signIn, signOut } from "next-auth/react";

export default function LoginButton({ session }) {
  if (session) {
    return (
      <div 
        className="user-profile" 
        onClick={() => signOut()}
        title="Click to Sign Out"
      >
        {session.user.image ? (
          <img 
            src={session.user.image} 
            alt="Avatar" 
            style={{ width: "24px", borderRadius: "50%" }} 
          />
        ) : (
          <span className="status-indicator"></span>
        )}
        <span>{session.user.name}</span>
      </div>
    );
  }

  return (
    <div 
      className="btn" 
      onClick={() => signIn("discord", { callbackUrl: "/select-server" })}
    >
      Sign in with Discord
    </div>
  );
}
