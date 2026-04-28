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
import styles from './guide.module.css';

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
    <div className={styles.guideWrapper}>
      <div className={styles.bgGlowContainer}>
        <div className={`${styles.glowOrb} ${styles.orb1}`}></div>
        <div className={`${styles.glowOrb} ${styles.orb2}`}></div>
      </div>

      <div className={styles.guideContent}>
        <header className={styles.guideHero}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} />
            <span>Onboarding Experience</span>
          </div>
          <h1>Let's get <span>Nova</span> running.</h1>
          <p>Follow these 4 simple steps to start delivering the latest content to your community.</p>
        </header>

        <div className={styles.stepsContainer}>
          {steps.map((step) => (
            <div key={step.id} className={styles.guideStepCard}>
              <div className={styles.stepAccent} style={{ background: step.color }}></div>
              <div className={styles.stepHeader}>
                <div className={styles.stepIcon} style={{ background: `${step.color}15`, color: step.color }}>
                  <step.icon size={28} />
                </div>
                <div className={styles.stepNumber}>0{step.id}</div>
              </div>

              <div className={styles.stepBody}>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                
                <div className={styles.proTips}>
                  {step.tips.map((tip, i) => (
                    <div key={i} className={`${styles.tipRow} ${tip.premium ? styles.premiumTip : ''}`}>
                      {tip.premium ? <Crown size={14} className={styles.crownIcon} /> : <CheckCircle2 size={14} className={styles.checkIcon} />}
                      <span>{tip.text}</span>
                      {tip.premium && <span className={styles.premiumBadge}>PRO</span>}
                    </div>
                  ))}
                </div>
              </div>

              {step.link && (
                <div className={styles.stepFooter}>
                  <Link href={step.link} style={{ textDecoration: 'none' }}>
                    <div className={styles.stepBtn} style={{ '--hover-color': step.color }}>
                      <span>{step.linkText}</span>
                      <ArrowRight size={18} />
                    </div>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.guideFinalCta}>
          <div className={styles.ctaIcon}>
            <Crown size={32} />
          </div>
          <div className={styles.ctaText}>
            <h3>Want the full experience?</h3>
            <p>Upgrade to <strong>Nova Premium</strong> for 2-minute updates, custom branding, and 100 monitors.</p>
          </div>
          <Link href={`/premium?guild=${guildId}`} style={{ textDecoration: 'none' }}>
            <div className={`${styles.ctaBtn} ${styles.ctaBtnPremium}`}>
              View Premium Plans
            </div>
          </Link>
          <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer" className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`} style={{ textDecoration: 'none' }}>
            Discord Support
          </a>
        </div>
      </div>


    </div>
  );
}
