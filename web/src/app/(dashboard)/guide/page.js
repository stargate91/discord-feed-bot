"use client";

import { 
  Settings, 
  PlusCircle, 
  Bell, 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  Layout, 
  Zap, 
  Crown, 
  ShieldCheck, 
  Sparkles,
  RefreshCw,
  Palette,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function GuidePage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const steps = [
    {
      id: 1,
      title: "Configure Base Settings",
      description: "Start by setting your server's language and management roles. This ensures Nova speaks your language and updates at the speed you want.",
      icon: Settings,
      color: "#9d4edd",
      link: `/settings?guild=${guildId}`,
      linkText: "Configure Settings",
      tips: [
        { text: "Select English or Hungarian as your primary language", premium: false },
        { text: "Set a Management Role so your staff can manage monitors", premium: false },
        { text: "Unlock ultra-fast 2-minute polling intervals", premium: true }
      ]
    },
    {
      id: 2,
      title: "Create Your First Monitor",
      description: "Nova supports over 10 platforms including YouTube, Twitch, RSS, and Steam. Just paste a link and we'll handle the rest.",
      icon: PlusCircle,
      color: "#3296ff",
      link: `/monitors?guild=${guildId}`,
      linkText: "Open Monitors",
      tips: [
        { text: "Paste any YouTube channel or Twitch profile URL", premium: false },
        { text: "Select multiple Discord channels for alerts", premium: true },
        { text: "Expand your limit up to 100 monitors per server", premium: true }
      ]
    },
    {
      id: 3,
      title: "Design Custom Alerts",
      description: "Make every notification feel like a part of your server. Customize colors, message content, and mention roles automatically.",
      icon: Bell,
      color: "#ffb703",
      tips: [
        { text: "Use pre-configured high-quality alert templates", premium: false },
        { text: "Fully custom messages with {title}, {url} tags", premium: true },
        { text: "Remove 'Delivered by Nova' footer branding", premium: true }
      ]
    },
    {
      id: 4,
      title: "Monitor Performance",
      description: "Track how your feeds are performing. See total messages sent and active monitoring status across all your channels.",
      icon: Layout,
      color: "#10b981",
      link: `/analytics?guild=${guildId}`,
      linkText: "Check Stats",
      tips: [
        { text: "View detailed delivery statistics in the Analytics tab", premium: false },
        { text: "Ensure the bot has 'Send Messages' permissions", premium: false },
        { text: "Help us grow! Your feedback directly shapes Nova", premium: false }
      ]
    }
  ];

  return (
    <div className="guide-wrapper">
      <div className="bg-glow-container">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
      </div>

      <div className="guide-content">
        <header className="guide-hero">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Onboarding Experience</span>
          </div>
          <h1>Let's get <span>Nova</span> running.</h1>
          <p>Follow these 4 simple steps to start delivering the latest content to your community.</p>
        </header>

        <div className="steps-container">
          {steps.map((step) => (
            <div key={step.id} className="guide-step-card">
              <div className="step-accent" style={{ background: step.color }}></div>
              <div className="step-header">
                <div className="step-icon" style={{ background: `${step.color}15`, color: step.color }}>
                  <step.icon size={28} />
                </div>
                <div className="step-number">0{step.id}</div>
              </div>

              <div className="step-body">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                
                <div className="pro-tips">
                  {step.tips.map((tip, i) => (
                    <div key={i} className={`tip-row ${tip.premium ? 'premium-tip' : ''}`}>
                      {tip.premium ? <Crown size={14} className="crown-icon" /> : <CheckCircle2 size={14} className="check-icon" />}
                      <span>{tip.text}</span>
                      {tip.premium && <span className="premium-badge">PRO</span>}
                    </div>
                  ))}
                </div>
              </div>

              {step.link && (
                <div className="step-footer">
                  <Link href={step.link} style={{ textDecoration: 'none' }}>
                    <div className="step-btn" style={{ '--hover-color': step.color }}>
                      <span>{step.linkText}</span>
                      <ArrowRight size={18} />
                    </div>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="guide-final-cta">
          <div className="cta-icon">
            <Crown size={32} />
          </div>
          <div className="cta-text">
            <h3>Want the full experience?</h3>
            <p>Upgrade to <strong>Nova Premium</strong> for 1-minute updates, custom branding, and 100+ monitors.</p>
          </div>
          <Link href={`/premium?guild=${guildId}`} style={{ textDecoration: 'none' }}>
            <div className="cta-btn premium">
              View Premium Plans
            </div>
          </Link>
          <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer" className="cta-btn secondary" style={{ textDecoration: 'none' }}>
            Discord Support
          </a>
        </div>
      </div>

      <style jsx>{`
        .guide-wrapper {
          padding: 3rem 0;
          position: relative;
          min-height: 100vh;
        }

        .bg-glow-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }

        .glow-orb {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.1;
        }

        .orb-1 { top: -100px; right: -100px; background: #9d4edd; }
        .orb-2 { bottom: -100px; left: -100px; background: #3296ff; }

        .guide-content {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
        }

        .guide-hero {
          text-align: center;
          margin-bottom: 5rem;
          animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 100px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 2rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .guide-hero h1 {
          font-size: 4.5rem;
          font-weight: 950;
          margin: 0;
          letter-spacing: -3px;
          line-height: 1;
        }

        .guide-hero h1 span {
          background: linear-gradient(to right, #9d4edd, #c77dff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .guide-hero p {
          color: var(--text-secondary);
          font-size: 1.4rem;
          margin-top: 1.5rem;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.4;
          opacity: 0.8;
        }

        .steps-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2.5rem;
          margin-bottom: 5rem;
        }

        .guide-step-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 40px;
          padding: 3rem;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(20px);
        }

        .guide-step-card:hover {
          transform: translateY(-12px) scale(1.02);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
        }

        .step-accent {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 6px;
          opacity: 0.3;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .step-icon {
          width: 64px;
          height: 64px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 15px 30px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05);
        }

        .step-number {
          font-size: 3rem;
          font-weight: 950;
          color: rgba(255, 255, 255, 0.05);
          letter-spacing: -2px;
          line-height: 1;
        }

        .step-body h3 {
          font-size: 1.8rem;
          font-weight: 900;
          margin: 0 0 1rem 0;
          letter-spacing: -0.5px;
        }

        .step-body p {
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 2.5rem;
          font-size: 1.1rem;
        }

        .pro-tips {
          display: flex;
          flex-direction: column;
          gap: 15px;
          background: rgba(0,0,0,0.3);
          padding: 2rem;
          border-radius: 28px;
          margin-bottom: 2.5rem;
          border: 1px solid rgba(255,255,255,0.03);
        }

        .tip-row {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.4;
        }

        .check-icon { color: #10b981; flex-shrink: 0; }
        .crown-icon { color: #ffb703; flex-shrink: 0; }

        .premium-tip {
          color: #ffb703;
          font-weight: 600;
        }

        .premium-badge {
          font-size: 0.6rem;
          font-weight: 900;
          background: #ffb703;
          color: black;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: auto;
          letter-spacing: 1px;
        }

        .step-footer {
          margin-top: auto;
        }

        .step-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 1.25rem;
          border-radius: 20px;
          color: white;
          text-decoration: none;
          font-weight: 800;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 1.05rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        .step-btn:hover {
          background: var(--hover-color);
          border-color: var(--hover-color);
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
          filter: brightness(1.1);
        }

        .guide-final-cta {
          display: flex;
          align-items: center;
          gap: 3rem;
          background: linear-gradient(135deg, rgba(123, 44, 191, 0.25) 0%, rgba(60, 9, 108, 0.15) 100%);
          border: 1px solid rgba(157, 78, 221, 0.4);
          border-radius: 45px;
          padding: 3.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
        }

        .cta-icon {
          width: 90px;
          height: 90px;
          background: linear-gradient(135deg, #ffb703 0%, #fb8500 100%);
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          box-shadow: 0 20px 40px rgba(251, 133, 0, 0.4);
          flex-shrink: 0;
        }

        .cta-text h3 {
          margin: 0;
          font-size: 2.2rem;
          font-weight: 950;
          letter-spacing: -1px;
          color: white;
        }

        .cta-text p {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.2rem;
          max-width: 500px;
        }

        .cta-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 2.5rem;
          border-radius: 18px;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 1rem;
          text-align: center;
          min-width: 220px;
          letter-spacing: 0.5px;
          cursor: pointer;
        }

        .cta-btn.premium {
          background: linear-gradient(135deg, #ffb703 0%, #fb8500 100%);
          color: #000;
          box-shadow: 0 10px 30px rgba(251, 133, 0, 0.2);
          border: none;
        }

        .cta-btn.secondary {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
        }

        .cta-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
        }

        .cta-btn.premium:hover {
          filter: brightness(1.1);
          box-shadow: 0 15px 40px rgba(251, 133, 0, 0.4);
          transform: translateY(-5px) scale(1.02);
        }

        .cta-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }

        @keyframes slideDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1100px) {
          .guide-final-cta { flex-direction: column; text-align: center; padding: 3rem 2rem; gap: 2rem; }
          .cta-btn { width: 100%; min-width: 0; }
        }
      `}</style>
    </div>
  );
}
