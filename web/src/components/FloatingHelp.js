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
    console.log("FloatingHelp: Toggling menu. Previous state:", isOpen);
    setIsOpen(!isOpen);
  };

  const getHref = (path) => {
    if (!guildId) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}guild=${guildId}`;
  };

  return (
    <div className="floating-help-container" ref={menuRef}>
      {isOpen && (
        <div className="help-menu">
          <div className="help-header">
            <h3>Support & Help</h3>
            <button className="close-help-btn" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>
          
          <div className="help-options">
            <Link href={getHref("/guide")} onClick={() => setIsOpen(false)} style={{ textDecoration: 'none' }}>
              <div className="help-item card-item">
                <div className="item-icon guide">
                  <Book size={18} />
                </div>
                <div className="item-text">
                  <h4>Getting Started Guide</h4>
                  <p>Step-by-step setup tutorial</p>
                </div>
                <ChevronRight size={14} className="arrow" />
              </div>
            </Link>

            <Link href={getHref("/faq")} onClick={() => setIsOpen(false)} style={{ textDecoration: 'none' }}>
              <div className="help-item card-item">
                <div className="item-icon faq">
                  <MessageSquare size={18} />
                </div>
                <div className="item-text">
                  <h4>FAQ</h4>
                  <p>Common questions & answers</p>
                </div>
                <ChevronRight size={14} className="arrow" />
              </div>
            </Link>

            <a 
              href="https://discord.gg/PbvX3S7pXR" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="help-item card-item"
              style={{ textDecoration: 'none' }}
            >
              <div className="item-icon discord">
                <MessageCircle size={18} />
              </div>
              <div className="item-text">
                <h4>Support Server</h4>
                <p>Join our Discord community</p>
              </div>
              <ExternalLink size={14} className="arrow" />
            </a>
          </div>

          <div className="help-footer">
            <p>Version 2.4.0-beta</p>
          </div>
        </div>
      )}

      <button 
        className={`help-trigger ${isOpen ? 'active' : ''}`} 
        onClick={toggleMenu}
        title="Help & Support"
        type="button"
      >
        <HelpCircle size={28} />
      </button>

      <style jsx>{`
        .floating-help-container {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 99999;
          pointer-events: auto;
        }

        .help-trigger {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--accent-color);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px var(--accent-glow);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .help-trigger:hover {
          transform: scale(1.1) translateY(-5px);
          box-shadow: 0 15px 35px var(--accent-glow);
        }

        .help-trigger.active {
          transform: rotate(90deg);
          background: #333;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }

        .help-menu {
          position: absolute;
          bottom: calc(100% + 1.5rem);
          right: 0;
          width: 320px;
          background: rgba(15, 15, 25, 0.8);
          backdrop-filter: blur(25px) saturate(1.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.05);
          overflow: hidden;
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: bottom right;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.9) translateY(30px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .help-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.02);
        }

        .help-header h3 {
          margin: 0;
          font-size: 0.8rem;
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
        }

        .close-help-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .close-help-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.2);
        }

        .help-options {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .help-item {
          display: flex !important;
          align-items: center !important;
          gap: 1.25rem !important;
          padding: 1.25rem !important;
          border-radius: 20px !important;
          text-decoration: none !important;
          color: white !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          outline: none !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .help-item:visited, .help-item:active, .help-item:focus {
          color: white !important;
          text-decoration: none !important;
        }

        .help-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateX(5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .item-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s;
        }

        .item-icon.guide { background: rgba(123, 44, 191, 0.15); color: #9d4edd; border: 1px solid rgba(123, 44, 191, 0.2); }
        .item-icon.faq { background: rgba(50, 150, 255, 0.15); color: #3296ff; border: 1px solid rgba(50, 150, 255, 0.2); }
        .item-icon.discord { background: rgba(88, 101, 242, 0.15); color: #5865f2; border: 1px solid rgba(88, 101, 242, 0.2); }

        .help-item:hover .item-icon {
          transform: scale(1.1);
        }

        .item-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .item-text h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: white !important;
        }

        .item-text p {
          margin: 0;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5) !important;
          font-weight: 500;
        }

        .arrow {
          margin-left: auto;
          color: rgba(255, 255, 255, 0.2);
          transition: all 0.3s;
        }

        .help-item:hover .arrow {
          color: white;
          transform: translateX(3px);
        }

        .help-footer {
          padding: 1.25rem;
          text-align: center;
          background: rgba(0,0,0,0.2);
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .help-footer p {
          margin: 0;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.2);
          font-family: 'Space Mono', monospace;
          letter-spacing: 1px;
        }

        @media (max-width: 768px) {
          .floating-help-container {
            bottom: 1.5rem;
            right: 1.5rem;
          }
          .help-menu {
            width: 300px;
            right: 0;
          }
        }
      `}</style>
    </div>
  );
}
