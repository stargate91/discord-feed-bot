import StatCard from "@/components/StatCard";
import NotificationTimeline from "@/components/NotificationTimeline";
import LoginButton from "@/components/LoginButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Shield, MessageSquare, Activity, Send, Award, Zap, Globe } from "lucide-react";
import fs from "fs";
import path from "path";
import UsageIndicator from "@/components/UsageIndicator";
import QuickActions from "@/components/QuickActions";

async function getGlobalStats() {
  try {
    const monitorsRes = await pool.query('SELECT COUNT(*) FROM monitors WHERE enabled = true');
    const statsRes = await pool.query('SELECT SUM(post_count) FROM monitor_stats_daily');
    const guildsRes = await pool.query('SELECT COUNT(*) FROM guild_settings');

    return {
      activeMonitors: parseInt(monitorsRes.rows[0].count),
      totalPosts: parseInt(statsRes.rows[0].sum) || 0,
      totalGuilds: parseInt(guildsRes.rows[0].count),
      viewType: "Global"
    };
  } catch (error) {
    console.error("DB Fetch Error:", error);
    return { error: error.message };
  }
}

async function getGuildStats(guildId, session) {
  if (!session) return null;
  const cleanId = String(guildId).replace('-', '');
  try {
    let masterGuilds = {};
    try {
      const configPath = path.join(process.cwd(), '..', 'config.json');
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf8');
        const sanitizedData = rawData.replace(/:\s*([0-9]{15,})/g, ': "$1"');
        const config = JSON.parse(sanitizedData);
        masterGuilds = config.master_guilds || {};
      }
    } catch (e) {
      console.error("[Dashboard] Config Load Error:", e.message);
    }

    const monitorsRes = await pool.query('SELECT COUNT(*) FROM monitors WHERE guild_id = $1 AND enabled = true', [cleanId]);
    const totalMonitorsRes = await pool.query('SELECT COUNT(*) FROM monitors WHERE guild_id = $1', [cleanId]);
    const statsRes = await pool.query('SELECT SUM(post_count) FROM monitor_stats_daily WHERE guild_id = $1', [cleanId]);
    const guildInfo = await pool.query('SELECT premium_until, tier FROM guild_settings WHERE guild_id = $1', [cleanId]);

    const premiumUntil = guildInfo.rows[0]?.premium_until;
    let tier = guildInfo.rows[0]?.tier || 0;
    const now = new Date();
    const isMasterGuild = masterGuilds.hasOwnProperty(cleanId);

    // Legacy support: If tier is 0 but premium_until is valid, treat as Tier 3
    const isLegacyPremium = premiumUntil && new Date(premiumUntil) > now;
    if (tier === 0 && isLegacyPremium) tier = 3;

    const isLifetime = isMasterGuild || (premiumUntil && new Date(premiumUntil) > new Date('2090-01-01'));
    const isPremium = isLifetime || tier >= 1;

    let maxMonitors = 3;
    if (isMasterGuild) maxMonitors = 1000;
    else {
      switch (tier) {
        case 1: maxMonitors = 10; break;
        case 2: maxMonitors = 30; break;
        case 3: maxMonitors = 100; break;
        default: maxMonitors = 3;
      }
    }

    const tierNames = ["Free", "Starter", "Professional", "Ultimate"];
    const currentTierName = isMasterGuild ? "Master" : tierNames[tier];

    return {
      activeMonitors: parseInt(monitorsRes.rows[0].count || 0),
      totalMonitorsCount: parseInt(totalMonitorsRes.rows[0].count || 0),
      totalPosts: parseInt(statsRes.rows[0].sum || 0),
      isPremium,
      isLifetime,
      maxMonitors,
      tier,
      tierName: currentTierName,
      viewType: `Guild ${cleanId}`
    };
  } catch (error) {
    console.error("[Dashboard] Guild DB Error:", error);
    return { error: error.message };
  }
}

async function getRecentNotifications(guildId = null) {
  try {
    let q = 'SELECT platform, entry_id, feed_url, published_at FROM published_entries_v2';
    let params = [];
    
    if (guildId) {
      const cleanId = String(guildId).replace('-', '');
      q += ' WHERE guild_id = $1';
      params.push(cleanId);
    }
    
    q += ' ORDER BY published_at DESC LIMIT 5';
    const res = await pool.query(q, params);
    return res.rows;
  } catch (error) {
    console.error("[Dashboard] Notification Fetch Error:", error);
    return [];
  }
}

