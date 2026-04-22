import StatCard from "@/components/StatCard";
import LoginButton from "@/components/LoginButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";

// --- Minimal Components (Inlined to avoid any import/hydration issues) ---

function UsageIndicator({ label, current, max, unit = "" }) {
  const percentage = Math.min(Math.round((current / max) * 100), 100);
  let color = "#7b2cbf";
  if (percentage >= 100) color = "#ef4444";
  else if (percentage >= 80) color = "#f59e0b";

  return (
    <div style={{ marginBottom: '1.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>
        <span style={{ color: '#a0a0b0' }}>{label}</span>
        <span style={{ color: '#f8f8f8' }}>{current} / {max} {unit}</span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ height: '100%', borderRadius: '4px', width: `${percentage}%`, background: color, boxShadow: `0 0 10px ${color}` }}></div>
      </div>
    </div>
  );
}

function PricingCard({ label, days, isPopular = false }) {
  const priceValue = (days / 30 * 4.99).toFixed(2);
  return (
    <div className={`pricing-card ${isPopular ? 'popular' : ''}`} style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${isPopular ? '#7b2cbf' : 'rgba(255, 255, 255, 0.08)'}`,
      borderRadius: '20px',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      minWidth: '280px'
    }}>
      {isPopular && <div style={{ position: 'absolute', top: '-12px', background: '#7b2cbf', color: 'white', padding: '4px 15px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>Best Value</div>}
      <div style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', color: '#a0a0b0', marginBottom: '1.5rem' }}>{days} Days</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '2rem' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#9d4edd' }}>$</span>
        <span style={{ fontSize: '3rem', fontWeight: '900', color: 'white' }}>{priceValue}</span>
      </div>
      <ul style={{ listStyle: 'none', width: '100%', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '10px', padding: 0 }}>
        <li style={{ fontSize: '0.85rem' }}>✨ 100 Feed Monitors</li>
        <li style={{ fontSize: '0.85rem' }}>⚡ 5 Min Refresh Rate</li>
        <li style={{ fontSize: '0.85rem' }}>🏷️ Filtering & Roles</li>
      </ul>
      <button className="btn" style={{ width: '100%', marginTop: 'auto' }}>Select Plan</button>
    </div>
  );
}

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
    const guildInfo = await pool.query('SELECT premium_until FROM guild_settings WHERE guild_id = $1', [cleanId]);

    const premiumUntil = guildInfo.rows[0]?.premium_until;
    const now = new Date();
    const isMasterGuild = masterGuilds.hasOwnProperty(cleanId);
    const isLifetime = isMasterGuild || (premiumUntil && new Date(premiumUntil) > new Date('2090-01-01'));
    const isPremium = isLifetime || (premiumUntil && new Date(premiumUntil) > now);

    let maxMonitors = 3;
    if (isMasterGuild) maxMonitors = 1000;
    else if (isPremium) maxMonitors = 100;

    return {
      activeMonitors: parseInt(monitorsRes.rows[0].count || 0),
      totalMonitorsCount: parseInt(totalMonitorsRes.rows[0].count || 0),
      totalPosts: parseInt(statsRes.rows[0].sum || 0),
      isPremium,
      isLifetime,
      maxMonitors,
      viewType: `Guild ${cleanId}`
    };
  } catch (error) {
    console.error("[Dashboard] Guild DB Error:", error);
    return { error: error.message };
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
    <>
      <header className="header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>Welcome Back, {session.user.name}</h2>
        </div>
        <LoginButton session={session} />
      </header>

      <section className="dashboard-grid" style={{ marginBottom: '3rem' }}>
        <StatCard title="Active Monitors" value={stats ? stats.activeMonitors : "0"} description="Running on this server" />
        <StatCard title="Messages Sent" value={stats ? stats.totalPosts.toLocaleString() : "0"} description="Lifetime stats" />
        <StatCard 
          title="Premium Status" 
          value={stats?.isLifetime ? "Active (Lifetime)" : stats?.isPremium ? "Active (Premium)" : "Standard"} 
          valueColor={stats?.isPremium || stats?.isLifetime ? "var(--accent-color)" : "var(--text-secondary)"}
          actionButton={!stats?.isPremium && !stats?.isLifetime && guildId ? "Upgrade Server" : null}
        />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Plan Usage & Limits</h3>
            <UsageIndicator label="Feed Monitors" current={stats?.totalMonitorsCount || 0} max={stats?.maxMonitors || 3} unit="monitors" />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Your current plan allows for up to <strong>{stats?.maxMonitors}</strong> monitors.
            </p>
          </div>

          {!stats?.isPremium && (
            <div className="card highlight-card" style={{ padding: '2.5rem', background: 'rgba(123, 44, 191, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Ready for Premium?</h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>Unlock 100 monitors, role pings, and more.</p>
                </div>
                <button className="btn" style={{ padding: '0.8rem 2rem' }}>Upgrade Now</button>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Quick Actions</h3>
          <button className="btn btn-secondary-outline" style={{ width: '100%', textAlign: 'left', padding: '1rem' }}>Add New Feed</button>
          <button className="btn btn-secondary-outline" style={{ width: '100%', textAlign: 'left', padding: '1rem' }}>Manage Roles</button>
          <button className="btn btn-secondary-outline" style={{ width: '100%', textAlign: 'left', padding: '1rem' }}>Alert Templates</button>
        </div>
      </div>

      <section style={{ marginTop: '5rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '3rem' }}>Choose Your Plan</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <PricingCard label="1 Month" days={30} />
          <PricingCard label="3 Months" days={90} isPopular={true} />
          <PricingCard label="1 Year" days={365} />
        </div>
      </section>
    </>
  );
}
