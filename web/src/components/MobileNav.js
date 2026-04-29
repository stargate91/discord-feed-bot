"use client";

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import styles from './MobileNav.module.css';

export default function MobileNav({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <div className={styles.mobileHeader}>
        <div className={styles.brand}>
          <img src="/nova_v2.jpg" alt="Nova" className={styles.logo} />
          <span>NovaFeeds</span>
        </div>
        <button 
          className={styles.menuBtn} 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`${styles.sidebarOverlay} ${isOpen ? styles.isOpen : ''}`} onClick={closeMenu}>
        <div className={styles.sidebarContent} onClick={(e) => e.stopPropagation()}>
          {React.Children.map(children, child => 
            React.cloneElement(child, { onItemClick: closeMenu })
          )}
        </div>
      </div>
    </>
  );
}
