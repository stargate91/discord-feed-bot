"use client";

import { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare, Zap, ShieldCheck, Terminal } from 'lucide-react';

const FAQ_DATA = [
  {
    category: "Getting Started",
    icon: <Zap size={20} />,
    questions: [
      {
        q: "How do I add a new feed monitor?",
        a: "Navigate to the 'Monitors' tab in your dashboard, click 'Add New Monitor', select your platform (YouTube, RSS, etc.), and follow the setup wizard. You'll need the URL or ID of the content you want to track."
      },
      {
        q: "How do I invite the bot to my server?",
        a: "You can find the official invite link on our landing page or in the footer of this dashboard. Make sure you have 'Manage Server' permissions on Discord to add it."
      }
    ]
  },
  {
    category: "Monitoring & Delivery",
    icon: <HelpCircle size={20} />,
    questions: [
      {
        q: "How often does the bot check for updates?",
        a: "Free users have a 30-60 minute check interval. Premium tiers offer significantly faster refresh rates, down to 2-5 minutes depending on your plan."
      },
      {
        q: "Why is my monitor paused?",
        a: "Monitors can be paused manually, or automatically if the target channel is deleted or if the bot loses access to the server. You can resume them in the Monitors list."
      },
      {
        q: "Can I customize the message format?",
        a: "Yes! Premium users can use custom alert templates to change exactly how the message looks in Discord, including custom pings and text."
      }
    ]
  },
  {
    category: "Premium & Billing",
    icon: <ShieldCheck size={20} />,
    questions: [
      {
        q: "What are the benefits of Premium?",
        a: "Premium unlocks higher monitor limits, faster refresh rates, role pings, custom alert templates, and priority support. Each tier is designed to scale with your community's needs."
      },
      {
        q: "Is Premium bound to a server or a user?",
        a: "Premium is bound to a specific Discord Server. Once purchased, any administrator of that server can manage the premium monitors."
      }
    ]
  },
  {
    category: "Discord Commands",
    icon: <Terminal size={20} />,
    questions: [
      {
        q: "What commands can I use in Discord?",
        a: "NovaFeeds uses Slash Commands. Type '/' in your Discord server to see all available commands. Key commands include /monitor check, /monitor preview, /purge, and /dashboard."
      },
      {
        q: "/monitor check",
        a: "Manually triggers an immediate check for a specific monitor. Great for testing if your setup works correctly without waiting for the automatic cycle."
      },
      {
        q: "/monitor preview",
        a: "Generates a mock alert for a monitor. This allows you to see exactly how your embed, custom color, and ping roles will look in the channel."
      },
      {
        q: "/monitor repost (Premium)",
        a: "Allows you to resend the last 1-10 items from a specific monitor. This is useful if you've accidentally deleted messages or moved to a new channel."
      },
      {
        q: "/purge",
        a: "Quickly cleans up messages in the current channel. For safety, this only works in channels that are actively assigned to a monitor."
      },
      {
        q: "/dashboard",
        a: "Sends a private message with a direct link to this web dashboard and the support server."
      }
    ]
  }
];

