import LoginButton from "@/components/LoginButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Zap, Shield, Activity, Globe, Play, Rss, Layout, Rocket } from "lucide-react";
import FloatingBackground from "@/components/FloatingBackground";
import PlatformCarousel from "@/components/PlatformCarousel";
import Footer from "@/components/Footer";
import AuthErrorNotification from "@/components/AuthErrorNotification";
import MarketingNavbar from "@/components/MarketingNavbar";
import DiscordV2Preview from "@/components/DiscordV2Preview";
import styles from "./marketing.module.css";

export const metadata = {

  title: "NovaFeeds | Feed-RSS Discord Bot",
  description: "The ultimate Discord bot for automated feeds. Real-time updates from YouTube, Twitch, RSS, Crypto, and Free Games delivered straight to your server.",
  openGraph: {
    title: "NovaFeeds | Feed-RSS Discord Bot",
    description: "The ultimate Discord bot for automated feeds. Real-time updates from YouTube, Twitch, RSS, Crypto, and Free Games.",
    images: [{ url: "/nova_v2.jpg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NovaFeeds | Feed-RSS Discord Bot",
    description: "The ultimate Discord bot for automated feeds.",
    images: ["/nova_v2.jpg"],
  },
};

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className={`${styles.landingPage} is-landing`}>
      <AuthErrorNotification />
      <FloatingBackground />

      {/* ── Navbar ── */}
      <MarketingNavbar session={session} />

      {/* ── Hero ── */}
      <section className={`${styles.lpHero} ui-container`}>
        <div className={styles.lpHeroGlow}></div>
        <div className={styles.lpHeroContent}>
          <div className={styles.lpHeroLeft}>
            <div className="ui-badge-neon parallax-element" data-depth="0.2" style={{ alignItems: 'flex-start', padding: '0.5rem 1.25rem', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span className={styles.lpBadgeDot}></span>
                <Activity size={14} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <span style={{ lineHeight: 1, color: '#fff' }}>Early Access</span>
                <span style={{ fontSize: '0.85em', opacity: 0.7, lineHeight: 1 }}>Growing Fast</span>
              </div>
            </div>
            <h1 className="ui-title-hero parallax-element" data-depth="0.1">
              Elevate your<br />
              <span className="ui-text-gradient">server&apos;s feeds</span>
            </h1>
            <p className="ui-text-lead parallax-element" data-depth="0.05" style={{ maxWidth: '480px', marginBottom: '2rem' }}>
              Your new favorite bot for Free Games, YouTube, Twitch, RSS, and Crypto - delivered right to your server.
            </p>
            <div className={styles.lpHeroActions}>
              {session ? (
                <a href="/select-server" className="ui-btn ui-btn-primary">
                  <Activity size={20} />
                  Go to Servers
                </a>
              ) : (
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=3387582172359760&response_type=code&redirect_uri=https%3A%2F%2Fnovafeeds.xyz%2Fapi%2Fauth%2Fcallback%2Fdiscord&integration_type=0&scope=identify+guilds+bot+applications.commands`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn-primary"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                  Add to Discord
                </a>
              )}
              {!session && <LoginButton session={session} />}
            </div>
          </div>
          <div className={styles.lpHeroRight}>
            <div className={styles.lpAvatarWrapper}>
              <img src="/nova_v2.jpg" alt="NovaFeeds" className={styles.lpAvatar} />
            </div>
          </div>
        </div>

        {/* Stats row inside hero */}
        <div className={styles.lpStatsRow}>
          <div className={styles.lpStat}>
            <span className={styles.lpStatNum}><Zap size={24} /></span>
            <span className={styles.lpStatText}>Real-Time Delivery</span>
          </div>
          <div className={styles.lpStatSep}></div>
          <div className={styles.lpStat}>
            <span className={styles.lpStatNum}><Globe size={24} /></span>
            <span className={styles.lpStatText}>Multi-Platform Feeds</span>
          </div>
          <div className={styles.lpStatSep}></div>
          <div className={styles.lpStat}>
            <span className={styles.lpStatNum}><Zap size={24} /></span>
            <span className={styles.lpStatText}>Fully Customizable</span>
          </div>
        </div>
      </section>

      {/* ── Discord Preview Showcase ── */}
      <section className={styles.lpPreviewSection}>
        <div className={`${styles.lpPreviewContainer} ui-glass-card`}>
          <div className={styles.lpPreviewText}>
            <div className="ui-label-caps">Stunning Layouts</div>
            <h2 className="ui-title-section">The most beautiful alerts in Discord.</h2>
            <p className="ui-text-lead" style={{ marginBottom: '2.5rem' }}>
              Nova v2 introduces high-fidelity message layouts. With rich embeds, 
              interactive buttons, and smart media handling, your server updates 
              will look more professional than ever.
            </p>
            <div className={styles.lpPreviewFeatures}>
              <div className={styles.lpPFeat}>
                <div className={styles.lpPFeatIcon}><Zap size={18} /></div>
                <span>Rich Media Previews</span>
              </div>
              <div className={styles.lpPFeat}>
                <div className={styles.lpPFeatIcon}><Layout size={18} /></div>
                <span>Smart Embed V2</span>
              </div>
              <div className={styles.lpPFeat}>
                <div className={styles.lpPFeatIcon}><Rocket size={18} /></div>
                <span>Interactive Buttons</span>
              </div>
            </div>
          </div>
          <div className={styles.lpPreviewVisual}>
            <DiscordV2Preview />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={`${styles.lpFeatures} ui-container`}>
        <span className="ui-label-caps">Features</span>
        <h2 className="ui-title-section">All the good stuff, none of the clutter</h2>
        <div className="ui-features-grid">
          {[
            { icon: <Zap size={24} />, title: "Free Game Alerts", desc: "Epic, Steam, GOG - we'll make sure you never miss a free drop." },
            { icon: <Play size={24} />, title: "YouTube & Twitch", desc: "Catch every upload and live stream the second it goes live." },
            { icon: <Rss size={24} />, title: "RSS / Atom Feeds", desc: "Monitor any feed URL. News, blogs, changelogs - totally up to you." },
            { icon: <Activity size={24} />, title: "Crypto Tracking", desc: "Keep an eye on prices and get real-time market updates." },
            { icon: <Layout size={24} />, title: "Web Dashboard", desc: "Tweak all your settings from a super easy-to-use control panel." },
            { icon: <Shield size={24} />, title: "Premium Tiers", desc: "Unlock more feeds, faster updates, and priority support." },
          ].map((f, i) => (
            <div className="ui-card-feature" key={i}>
              <div className="ui-card-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <PlatformCarousel />

      <Footer />
    </div>
  );
}
