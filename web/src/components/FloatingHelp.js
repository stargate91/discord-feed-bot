"use client";

import { useState, useEffect, useRef } from "react";
import { HelpCircle, Book, MessageCircle, X, ExternalLink, ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function FloatingHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hide on public premium page (kinti prémium)
  if (!guildId && pathname === "/premium") {
    return null;
  }

  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const getHref = (path) => {
    if (!guildId) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}guild=${guildId}`;
  };

  return (
    <div className="ui-floating-container" ref={menuRef}>
      {isOpen && (
        <div className="ui-help-menu">
          <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Support & Help</h3>
            <button className="ui-modal-close" onClick={() => setIsOpen(false)} style={{ width: '32px', height: '32px' }}>
              <X size={16} />
            </button>
          </div>
          
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href={getHref("/guide")} onClick={() => setIsOpen(false)} style={{ textDecoration: 'none' }}>
              <div className="ui-help-item">
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(123, 44, 191, 0.15)', color: '#9d4edd', border: '1px solid rgba(123, 44, 191, 0.2)' }}>
                  <Book size={18} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>Getting Started Guide</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>Step-by-step setup tutorial</p>
                </div>
                <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'rgba(255, 255, 255, 0.2)' }} />
              </div>
            </Link>

            <Link href={getHref("/faq")} onClick={() => setIsOpen(false)} style={{ textDecoration: 'none' }}>
              <div className="ui-help-item">
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(50, 150, 255, 0.15)', color: '#3296ff', border: '1px solid rgba(50, 150, 255, 0.2)' }}>
                  <MessageSquare size={18} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>FAQ</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>Common questions & answers</p>
                </div>
                <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'rgba(255, 255, 255, 0.2)' }} />
              </div>
            </Link>

            <a 
              href="https://discord.gg/PbvX3S7pXR" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ui-help-item"
              style={{ textDecoration: 'none' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(88, 101, 242, 0.15)', color: '#5865f2', border: '1px solid rgba(88, 101, 242, 0.2)' }}>
                <MessageCircle size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>Support Server</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>Join our Discord community</p>
              </div>
              <ExternalLink size={14} style={{ marginLeft: 'auto', color: 'rgba(255, 255, 255, 0.2)' }} />
            </a>
          </div>

          <div style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'Space Mono, monospace', letterSpacing: '1px' }}>Version 2.4.0-beta</p>
          </div>
        </div>
      )}

      <button 
        className={`ui-help-trigger ${isOpen ? 'active' : ''}`} 
        onClick={toggleMenu}
        title="Help & Support"
        type="button"
      >
        <HelpCircle size={28} />
      </button>
    </div>
  );
}
