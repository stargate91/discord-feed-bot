"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import GuildSwitcher from "@/components/GuildSwitcher";
import NavLinks from "@/components/NavLinks";
import { PanelLeftClose, PanelLeft } from "lucide-react";

export default function MainSidebar({ session, isMaster }) {
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem('sidebar_collapsed');
    if (savedState === 'false') setIsCollapsed(false);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" style={{ order: -1, marginTop: '0', paddingTop: '0' }}>
        <button className="collapse-btn" onClick={toggleSidebar} title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} style={{ marginBottom: '1.5rem', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: '0', padding: '0.5rem 0.5rem 1rem 0.5rem' }}>
          {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          <span className="link-text">Collapse Menu</span>
        </button>
        <Link href="/" className="brand-header" key="brand-header" style={{ marginTop: '0', paddingTop: '0', display: 'flex', alignItems: 'center', gap: '1.25rem', textDecoration: 'none', cursor: 'pointer' }}>
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
        </Link>
        
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
