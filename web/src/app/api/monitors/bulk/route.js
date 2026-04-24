import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { notifyBotOfChange } from "@/lib/bot-sync";
import { canManageGuild } from "@/lib/permissions";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, guildId } = await request.json();
  const cleanId = String(guildId).replace('-', '');

  // 1. Authorization: Master users can do anything. 
  // Non-masters must have a paid tier on the specific guild.
  const isMaster = session.user.role === "master";
  
  if (!isMaster) {
    if (!guildId) return NextResponse.json({ error: "Guild ID required for non-masters" }, { status: 400 });

    // 2. Security check: user must be admin of the guild
    const allowed = await canManageGuild(session, guildId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden: You don't have permission for this server" }, { status: 403 });
    }

    try {
      const guildCheck = await pool.query(
        'SELECT tier, premium_until FROM guild_settings WHERE guild_id = $1',
        [cleanId]
      );
      
      const row = guildCheck.rows[0];
      const hasTier = row && (row.tier >= 1 || (row.premium_until && new Date(row.premium_until) > new Date()));
      
      if (!hasTier) {
        return NextResponse.json({ error: "Premium Tier required for bulk actions" }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  try {
    let query = "";
    let params = [];

    if (action === "delete") {
      if (guildId) {
        // Delete monitors
        await pool.query("DELETE FROM monitors WHERE guild_id = $1::bigint", [guildId]);
        
        // Factory Reset: Wipe all analytics and history for this guild
        await pool.query("DELETE FROM monitor_stats_daily WHERE guild_id = $1::bigint", [guildId]);
        await pool.query("DELETE FROM published_entries_v2 WHERE guild_id = $1::bigint", [guildId]);
        
        await notifyBotOfChange();
        return NextResponse.json({ success: true, message: `Factory reset completed successfully` });
      } else {
        // Global delete - exercise caution
        await pool.query("DELETE FROM monitors");
        await pool.query("DELETE FROM monitor_stats_daily");
        await pool.query("DELETE FROM published_entries_v2");
        
        await notifyBotOfChange();
        return NextResponse.json({ success: true, message: `Global reset completed successfully` });
      }
    } else if (action === "pause") {
      if (guildId) {
        query = "UPDATE monitors SET enabled = false WHERE guild_id = $1::bigint";
        params = [guildId];
      } else {
        query = "UPDATE monitors SET enabled = false";
      }
    } else if (action === "resume") {
      if (guildId) {
        query = "UPDATE monitors SET enabled = true WHERE guild_id = $1::bigint";
        params = [guildId];
      } else {
        query = "UPDATE monitors SET enabled = true";
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await pool.query(query, params);
    await notifyBotOfChange();
    return NextResponse.json({ success: true, message: `Bulk ${action} completed successfully` });
  } catch (error) {
    console.error("Bulk Action Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
