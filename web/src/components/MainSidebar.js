"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";
import GuildSwitcher from "@/components/GuildSwitcher";
import NavLinks from "@/components/NavLinks";

export default function MainSidebar({ session, isMaster }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ order: -1, marginTop: '0', paddingTop: '0' }}>
        <div className="brand-header" key="brand-header" style={{ marginTop: '0', paddingTop: '0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-10px', background: 'var(--accent-color)', filter: 'blur(15px)', opacity: 0.2, borderRadius: '50%', zIndex: 0 }}></div>
            <Image
              src="/nova_v2.jpg"
              alt="NovaFeeds"
              width={60}
              height={60}
              className="brand-logo"
              priority
              style={{ position: 'relative', zIndex: 1 }}
            />
          </div>
          <div className="brand-text">
            <span className="brand-name" style={{ display: 'block', fontWeight: '900', fontSize: '1.2rem', color: 'white', letterSpacing: '1px' }}>NovaFeeds</span>
            <span className="brand-status" style={{ display: 'block', fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent-color)', letterSpacing: '2px', marginTop: '-2px' }}>DASHBOARD</span>
          </div>
        </div>
        
        <div key="guild-switcher-container" style={{ marginTop: '1.5rem' }}>
          {mounted ? <GuildSwitcher isMaster={isMaster} /> : <div className="guild-switcher-skeleton" style={{ height: '45px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}></div>}
        </div>
      </div>
      
      {/* 2. Navigation Menu */}
      <nav className="sidebar-nav">
        <NavLinks session={session} isMaster={isMaster} />
      </nav>

      {/* 3. Footer with Logout */}
      <div className="sidebar-footer">
        <LogoutButton />
      </div>
    </aside>
  );
}
