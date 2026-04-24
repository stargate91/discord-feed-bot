import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guild");
  const days = parseInt(searchParams.get("days")) || 14;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Case 1: Guild-specific stats
    if (guildId) {
      console.log(`[API Stats] Fetching stats for guild: ${guildId}, days: ${days}`);
      
      // 1. Message History (Dynamic Interval)
      const historyRes = await pool.query(`
        SELECT date::text, SUM(post_count) as count 
        FROM monitor_stats_daily 
        WHERE guild_id = $1::bigint AND date::date >= CURRENT_DATE - ($2 || ' days')::interval
        GROUP BY date 
        ORDER BY date ASC
      `, [guildId, days]);

      // 2. Platform Breakdown
      const platformRes = await pool.query(`
        SELECT platform, SUM(post_count) as count 
        FROM monitor_stats_daily 
        WHERE guild_id = $1::bigint AND date::date >= CURRENT_DATE - ($2 || ' days')::interval
        GROUP BY platform
        ORDER BY count DESC
      `, [guildId, days]);

      // 3. Totals for this guild
      const totalsRes = await pool.query(`
        SELECT SUM(post_count) as total_posts, COUNT(DISTINCT platform) as platform_count
        FROM monitor_stats_daily
        WHERE guild_id = $1::bigint AND date::date >= CURRENT_DATE - ($2 || ' days')::interval
      `, [guildId, days]);

      const monitorsRes = await pool.query('SELECT COUNT(*) FROM monitors WHERE guild_id = $1::bigint AND enabled = true', [guildId]);

      // 4. Heatmap Data (Day/Hour distribution)
      const heatmapRes = await pool.query(`
        SELECT 
          EXTRACT(DOW FROM published_at)::int as day,
          EXTRACT(HOUR FROM published_at)::int as hour,
          COUNT(*)::int as count
        FROM published_entries_v2
        WHERE guild_id = $1::bigint AND published_at >= CURRENT_DATE - ($2 || ' days')::interval
        GROUP BY day, hour
        ORDER BY day, hour
      `, [guildId, days]);

      const result = {
        history: historyRes.rows,
        platforms: platformRes.rows,
        totalPosts: parseInt(totalsRes.rows[0]?.total_posts) || 0,
        activeMonitors: parseInt(monitorsRes.rows[0]?.count) || 0,
        platformCount: parseInt(totalsRes.rows[0]?.platform_count) || 0,
        heatmap: heatmapRes.rows
      };

      console.log(`[API Stats] Success for guild ${guildId}`);
      return NextResponse.json(result);
    }

    // Case 2: Global stats (Masters only)
    if (session.user.role !== "master") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const monitorsRes = await pool.query('SELECT COUNT(*) FROM monitors WHERE enabled = true');
    const statsRes = await pool.query('SELECT SUM(post_count) FROM monitor_stats_daily');
    const guildsRes = await pool.query('SELECT COUNT(*) FROM guild_settings');

    return NextResponse.json({
      activeMonitors: parseInt(monitorsRes.rows[0].count),
      totalPosts: parseInt(statsRes.rows[0].sum) || 0,
      totalGuilds: parseInt(guildsRes.rows[0].count)
    });

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