function FAQItem({ q, a }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
      <div className="faq-question">
        <span>{q}</span>
        <div className="faq-chevron-wrapper">
          <ChevronDown size={18} className="faq-chevron" />
        </div>
      </div>
      <div className="faq-answer">
        <div className="faq-answer-inner">
          <p>{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState(FAQ_DATA[0].category);

  return (
    <div className="faq-page">
      {/* Decorative Glows */}
      <div className="glow-top-right"></div>
      <div className="glow-bottom-left"></div>

      <header className="header">
        <div className="header-info">
          <div className="badge">KNOWLEDGE BASE</div>
          <h2>Frequently Asked Questions</h2>
          <p>
            Everything you need to know about NovaFeeds. Can't find what you're looking for? 
            Our support team is always ready to help.
          </p>
        </div>
        <div className="header-actions">
          <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer">
            <button className="btn btn-support">
              <MessageSquare size={18} />
              <span>Join Support Server</span>
              <div className="btn-glow"></div>
            </button>
          </a>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="category-tabs">
        {FAQ_DATA.map((section) => (
          <button 
            key={section.category}
            className={`category-tab ${activeCategory === section.category ? 'active' : ''}`}
            onClick={() => setActiveCategory(section.category)}
          >
            {section.icon}
            <span>{section.category}</span>
            {activeCategory === section.category && <div className="tab-indicator"></div>}
          </button>
        ))}
      </div>

      <div className="faq-content">
        {FAQ_DATA.filter(s => s.category === activeCategory).map((section) => (
          <div key={section.category} className="faq-section-wrapper">
            <div className="section-header">
              <div className="section-icon-wrapper">
                <span className="section-icon">{section.icon}</span>
                <div className="icon-pulse"></div>
              </div>
              <div className="section-title-group">
                <h3>{section.category}</h3>
                <div className="section-line"></div>
              </div>
            </div>
            <div className="questions-grid">
              {section.questions.map((item, i) => (
                <div key={i} className="animated-item" style={{"--delay": `${i * 0.1}s`}}>
                  <FAQItem q={item.q} a={item.a} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .faq-page {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          min-height: 100vh;
          padding-bottom: 5rem;
        }

        /* Decorative Glows */
        .glow-top-right {
          position: absolute;
          top: -100px;
          right: -100px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(123, 44, 191, 0.15) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }
        .glow-bottom-left {
          position: fixed;
          bottom: -100px;
          left: -100px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(123, 44, 191, 0.1) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 2rem 0;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .header-info {
          max-width: 600px;
        }

        .badge {
          background: rgba(123, 44, 191, 0.15);
          color: var(--accent-color);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 900;
          letter-spacing: 2px;
          width: fit-content;
          margin-bottom: 1rem;
          border: 1px solid rgba(123, 44, 191, 0.2);
          box-shadow: 0 0 15px rgba(123, 44, 191, 0.1);
        }

        .header h2 {
          font-size: 2.8rem;
          margin: 0 0 1rem 0;
          background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.6) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .header p {
          color: var(--text-secondary);
          font-size: 1.1rem;
          line-height: 1.6;
          margin: 0;
        }

        .btn-support {
          position: relative;
          background: #5865F2;
          color: white;
          padding: 1rem 2rem;
          border-radius: 18px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: hidden;
        }

        .btn-support:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 15px 30px rgba(88, 101, 242, 0.4);
        }

        .btn-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .btn-support:hover .btn-glow {
          opacity: 1;
          animation: rotateGlow 4s linear infinite;
        }

        @keyframes rotateGlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .category-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 3rem;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          width: fit-content;
        }

        .category-tab {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          padding: 0.8rem 1.5rem;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .category-tab:hover {
          color: white;
          background: rgba(255, 255, 255, 0.03);
        }

        .category-tab.active {
          color: white;
          background: rgba(123, 44, 191, 0.1);
        }

        .tab-indicator {
          position: absolute;
          bottom: 0;
          left: 20%;
          right: 20%;
          height: 2px;
          background: var(--accent-gradient);
          border-radius: 2px;
          box-shadow: 0 0 10px var(--accent-color);
        }

        .faq-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-top: 1rem;
        }

        .animated-item {
          animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
          animation-delay: var(--delay);
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .faq-section-wrapper {
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 2.5rem;
        }

        .section-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .section-icon {
          color: white;
          background: var(--accent-gradient);
          padding: 14px;
          border-radius: 16px;
          display: flex;
          z-index: 2;
          box-shadow: 0 10px 20px rgba(123, 44, 191, 0.3);
        }

        .icon-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          background: var(--accent-color);
          border-radius: 16px;
          z-index: 1;
          animation: pulseIcon 3s infinite;
        }

        @keyframes pulseIcon {
          0% { transform: scale(1); opacity: 0.5; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }

        .section-title-group {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 900;
          color: white;
          white-space: nowrap;
        }

        .section-line {
          height: 1px;
          flex: 1;
          background: linear-gradient(to right, rgba(255, 255, 255, 0.1), transparent);
        }

        .questions-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.2rem;
        }

        /* FAQ Item Redesign */
        .faq-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
        }

        .faq-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-3px) translateX(4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .faq-item.active {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(123, 44, 191, 0.4);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3), inset 0 0 30px rgba(123, 44, 191, 0.05);
        }

        .faq-question {
          padding: 2rem 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          transition: all 0.3s;
        }

        .faq-item.active .faq-question {
          color: white;
          padding-bottom: 1.5rem;
        }

        .faq-chevron-wrapper {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .faq-item.active .faq-chevron-wrapper {
          background: var(--accent-gradient);
          border-color: transparent;
          transform: rotate(180deg);
          box-shadow: 0 5px 15px rgba(123, 44, 191, 0.4);
        }

        .faq-chevron {
          color: rgba(255, 255, 255, 0.4);
        }

        .faq-item.active .faq-chevron {
          color: white;
        }

        .faq-answer {
          max-height: 0;
          opacity: 0;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .faq-item.active .faq-answer {
          max-height: 1000px;
          opacity: 1;
        }

        .faq-answer-inner {
          padding: 0 2.5rem 2.5rem 2.5rem;
        }

        .faq-answer p {
          margin: 0;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.8;
          font-size: 1.05rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 1.5rem;
        }
      `}</style>
    </div>
  );
}
