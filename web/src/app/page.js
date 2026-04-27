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
    <div className="landing-page is-landing">
      <AuthErrorNotification />
      <FloatingBackground />

      {/* ── Navbar ── */}
      <MarketingNavbar session={session} />

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-glow"></div>
        <div className="lp-hero-content">
          <div className="lp-hero-left">
            <div className="lp-badge parallax-element" data-depth="0.2">
              <span className="lp-badge-dot"></span>
              <Activity size={14} className="inline-block mr-1" /> Early access - growing fast
            </div>
            <h1 className="lp-title parallax-element" data-depth="0.1">
              Elevate your<br />
              <span className="lp-title-gradient">server&apos;s feeds</span>
            </h1>
            <p className="lp-subtitle parallax-element" data-depth="0.05">
              Your new favorite bot for Free Games, YouTube, Twitch, RSS, and Crypto - delivered right to your server.
            </p>
            <div className="lp-hero-actions">
              {session ? (
                <a href="/select-server" className="lp-btn lp-btn-primary">
                  <Activity size={20} />
                  Go to Servers
                </a>
              ) : (
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=3387582172359760&response_type=code&redirect_uri=https%3A%2F%2Fnovafeeds.xyz%2Fapi%2Fauth%2Fcallback%2Fdiscord&integration_type=0&scope=identify+guilds+bot+applications.commands`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-btn lp-btn-primary"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                  Add to Discord
                </a>
              )}
              {!session && <LoginButton session={session} />}
            </div>
          </div>
          <div className="lp-hero-right">
            <div className="lp-avatar-wrapper">
              <img src="/nova_v2.jpg" alt="NovaFeeds" className="lp-avatar" />
            </div>
          </div>
        </div>

        {/* Stats row inside hero */}
        <div className="lp-stats-row">
          <div className="lp-stat">
            <span className="lp-stat-num"><Zap size={24} /></span>
            <span className="lp-stat-text">Real-Time Delivery</span>
          </div>
          <div className="lp-stat-sep"></div>
          <div className="lp-stat">
            <span className="lp-stat-num"><Globe size={24} /></span>
            <span className="lp-stat-text">Multi-Platform Feeds</span>
          </div>
          <div className="lp-stat-sep"></div>
          <div className="lp-stat">
            <span className="lp-stat-num"><Zap size={24} /></span>
            <span className="lp-stat-text">Fully Customizable</span>
          </div>
        </div>
      </section>

      {/* ── Discord Preview Showcase ── */}
      <section className="lp-preview-section">
        <div className="lp-preview-container">
          <div className="lp-preview-text">
            <span className="lp-section-label">Stunning Layouts</span>
            <h2 className="lp-section-title">The most beautiful alerts in Discord.</h2>
            <p className="lp-section-desc">
              Nova v2 introduces high-fidelity message layouts. With rich embeds, 
              interactive buttons, and smart media handling, your server updates 
              will look more professional than ever.
            </p>
            <div className="lp-preview-features">
              <div className="lp-p-feat">
                <Zap size={18} />
                <span>Rich Media Previews</span>
              </div>
              <div className="lp-p-feat">
                <Layout size={18} />
                <span>Smart Embed V2</span>
              </div>
              <div className="lp-p-feat">
                <Rocket size={18} />
                <span>Interactive Buttons</span>
              </div>
            </div>
          </div>
          <div className="lp-preview-visual">
            <DiscordV2Preview />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features">
        <span className="lp-section-label">Features</span>
        <h2 className="lp-section-title">All the good stuff, none of the clutter</h2>
        <div className="lp-features-grid">
          {[
            { icon: <Zap size={24} />, title: "Free Game Alerts", desc: "Epic, Steam, GOG - we'll make sure you never miss a free drop." },
            { icon: <Play size={24} />, title: "YouTube & Twitch", desc: "Catch every upload and live stream the second it goes live." },
            { icon: <Rss size={24} />, title: "RSS / Atom Feeds", desc: "Monitor any feed URL. News, blogs, changelogs - totally up to you." },
            { icon: <Activity size={24} />, title: "Crypto Tracking", desc: "Keep an eye on prices and get real-time market updates." },
            { icon: <Layout size={24} />, title: "Web Dashboard", desc: "Tweak all your settings from a super easy-to-use control panel." },
            { icon: <Shield size={24} />, title: "Premium Tiers", desc: "Unlock more feeds, faster updates, and priority support." },
          ].map((f, i) => (
            <div className="lp-feature-card" key={i}>
              <div className="lp-feature-icon">{f.icon}</div>
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
