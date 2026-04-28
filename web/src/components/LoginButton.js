"use client";

import { signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import styles from "../app/marketing.module.css";

export default function LoginButton({ session }) {
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
    return (
      <div className={styles.userMenuWrapper} ref={dropdownRef}>
        <button 
          className={`${styles.navLoginBtn} ${isOpen ? styles.active : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <div className={styles.avatarMini}>
            {session.user.image ? (
              <img 
                src={session.user.image} 
                alt="Avatar" 
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'rgba(123, 44, 191, 0.2)' }} />
            )}
          </div>
          <span className={styles.navUserName}>
            {session.user.name}
          </span>
          <div className={`${styles.dropdownArrow} ${isOpen ? styles.rotate : ''}`}></div>
        </button>

        {isOpen && (
          <div className={styles.userDropdown}>
            <div className={styles.userDropdownHeader}>
               <p className={styles.userEmail}>{session.user.email}</p>
            </div>
            
            <div className={styles.userDropdownDivider}></div>
            
            <button 
              className={styles.userDropdownItem}
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
      className={`${styles.lpBtn} ${styles.lpBtnPrimary}`} 
      onClick={() => signIn("discord", { callbackUrl: "/select-server" })}
    >
      Sign in with Discord
    </button>
  );
}
