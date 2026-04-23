import LoginButton from "@/components/LoginButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Rocket, Zap, Link as LinkIcon, Target, Gamepad2, MonitorPlay, Rss, Bitcoin, LayoutDashboard, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "NOVABOT | Feed-RSS Discord Bot",
  description: "The ultimate Discord bot for automated feeds. Real-time updates from YouTube, Twitch, RSS, Crypto, and Free Games delivered straight to your server.",
  openGraph: {
    title: "NOVABOT | Feed-RSS Discord Bot",
    description: "The ultimate Discord bot for automated feeds. Real-time updates from YouTube, Twitch, RSS, Crypto, and Free Games.",
    images: [{ url: "/nova_v2.jpg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NOVABOT | Feed-RSS Discord Bot",
    description: "The ultimate Discord bot for automated feeds.",
    images: ["/nova_v2.jpg"],
  },
};

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="landing-page is-landing">
      {/* ── Navbar ── */}
      <nav className="lp-navbar">
        <div className="lp-navbar-inner">
          <a href="/" className="lp-brand">
            <img src="/nova_v2.jpg" alt="NOVABOT" className="lp-brand-img" />
            <span className="lp-brand-text">NOVABOT</span>
          </a>
          <div className="lp-nav-links">
            <a href="/" className="lp-nav-link">Home</a>
            <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer" className="lp-nav-link">Support</a>
            <a href="/premium" className="lp-nav-link">Premium</a>
          </div>
          <div className="lp-nav-right">
            {session && (
              <a href="/select-server" className="lp-nav-link" style={{ marginRight: '1rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                Servers
              </a>
            )}
            <LoginButton session={session} />
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-glow"></div>
        <div className="lp-hero-content">
          <div className="lp-hero-left">
            <div className="lp-badge">
              <span className="lp-badge-dot"></span>
              <Rocket size={14} className="inline-block mr-1" /> Early access - growing fast
            </div>
            <h1 className="lp-title">
              Elevate your<br />
              <span className="lp-title-gradient">server&apos;s feeds</span>
            </h1>
            <p className="lp-subtitle">
              Your new favorite bot for Free Games, YouTube, Twitch, RSS, and Crypto - delivered right to your server.
            </p>
            <div className="lp-hero-actions">
              {session ? (
                <a href="/select-server" className="lp-btn lp-btn-primary">
                  <LayoutDashboard size={20} />
                  Go to Servers
                </a>
              ) : (
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=277025770560&scope=bot%20applications.commands`}
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
              <img src="/nova_v2.jpg" alt="NOVABOT" className="lp-avatar" />
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
            <span className="lp-stat-num"><LinkIcon size={24} /></span>
            <span className="lp-stat-text">Multi-Platform Feeds</span>
          </div>
          <div className="lp-stat-sep"></div>
          <div className="lp-stat">
            <span className="lp-stat-num"><Target size={24} /></span>
            <span className="lp-stat-text">Fully Customizable</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features">
        <span className="lp-section-label">Features</span>
        <h2 className="lp-section-title">All the good stuff, none of the clutter</h2>
        <div className="lp-features-grid">
          {[
            { icon: <Gamepad2 size={24} />, title: "Free Game Alerts", desc: "Epic, Steam, GOG - we'll make sure you never miss a free drop." },
            { icon: <MonitorPlay size={24} />, title: "YouTube & Twitch", desc: "Catch every upload and live stream the second it goes live." },
            { icon: <Rss size={24} />, title: "RSS / Atom Feeds", desc: "Monitor any feed URL. News, blogs, changelogs - totally up to you." },
            { icon: <Bitcoin size={24} />, title: "Crypto Tracking", desc: "Keep an eye on prices and get real-time market updates." },
            { icon: <LayoutDashboard size={24} />, title: "Web Dashboard", desc: "Tweak all your settings from a super easy-to-use control panel." },
            { icon: <ShieldCheck size={24} />, title: "Premium Tiers", desc: "Unlock more feeds, faster updates, and priority support." },
          ].map((f, i) => (
            <div className="lp-feature-card" key={i}>
              <div className="lp-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src="/nova_v2.jpg" alt="NOVABOT" className="lp-footer-logo" />
            <div>
              <div className="lp-footer-name">NOVABOT</div>
              <p className="lp-footer-desc">Your friendly neighborhood Discord feed bot.</p>
            </div>
          </div>
          <div className="lp-footer-col">
            <h4>Product</h4>
            <a href="/dashboard">Dashboard</a>
            <a href="/premium">Premium</a>
          </div>
          <div className="lp-footer-col">
            <h4>Resources</h4>
            <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer">Support Server</a>
            <a href={`https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=277025770560&scope=bot%20applications.commands`} target="_blank" rel="noopener noreferrer">Invite Bot</a>
          </div>
          <div className="lp-footer-col">
            <h4>Legal</h4>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} NOVABOT. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
