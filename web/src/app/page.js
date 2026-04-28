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
      <section className={styles.lpHero}>
        <div className={styles.lpHeroGlow}></div>
        <div className={styles.lpHeroContent}>
          <div className={styles.lpHeroLeft}>
            <div className={`${styles.lpBadge} parallax-element`} data-depth="0.2">
              <span className={styles.lpBadgeDot}></span>
              <Activity size={14} className="inline-block mr-1" /> Early access - growing fast
            </div>
            <h1 className={`${styles.lpTitle} parallax-element`} data-depth="0.1">
              Elevate your<br />
              <span className={styles.lpTitleGradient}>server&apos;s feeds</span>
            </h1>
            <p className={`${styles.lpSubtitle} parallax-element`} data-depth="0.05">
              Your new favorite bot for Free Games, YouTube, Twitch, RSS, and Crypto - delivered right to your server.
            </p>
            <div className={styles.lpHeroActions}>
              {session ? (
                <a href="/select-server" className={`${styles.lpBtn} ${styles.lpBtnPrimary}`}>
                  <Activity size={20} />
                  Go to Servers
                </a>
              ) : (
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=3387582172359760&response_type=code&redirect_uri=https%3A%2F%2Fnovafeeds.xyz%2Fapi%2Fauth%2Fcallback%2Fdiscord&integration_type=0&scope=identify+guilds+bot+applications.commands`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.lpBtn} ${styles.lpBtnPrimary}`}
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
        <div className={styles.lpPreviewContainer}>
          <div className={styles.lpPreviewText}>
            <div className={styles.lpSectionLabel}>Stunning Layouts</div>
            <h2 className={styles.lpSectionTitle}>The most beautiful alerts in Discord.</h2>
            <p className={styles.lpSectionDesc}>
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
      <section className={styles.lpFeatures}>
        <span className={styles.lpSectionLabel}>Features</span>
        <h2 className={styles.lpSectionTitle}>All the good stuff, none of the clutter</h2>
        <div className={styles.lpFeaturesGrid}>
          {[
            { icon: <Zap size={24} />, title: "Free Game Alerts", desc: "Epic, Steam, GOG - we'll make sure you never miss a free drop." },
            { icon: <Play size={24} />, title: "YouTube & Twitch", desc: "Catch every upload and live stream the second it goes live." },
            { icon: <Rss size={24} />, title: "RSS / Atom Feeds", desc: "Monitor any feed URL. News, blogs, changelogs - totally up to you." },
            { icon: <Activity size={24} />, title: "Crypto Tracking", desc: "Keep an eye on prices and get real-time market updates." },
            { icon: <Layout size={24} />, title: "Web Dashboard", desc: "Tweak all your settings from a super easy-to-use control panel." },
            { icon: <Shield size={24} />, title: "Premium Tiers", desc: "Unlock more feeds, faster updates, and priority support." },
          ].map((f, i) => (
            <div className={styles.lpFeatureCard} key={i}>
              <div className={styles.lpFeatureIcon}>{f.icon}</div>
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
