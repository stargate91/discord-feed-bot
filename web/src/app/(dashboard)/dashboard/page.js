import StatCard from "@/components/StatCard";
import LoginButton from "@/components/LoginButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, Send, Award } from "lucide-react";
import UsageIndicator from "@/components/UsageIndicator";
import QuickActions from "@/components/QuickActions";
import EmptyStateCard from "@/components/EmptyStateCard";
import dashboardService from "@/services/dashboardService";
import styles from "./dashboard.module.css";

export default async function Dashboard({ searchParams }) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const guildId = params.guild;

  if (session && !guildId) {
    redirect("/select-server");
  }

  const stats = guildId
    ? await dashboardService.getGuildStats(guildId, session)
    : await dashboardService.getGlobalStats();

  if (stats?.error) {
    return (
      <div className={`card ${styles.errorCard}`}>
        <h2>Dashboard Error</h2>
        <pre>{stats.error}</pre>
      </div>
    );
  }

  if (!session) {
    return redirect("/");
  }

  return (
    <div className={styles.dashboardPageContent}>
      <header className="ui-dashboard-header">
        <div className="ui-dashboard-info">
          <h1 className="ui-dashboard-title">Dashboard Overview</h1>
          <p className="ui-dashboard-subtitle">Welcome back, {session.user.name}.</p>
        </div>

        <div className="page-header-actions">
          <LoginButton session={session} />
        </div>
      </header>

      <section className={`dashboard-grid ${styles.dashboardGrid}`}>
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

      <div className={styles.mainLayout}>
        <div className={styles.leftColumn}>
          {stats?.totalMonitorsCount === 0 && (
            <EmptyStateCard guildId={guildId} />
          )}

          <div className="ui-card">
            <div className="ui-card-glow"></div>
            <h3 className={styles.usageTitle}>Plan Usage & Limits</h3>
            <UsageIndicator
              label="Feed Monitors"
              current={stats?.totalMonitorsCount || 0}
              max={stats?.isLifetime ? 1000 : (stats?.maxMonitors || 5)}
              unit="monitors"
            />
            <p className={styles.usageText}>
              {stats?.tierName === "Master" ? (
                <span>You have <strong>Master Access</strong> with unlimited capacity.</span>
              ) : (
                <span>Your current <strong>{stats?.tierName}</strong> plan allows for up to <strong>{stats?.maxMonitors}</strong> monitors.</span>
              )}
            </p>
          </div>

          {!stats?.isLifetime && stats?.tier < 3 && (
            <div className={`card highlight-card ${styles.upgradeCard}`}>
              <div className={styles.upgradeGlow}></div>

              <div className={styles.upgradeContent}>
                <div>
                  <h3>
                    {stats?.tier === 0 ? "Ready for Premium?" : "Ready to scale up?"}
                  </h3>
                  <p>
                    {stats?.tier === 0
                      ? "Unlock role pings, faster refresh, and more monitors."
                      : `Upgrade to ${stats?.tier === 1 ? "Operator" : "Architect"} for even higher limits and features.`}
                  </p>
                </div>
                <Link href={guildId ? `/premium?guild=${guildId}` : "/premium"}>
                  <button className={`btn ${styles.upgradeBtn}`}>
                    {stats?.tier === 0 ? "Upgrade Now" : "View Plans"}
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className={styles.rightColumn}>
          <QuickActions guildId={guildId} />
        </div>
      </div>
    </div>
  );
}
