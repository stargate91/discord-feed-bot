"use client";

import { useEffect, useRef } from "react";
import { Zap, Shield, Activity, Globe, Play, Rss, Layout, Rocket } from "lucide-react";
import s from "./page.module.css";

const DISCORD_INVITE = `https://discord.com/oauth2/authorize?client_id=1489908793780338688&permissions=3387582172359760&response_type=code&redirect_uri=https%3A%2F%2Fnovafeeds.xyz%2Fapi%2Fauth%2Fcallback%2Fdiscord&integration_type=0&scope=identify+guilds+bot+applications.commands`;

const FEATURES = [
  { icon: <Zap size={24} />, title: "Free Game Alerts", desc: "Epic, Steam, GOG — never miss a free drop again." },
  { icon: <Play size={24} />, title: "YouTube & Twitch", desc: "Catch every upload and live stream the second it goes live." },
  { icon: <Rss size={24} />, title: "RSS / Atom Feeds", desc: "Monitor any feed URL. News, blogs, changelogs — your call." },
  { icon: <Activity size={24} />, title: "Crypto Tracking", desc: "Real-time price alerts and market updates." },
  { icon: <Layout size={24} />, title: "Web Dashboard", desc: "A super easy control panel to manage everything." },
  { icon: <Shield size={24} />, title: "Premium Tiers", desc: "More feeds, faster updates, and priority support." },
];

const PLATFORMS = [
  { name: "YouTube", icon: "/emojis/youtube.png" },
  { name: "Twitch", icon: "/emojis/twitch.png" },
  { name: "Epic Games", icon: "/emojis/epic-games.png" },
  { name: "Steam", icon: "/emojis/steam.png" },
  { name: "GOG", icon: "/emojis/gog.png" },
  { name: "Kick", icon: "/emojis/kick.png" },
  { name: "RSS", icon: "/emojis/rss.png" },
  { name: "TMDB", icon: "/emojis/tmdb.png" },
  { name: "GitHub", icon: "/emojis/github.png" },
  { name: "Crypto", icon: "/emojis/crypto.png" },
];

