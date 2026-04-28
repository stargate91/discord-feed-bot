import pool from "@/lib/db";
import fs from "fs";
import path from "path";

/**
 * Service for fetching dashboard statistics directly from the database (Server-side only).
 */
const dashboardService = {
  
  async getGlobalStats() {
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
  },

  async getGuildStats(guildId, session) {
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
};

export default dashboardService;
