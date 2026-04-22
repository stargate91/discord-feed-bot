import LoginButton from "@/components/LoginButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  let stats = { activeMonitors: 0, totalPosts: 0, totalGuilds: 0 };
  try {
    const monitorsRes = await pool.query('SELECT COUNT(*) FROM monitors WHERE enabled = true');
    const statsRes = await pool.query('SELECT SUM(post_count) FROM monitor_stats_daily');
    const guildsRes = await pool.query('SELECT COUNT(*) FROM guild_settings');
    stats = {
      activeMonitors: parseInt(monitorsRes.rows[0].count),
      totalPosts: parseInt(statsRes.rows[0].sum) || 0,
      totalGuilds: parseInt(guildsRes.rows[0].count)
    };
  } catch (e) {
    console.error("Landing stats failed:", e);
  }

  return (
    <div className="landing-page is-landing text-center">
      <header className="header" style={{ justifyContent: 'center' }}>
        <div className="nova-tag">NOVA</div>
      </header>

      <div className="landing-hero">
        <div className="logo-container">
          <img src="/nova.jpg" alt="NOVA" className="landing-logo" />
        </div>
        <h1 className="hero-title">Your Feeds. Elevated.</h1>
        <p className="hero-subtitle">
          Track free games, news, and updates with the most advanced Discord companion.
        </p>
        <div className="landing-cta" style={{ justifyContent: 'center' }}>
          <LoginButton session={session} />
        </div>
      </div>

      <div className="landing-stats-grid">
        <div className="landing-stat-card">
          <div className="stat-label">Active Feeds</div>
          <div className="stat-value">{stats.activeMonitors.toLocaleString()}</div>
        </div>
        <div className="landing-stat-card">
          <div className="stat-label">Messages Sent</div>
          <div className="stat-value">{stats.totalPosts.toLocaleString()}</div>
        </div>
        <div className="landing-stat-card">
          <div className="stat-label">Servers</div>
          <div className="stat-value">{stats.totalGuilds}</div>
        </div>
      </div>
    </div>
  );
}