export default function LandingPage() {
  const revealRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(s.visible);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRevealRef = (el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  return (
    <div className={s.page}>
      {/* Background */}
      <div className={s.bgGrid} />
      <div className={`${s.bgBlob} ${s.blobPink}`} />
      <div className={`${s.bgBlob} ${s.blobCyan}`} />
      <div className={`${s.bgBlob} ${s.blobPurple}`} />

      {/* ── Navbar ── */}
      <nav className={s.navbar}>
        <div className={s.navBrand}>
          <img src="/nova_v2.jpg" alt="NovaFeeds" className={s.navLogo} />
          NovaFeeds
        </div>
        <ul className={s.navLinks}>
          <li><a href="#features" className={s.navLink}>Features</a></li>
          <li><a href="#preview" className={s.navLink}>Preview</a></li>
          <li><a href="#platforms" className={s.navLink}>Platforms</a></li>
        </ul>
        <div className={s.navActions}>
          <a href="/api/auth/signin" className={s.btnGhost}>Login with Discord</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={s.hero}>
        <div className={s.heroContent}>
          <div>
            <div className={s.heroBadge}>
              <span className={s.badgeDot} />
              <Activity size={14} />
              System Status: Operational
            </div>
            <h1 className={s.heroTitle}>
              Elevate your<br />
              <span className={s.heroGradient}>server&apos;s feeds</span>
            </h1>
            <p className={s.heroSubtitle}>
              The ultimate Discord bot for Free Games, YouTube, Twitch, RSS, and
              Crypto — professional feeds, automated delivery.
            </p>
            <div className={s.heroActions}>
              <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                Add to Discord
              </a>
              <div className={s.heroTechInfo}>
                <span className={s.techCode}>LAT: 47.4979° N</span>
                <span className={s.techCode}>LON: 19.0402° E</span>
              </div>
            </div>
          </div>
          <div className={s.avatarWrapper}>
            <div className={s.avatarGlow} />
            <img src="/nova_v2.jpg" alt="NovaFeeds mascot" className={s.avatar} />
          </div>
        </div>

        <div className={s.statsRow}>
          <div className={s.stat}>
            <Zap size={22} className={s.statIcon} />
            <span className={s.statText}>Real-Time Delivery</span>
          </div>
          <div className={s.statSep} />
          <div className={s.stat}>
            <Globe size={22} className={s.statIcon} />
            <span className={s.statText}>Multi-Platform Feeds</span>
          </div>
          <div className={s.statSep} />
          <div className={s.stat}>
            <Shield size={22} className={s.statIcon} />
            <span className={s.statText}>Fully Customizable</span>
          </div>
        </div>
      </section>

      {/* ── Discord Preview ── */}
      <section id="preview" className={s.previewSection} ref={addRevealRef}>
        <div className={`${s.previewGrid} ${s.reveal}`} ref={addRevealRef}>
          <div>
            <span className={s.sectionLabel}>Stunning Layouts</span>
            <h2 className={s.sectionTitle}>The most beautiful alerts in Discord.</h2>
            <p className={s.sectionDesc}>
              High-fidelity message layouts with rich embeds, interactive buttons,
              and smart media handling.
            </p>
            <div className={s.previewFeatures}>
              {[
                { icon: <Zap size={18} />, text: "Rich Media Previews" },
                { icon: <Layout size={18} />, text: "Smart Embed V2" },
                { icon: <Rocket size={18} />, text: "Interactive Buttons" },
              ].map((f, i) => (
                <div key={i} className={s.previewFeat}>
                  <div className={s.previewFeatIcon}>{f.icon}</div>
                  <span className={s.previewFeatText}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={s.discordMock}>
            <div className={s.discordHeader}>
              <img src="/nova_v2.jpg" alt="" className={s.discordBotAvatar} />
              <div className={s.discordBotNameWrapper}>
                <span className={s.discordBotName}>NovaFeeds</span>
                <svg className={s.verifiedCheck} viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M7.4,11.17,4.26,8,3.29,9l4.11,4.11L13.51,7,12.54,6Z"></path></svg>
              </div>
              <span className={s.discordBotBadge}>BOT</span>
              <span className={s.discordTimestamp}>Today at 14:32</span>
            </div>
            <div className={s.discordEmbed}>
              <div>
                <div className={s.discordEmbedAuthor}>
                  <img src="/emojis/youtube.png" alt="" className={s.discordEmbedAuthorIcon} />
                  YouTube — New Upload
                </div>
                <div className={s.discordEmbedTitle}>🎬 Building the ULTIMATE Discord Bot Dashboard</div>
                <div className={s.discordEmbedDesc}>
                  In this video we build a complete web dashboard for managing Discord bot feeds with real-time updates...
                </div>
                <div className={s.discordEmbedImage}>▶ Video Preview</div>
                <div className={s.discordButtons}>
                  <button className={`${s.discordBtn} ${s.discordBtnBlurple}`}>Watch Now</button>
                  <button className={`${s.discordBtn} ${s.discordBtnGray}`}>Channel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className={s.section}>
        <div className={s.reveal} ref={addRevealRef}>
          <span className={s.sectionLabel}>Features</span>
          <h2 className={s.sectionTitle}>All the good stuff, none of the clutter</h2>
        </div>
        <div className={s.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div key={i} className={`${s.featureCard} ${s.reveal}`} ref={addRevealRef}>
              <div className={s.featureIcon}>{f.icon}</div>
              <h3 className={s.featureTitle}>{f.title}</h3>
              <p className={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform Carousel ── */}
      <section id="platforms" className={s.carousel}>
        <div className={s.carouselLabel}>Supported Platforms</div>
        <div className={s.carouselTrack}>
          {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
            <div key={i} className={s.carouselItem}>
              <img src={p.icon} alt={p.name} className={s.carouselIcon} />
              <span className={s.carouselName}>{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <img src="/nova_v2.jpg" alt="" className={s.footerLogo} />
            NovaFeeds
          </div>
          <ul className={s.footerLinks}>
            <li><a href="/privacy" className={s.footerLink}>Privacy</a></li>
            <li><a href="/terms" className={s.footerLink}>Terms</a></li>
            <li><a href="https://discord.gg/novafeeds" className={s.footerLink} target="_blank" rel="noopener noreferrer">Discord</a></li>
          </ul>
          <p className={s.footerCopy}>© {new Date().getFullYear()} NovaFeeds. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
