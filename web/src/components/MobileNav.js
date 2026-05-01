"use client";

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function MobileNav({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <div className="ui-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/nova_v2.jpg" alt="Nova" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '1px', color: 'white' }}>NovaFeeds</span>
        </div>
        <button 
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div 
        className={`ui-modal-overlay ${isOpen ? 'active' : ''}`} 
        style={{ display: isOpen ? 'flex' : 'none', padding: 0, justifyContent: 'flex-start' }}
        onClick={closeMenu}
      >
        <div 
          className="ui-sidebar" 
          style={{ width: '280px', transform: isOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          {React.Children.map(children, child => 
            React.cloneElement(child, { onItemClick: closeMenu })
          )}
        </div>
      </div>
    </>
  );
}
