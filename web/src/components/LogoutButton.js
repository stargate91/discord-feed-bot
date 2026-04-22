"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/' })}
      className="nav-link logout-btn"
      style={{
        marginTop: 'auto',
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        color: '#ff4d4d',
        opacity: 0.8
      }}
    >
      Logout
      <style jsx>{`
        .logout-btn:hover {
          background: rgba(255, 77, 77, 0.1) !important;
          opacity: 1 !important;
        }
      `}</style>
    </button>
  );
}
