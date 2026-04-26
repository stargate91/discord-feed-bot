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
  Globe,
  ShieldCheck
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
      description: "Start by setting your server's language and default polling intervals. This ensures Nova speaks your language and updates at the speed you want.",
      icon: Settings,
      color: "#9d4edd",
      link: `/settings?guild=${guildId}`,
      linkText: "Configure Settings",
      tips: [
        "Select English or Hungarian as your primary language",
        "Set a Management Role so your staff can manage monitors",
        "Default refresh interval is now 20 minutes for Free Tier"
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
        "Paste any YouTube channel or Twitch profile URL",
        "Multiple Discord channels? You can pick as many as you want",
        "Add custom pings for roles to notify specific members"
      ]
    },
    {
      id: 3,
      title: "Design Custom Alerts",
      description: "Make every notification feel like a part of your server. Customize colors, message content, and mention roles automatically.",
      icon: Bell,
      color: "#ffb703",
      tips: [
        "Use {title}, {author}, and {url} tags in your messages",
        "Set a specific color for each platform to stay organized",
        "Role pings can be customized per monitor or globally"
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
        "View detailed delivery statistics in the Analytics tab",
        "Ensure the bot has 'Send Messages' permissions in channels",
        "Upgrade to Premium for faster polling (up to 1 minute!)"
      ]
    }
  ];

  return (
    <div className="guide-wrapper">
      <div className="guide-content">
        <header className="guide-hero">
          <div className="hero-badge">
            <Zap size={14} />
            <span>Setup Guide</span>
          </div>
          <h1>Let's get <span>Nova</span> running.</h1>
          <p>Follow these 4 simple steps to start delivering the latest content to your community.</p>
        </header>

        <div className="steps-container">
          {steps.map((step) => (
            <div key={step.id} className="guide-step-card">
              <div className="step-accent" style={{ background: step.color }}></div>
              <div className="step-header">
                <div className="step-icon" style={{ background: `${step.color}20`, color: step.color }}>
                  <step.icon size={24} />
                </div>
                <div className="step-number">STEP 0{step.id}</div>
              </div>

              <div className="step-body">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                
                <div className="pro-tips">
                  {step.tips.map((tip, i) => (
                    <div key={i} className="tip-row">
                      <CheckCircle2 size={14} />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {step.link && (
                <div className="step-footer">
                  <Link href={step.link} className="step-btn">
                    <span>{step.linkText}</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="guide-final-cta">
          <div className="cta-icon">
            <ShieldCheck size={32} />
          </div>
          <div className="cta-text">
            <h3>Still have questions?</h3>
            <p>Our support team is ready to help you 24/7 in our Discord server.</p>
          </div>
          <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer" className="cta-btn">
            Join Support Server
          </a>
        </div>
      </div>

      <style jsx>{`
        .guide-wrapper {
          padding: 2rem 0;
          animation: fadeIn 0.6s ease-out;
        }

        .guide-hero {
          text-align: center;
          margin-bottom: 4rem;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(157, 78, 221, 0.1);
          border: 1px solid rgba(157, 78, 221, 0.2);
          border-radius: 100px;
          color: #c77dff;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1.5rem;
        }

        .guide-hero h1 {
          font-size: 3.5rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -2px;
          line-height: 1.1;
        }

        .guide-hero h1 span {
          color: var(--accent-color);
        }

        .guide-hero p {
          color: var(--text-secondary);
          font-size: 1.25rem;
          margin-top: 1rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .steps-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
          gap: 2rem;
          margin-bottom: 4rem;
        }

        .guide-step-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 32px;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .guide-step-card:hover {
          transform: translateY(-8px);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .step-accent {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          opacity: 0.5;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .step-icon {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }

        .step-number {
          font-size: 0.8rem;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.2);
          letter-spacing: 2px;
        }

        .step-body h3 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 1rem 0;
        }

        .step-body p {
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 2rem;
          font-size: 1rem;
        }

        .pro-tips {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(0,0,0,0.2);
          padding: 1.5rem;
          border-radius: 20px;
          margin-bottom: 2rem;
        }

        .tip-row {
          display: flex;
          gap: 12px;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.4;
        }

        .tip-row :global(svg) {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .step-footer {
          margin-top: auto;
        }

        .step-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 16px;
          color: white;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.2s;
        }

        .step-btn:hover {
          background: white;
          color: black;
          transform: translateY(-2px);
        }

        .guide-final-cta {
          display: flex;
          align-items: center;
          gap: 2rem;
          background: linear-gradient(135deg, rgba(123, 44, 191, 0.2) 0%, rgba(60, 9, 108, 0.1) 100%);
          border: 1px solid rgba(123, 44, 191, 0.3);
          border-radius: 32px;
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
        }

        .cta-icon {
          width: 80px;
          height: 80px;
          background: var(--accent-color);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 15px 35px rgba(123, 44, 191, 0.4);
        }

        .cta-text h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
        }

        .cta-text p {
          margin: 5px 0 0;
          color: var(--text-secondary);
        }

        .cta-btn {
          margin-left: auto;
          background: white;
          color: black;
          padding: 1rem 2rem;
          border-radius: 16px;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.2s;
        }

        .cta-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 10px 25px rgba(255, 255, 255, 0.2);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 900px) {
          .guide-final-cta { flex-direction: column; text-align: center; }
          .cta-btn { margin: 1.5rem 0 0 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
