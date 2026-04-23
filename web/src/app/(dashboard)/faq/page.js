"use client";

import { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare, Zap, ShieldCheck } from 'lucide-react';

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
  return (
    <div className="faq-page">
      <header className="header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2>Frequently Asked Questions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Find answers to common questions and support information for NovaFeeds.
          </p>
        </div>
        <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer">
          <button className="btn btn-support">
            <MessageSquare size={18} />
            Support Server
          </button>
        </a>
      </header>

      <div className="faq-content">
        {FAQ_DATA.map((section, idx) => (
          <div key={idx} className="faq-section">
            <div className="section-header">
              <span className="section-icon">{section.icon}</span>
              <h3>{section.category}</h3>
            </div>
            <div className="questions-list">
              {section.questions.map((item, i) => (
                <FAQItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .faq-page {
          max-width: 1450px;
          margin: 0 auto;
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .btn-support {
          background: rgba(88, 101, 242, 0.08);
          border: 1px solid rgba(88, 101, 242, 0.2);
          color: #5865F2;
          padding: 0.75rem 1.6rem;
          border-radius: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .btn-support:hover {
          background: #5865F2;
          color: white;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 10px 25px rgba(88, 101, 242, 0.3);
        }
        .faq-content {
          display: flex;
          flex-direction: column;
          gap: 4.5rem;
          margin-top: 4rem;
        }
        .faq-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-left: 0.5rem;
        }
        .section-icon {
          color: var(--accent-color);
          background: rgba(123, 44, 191, 0.1);
          padding: 8px;
          border-radius: 12px;
          display: flex;
        }
        .section-header h3 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2.5px;
          color: rgba(255, 255, 255, 0.6);
        }
        .questions-list {
          display: flex;
          flex-direction: column;
        }

        /* FAQ Item Styles (Global within FAQPage) */
        .faq-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(10px);
          position: relative;
          overflow: hidden;
        }
        .faq-item::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--accent-color);
          transform: scaleY(0);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: center;
        }
        .faq-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateX(4px);
        }
        .faq-item.active {
          background: linear-gradient(135deg, rgba(123, 44, 191, 0.1) 0%, rgba(20, 20, 30, 0.4) 100%);
          border-color: rgba(123, 44, 191, 0.3);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(123, 44, 191, 0.05);
          transform: translateX(0);
        }
        .faq-item.active::before {
          transform: scaleY(0.6);
          border-radius: 0 4px 4px 0;
        }
        .faq-question {
          padding: 1.75rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          font-size: 1.15rem;
          color: rgba(255, 255, 255, 0.85);
          transition: color 0.3s;
        }
        .faq-item.active .faq-question {
          color: white;
        }
        .faq-chevron-wrapper {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .faq-item.active .faq-chevron-wrapper {
          background: var(--accent-color);
          border-color: var(--accent-color);
          transform: rotate(180deg);
          box-shadow: 0 0 20px rgba(123, 44, 191, 0.4);
        }
        .faq-chevron {
          transition: color 0.3s;
          color: rgba(255, 255, 255, 0.3);
        }
        .faq-item.active .faq-chevron {
          color: white;
        }
        .faq-answer {
          max-height: 0;
          opacity: 0;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          transform: translateY(-10px);
          pointer-events: none;
        }
        .faq-item.active .faq-answer {
          max-height: 800px;
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .faq-answer-inner {
          padding: 0 2rem 2rem 2rem;
        }
        .faq-answer p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.8;
          font-size: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 1.5rem;
          letter-spacing: 0.2px;
        }
      `}</style>
    </div>
  );
}
