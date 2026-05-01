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
    <aside className={`ui-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="ui-sidebar-header">
        <button
          className="ui-btn"
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          {!isCollapsed && <span style={{ marginLeft: '12px', fontSize: '0.85rem', fontWeight: 700 }}>Collapse</span>}
        </button>

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', textDecoration: 'none' }}>
          <div style={{ position: 'relative', width: isCollapsed ? '40px' : '50px', height: isCollapsed ? '40px' : '50px', transition: 'all 0.3s' }}>
            <div style={{ position: 'absolute', inset: '-10px', background: 'var(--accent-color)', filter: 'blur(15px)', opacity: 0.2, borderRadius: '50%', zIndex: 0 }}></div>
            <Image
              src="/nova_v2.jpg"
              alt="NovaFeeds"
              width={isCollapsed ? 40 : 50}
              height={isCollapsed ? 40 : 50}
              style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 1 }}
              priority
            />
          </div>
          {!isCollapsed && (
            <div>
              <span className="ui-sidebar-brand" style={{ display: 'block', fontSize: '1.1rem' }}>NovaFeeds</span>
              <span className="ui-sidebar-status">DASHBOARD</span>
            </div>
          )}
        </Link>

        <div style={{ marginTop: '0.5rem' }}>
          {mounted ? <GuildSwitcher isMaster={isMaster} /> : <div style={{ height: '45px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}></div>}
        </div>
      </div>

      <nav className="ui-sidebar-nav">
        <NavLinks session={session} isMaster={isMaster} />
      </nav>

      <div className="ui-sidebar-footer">
        <LogoutButton />
      </div>
    </aside>
  );
}
