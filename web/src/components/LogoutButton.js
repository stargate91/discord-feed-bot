"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="nav-link ui-btn-logout"
      style={{
        marginTop: 'auto',
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%'
      }}
    >
      <LogOut size={20} className="nav-icon" />
      <span className="link-text">Logout</span>
    </button>
  );
}
