"use client";

import Link from 'next/link';
import LoginButton from './LoginButton';
import { Layout } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function MarketingNavbar({ session }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`lp-navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="lp-navbar-inner">
        <Link href="/" className="lp-brand">
          <div className="lp-brand-logo-wrapper">
            <img src="/nova_v2.jpg" alt="NovaFeeds" className="lp-brand-img" />
            <div className="lp-brand-glow"></div>
          </div>
          <span className="lp-brand-text">NovaFeeds</span>
        </Link>
        
        <div className="lp-nav-links">
          <Link href="/" className="lp-nav-link">Home</Link>
          <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer" className="lp-nav-link">Support</a>
          <Link href="/premium" className="lp-nav-link">Premium</Link>
          {session && (
            <Link href="/select-server" className="lp-nav-link lp-servers-link">
              <Layout size={14} className="inline-icon" />
              Servers
            </Link>
          )}
        </div>
        
        <div className="lp-nav-right">
          <LoginButton session={session} />
        </div>
      </div>
    </nav>
  );
}
