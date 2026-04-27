import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { notifyBotOfChange } from "@/lib/bot-sync";
import { canManageGuild } from "@/lib/permissions";
import { getGuildTierLimits, hasFeature } from "@/lib/config";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, guildId, monitorIds, target_channels, target_roles, embed_color, use_native_player } = body;
  const cleanId = guildId ? String(guildId).replace('-', '') : null;

  // 1. Authorization: Master users can do anything. 
  // Non-masters must have a paid tier on the specific guild.
  const isStaff = session.user.role === "master";
  
  if (!isStaff) {
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
      const tier = row?.tier || 0;
      const premiumUntil = row?.premium_until;
      
      const canBulkDelete = isStaff || hasFeature(tier, guildId, "bulk_delete", premiumUntil);
      
      if (action === "delete" && !canBulkDelete) {
        return NextResponse.json({ error: "Premium Tier required for bulk deletion" }, { status: 403 });
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
      if (monitorIds && monitorIds.length > 0) {
        await pool.query("DELETE FROM monitors WHERE id = ANY($1::int[])", [monitorIds]);
      } else if (cleanId) {
        await pool.query("DELETE FROM monitors WHERE guild_id = $1::bigint", [cleanId]);
        await pool.query("DELETE FROM monitor_stats_daily WHERE guild_id = $1::bigint", [cleanId]);
        await pool.query("DELETE FROM published_entries_v2 WHERE guild_id = $1::bigint", [cleanId]);
      } else {
        await pool.query("DELETE FROM monitors");
        await pool.query("DELETE FROM monitor_stats_daily");
        await pool.query("DELETE FROM published_entries_v2");
      }
      await notifyBotOfChange();
      return NextResponse.json({ success: true, message: `Deletion completed successfully` });
    } else if (action === "pause") {
      if (monitorIds && monitorIds.length > 0) {
        query = "UPDATE monitors SET enabled = false WHERE id = ANY($1::int[])";
        params = [monitorIds];
      } else if (guildId) {
        query = "UPDATE monitors SET enabled = false WHERE guild_id = $1::bigint";
        params = [guildId];
      } else {
        query = "UPDATE monitors SET enabled = false";
      }
    } else if (action === "resume") {
      if (monitorIds && monitorIds.length > 0) {
        query = "UPDATE monitors SET enabled = true WHERE id = ANY($1::int[])";
        params = [monitorIds];
      } else if (guildId) {
        query = "UPDATE monitors SET enabled = true WHERE guild_id = $1::bigint";
        params = [guildId];
      } else {
        query = "UPDATE monitors SET enabled = true";
      }
    } else if (action === "update") {
      let guildTier = 0;
      let premiumUntil = null;
      if (!isStaff) {
        const guildCheck = await pool.query(
          'SELECT tier, premium_until FROM guild_settings WHERE guild_id = $1',
          [cleanId]
        );
        guildTier = guildCheck.rows[0]?.tier || 0;
        premiumUntil = guildCheck.rows[0]?.premium_until;
        
        if (!hasFeature(guildTier, guildId, "bulk_settings_edit", premiumUntil)) {
          return NextResponse.json({ error: "Bulk editing requires Professional Tier (Tier 2) or higher" }, { status: 403 });
        }
      } else {
        guildTier = 999;
      }
      
      let monitorsToUpdate = [];
      if (monitorIds && monitorIds.length > 0) {
        monitorsToUpdate = monitorIds;
      } else if (guildId) {
        const guildRes = await pool.query("SELECT id FROM monitors WHERE guild_id = $1", [guildId]);
        monitorsToUpdate = guildRes.rows.map(r => r.id);
      }

      if (monitorsToUpdate.length === 0) {
        return NextResponse.json({ error: "No monitors found to update" }, { status: 400 });
      }

      for (const id of monitorsToUpdate) {
        const currentRes = await pool.query("SELECT type, extra_settings FROM monitors WHERE id = $1", [id]);
        let extra = {};
        const row = currentRes.rows[0];
        if (row?.extra_settings) {
          try { extra = JSON.parse(row.extra_settings); } catch(e) {}
        }

        if (target_channels) extra.target_channels = target_channels;
        if (target_roles) extra.target_roles = target_roles;
        if (embed_color && (isStaff || hasFeature(guildTier, guildId, "custom_color", premiumUntil))) {
           extra.embed_color = embed_color;
        }
        if (use_native_player !== undefined && row?.type === 'youtube' && (isStaff || hasFeature(guildTier, guildId, "basic", premiumUntil))) {
          extra.use_native_player = use_native_player;
        }

        await pool.query(
          "UPDATE monitors SET extra_settings = $1 WHERE id = $2",
          [JSON.stringify(extra), id]
        );
      }
      
      await notifyBotOfChange();
      return NextResponse.json({ success: true, message: `Successfully updated ${monitorsToUpdate.length} monitors` });
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
