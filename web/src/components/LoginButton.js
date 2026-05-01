"use client";

import { signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";

export default function LoginButton({ session, isMobile }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (session) {
    if (isMobile) {
      return (
        <button 
          className="ui-navbar-link"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#ff4d4d', fontSize: '1.8rem' }}
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut size={24} />
          <span>Sign Out</span>
        </button>
      );
    }
    return (
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button 
          className="ui-navbar-link"
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '6px 14px 6px 6px', borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
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
          <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.user.name}
          </span>
          <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(255,255,255,0.4)', transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'none' }}></div>
        </button>

        {isOpen && (
          <div className="ui-select-dropdown" style={{ top: 'calc(100% + 12px)', right: 0, width: '220px' }}>
            <div style={{ padding: '12px 16px' }}>
               <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.email}</p>
            </div>
            
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }}></div>
            
            <button 
              className="ui-select-item"
              style={{ width: '100%', border: 'none', borderRadius: '12px', justifyContent: 'flex-start', gap: '12px', color: '#ff4d4d' }}
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: '/' });
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button 
      className="ui-btn ui-btn-primary" 
      style={{ padding: '0.55rem 1.35rem', fontSize: '0.85rem', borderRadius: '10px' }}
      onClick={() => signIn("discord", { callbackUrl: "/select-server" })}
    >
      Sign in with Discord
    </button>
  );
}