export default async function Dashboard({ searchParams }) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const guildId = params.guild;

  if (session && !guildId) {
    redirect("/select-server");
  }

  const stats = guildId
    ? await getGuildStats(guildId, session)
    : await getGlobalStats();

  const notifications = await getRecentNotifications(guildId);

  if (stats?.error) {
    return (
      <div className="card" style={{ padding: '2rem', border: '1px solid #ef4444' }}>
        <h2 style={{ color: '#ef4444' }}>Dashboard Error</h2>
        <pre style={{ opacity: 0.7, marginTop: '1rem' }}>{stats.error}</pre>
      </div>
    );
  }

  if (!session) {
    return redirect("/");
  }

  return (
    <div className="dashboard-page-content" style={{ maxWidth: '100%', margin: '0 auto' }}>
      <header className="header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2>Dashboard Overview</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Welcome back, {session.user.name}. Track your server&apos;s feed activity and performance.
          </p>
        </div>
        <LoginButton session={session} />
      </header>

      <section className="dashboard-grid" style={{ marginBottom: '3rem' }}>
        <StatCard 
          title="Active Monitors" 
          value={stats ? stats.activeMonitors : "0"} 
          description="Running on this server" 
          icon={Activity}
        />
        <StatCard 
          title="Messages Sent" 
          value={stats ? stats.totalPosts.toLocaleString() : "0"} 
          description="Lifetime stats" 
          icon={Send}
        />
        <StatCard
          title="Premium Status"
          value={stats?.tierName || "Free"}
          valueColor={stats?.tier >= 1 || stats?.isLifetime ? "var(--accent-color)" : "var(--text-secondary)"}
          actionButton={stats?.tier === 0 && !stats?.isLifetime && guildId ? "Upgrade Server" : null}
          actionHref={guildId ? `/premium?guild=${guildId}` : "/premium"}
          icon={Award}
        />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{
              fontSize: '0.8rem',
              fontWeight: '800',
              color: 'rgba(255, 255, 255, 0.4)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              margin: 0,
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: '1.5rem'
            }}>Plan Usage & Limits</h3>
            <UsageIndicator 
              label="Feed Monitors" 
              current={stats?.totalMonitorsCount || 0} 
              max={stats?.isLifetime ? 1000 : (stats?.maxMonitors || 5)} 
              unit="monitors" 
            />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {stats?.tierName === "Master" ? (
                <span>You have <strong>Master Access</strong> with unlimited capacity.</span>
              ) : (
                <span>Your current <strong>{stats?.tierName}</strong> plan allows for up to <strong>{stats?.maxMonitors}</strong> monitors.</span>
              )}
            </p>
          </div>

          {!stats?.isLifetime && stats?.tier < 3 && (
            <div className="card highlight-card" style={{ 
              padding: '2rem', 
              background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.1) 0%, rgba(60, 9, 108, 0.05) 100%)',
              border: '1px solid rgba(123, 44, 191, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', 
                background: 'var(--accent-color)', opacity: 0.05, borderRadius: '50%', filter: 'blur(30px)' 
              }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.4rem' }}>
                    {stats?.tier === 0 ? "Ready for Premium?" : "Ready to scale up?"}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '350px' }}>
                    {stats?.tier === 0 
                      ? "Unlock role pings, faster refresh, and more monitors." 
                      : `Upgrade to ${stats?.tier === 1 ? "Operator" : "Architect"} for even higher limits and features.`}
                  </p>
                </div>
                <Link href={guildId ? `/premium?guild=${guildId}` : "/premium"}>
                  <button className="btn" style={{ 
                    padding: '0.7rem 1.5rem', fontSize: '0.9rem', fontWeight: '700',
                    boxShadow: '0 10px 20px rgba(123, 44, 191, 0.1)'
                  }}>
                    {stats?.tier === 0 ? "Upgrade Now" : "View Plans"}
                  </button>
                </Link>
              </div>
            </div>
          )}

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <NotificationTimeline notifications={notifications} />
          <QuickActions guildId={guildId} />
        </div>
      </div>
    </div>
  );
}
