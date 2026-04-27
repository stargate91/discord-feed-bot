import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { notifyBotOfChange } from "@/lib/bot-sync";
import { canManageGuild } from "@/lib/permissions";
import { getTierConfig } from "@/lib/config";

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next.js 15+ compatibility: params must be awaited
  const { id } = await params;

  // 1. Fetch the monitor to check which guild it belongs to
  const monitorRes = await pool.query('SELECT guild_id FROM monitors WHERE id = $1', [id]);
  if (monitorRes.rows.length === 0) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }
  const guildId = monitorRes.rows[0].guild_id;

  // 2. Security check: user must be master OR admin of the guild
  const allowed = await canManageGuild(session, guildId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();

  try {
    // If only 'enabled' is provided, it's a simple toggle
    if (Object.keys(body).length === 1 && body.enabled !== undefined) {
      await pool.query('UPDATE monitors SET enabled = $1 WHERE id = $2', [body.enabled, id]);
      await notifyBotOfChange();
      return NextResponse.json({ success: true });
    }

    // --- UNIFIED TIER & LIMIT ENFORCEMENT ---
    const guildRes = await pool.query('SELECT tier, premium_until FROM guild_settings WHERE guild_id = $1::bigint', [guildId]);
    const row = guildRes.rows[0];
    let tier = row?.tier || 0;
    const premiumUntil = row?.premium_until;

    // Legacy fallback: if tier 0 but premium_until is active, treat as Tier 3
    if (tier === 0 && premiumUntil && new Date(premiumUntil) > new Date()) {
      tier = 3;
    }

    const isMaster = session.user?.role === "master";
    const tierConfig = getTierConfig(tier);
    const maxChannelsRoles = isMaster ? 20 : (tierConfig.max_channels || 1);
    const features = tierConfig.features || [];

    // Full update logic
    const { name, target_channels, target_roles, embed_color, custom_alert, target_genres, target_languages, ...extra } = body;
    
    // Fetch current extra_settings to merge
    const currentRes = await pool.query('SELECT extra_settings FROM monitors WHERE id = $1', [id]);
    let extraSettings = {};
    if (currentRes.rows[0]?.extra_settings) {
      try {
        extraSettings = typeof currentRes.rows[0].extra_settings === 'string' 
          ? JSON.parse(currentRes.rows[0].extra_settings) 
          : currentRes.rows[0].extra_settings;
      } catch (e) {
        console.error("Failed to parse extra_settings:", e);
      }
    }
    
    // Update core fields
    if (name) {
      await pool.query('UPDATE monitors SET name = $1 WHERE id = $2', [name, id]);
    }

    if (target_channels !== undefined) {
      if (Array.isArray(target_channels) && target_channels.length > maxChannelsRoles) {
        return NextResponse.json({ error: `Limit reached! Your tier allows a maximum of ${maxChannelsRoles} target channels per monitor.` }, { status: 402 });
      }
      extraSettings.target_channels = target_channels;
    }
    
    if (target_roles !== undefined) {
      if (Array.isArray(target_roles) && target_roles.length > maxChannelsRoles) {
        return NextResponse.json({ error: `Limit reached! Your tier allows a maximum of ${maxChannelsRoles} ping roles per monitor.` }, { status: 402 });
      }
      extraSettings.target_roles = target_roles;
    }

    // Feature Gating based on config features
    if (embed_color !== undefined) {
      if (isMaster || features.includes("custom_color")) extraSettings.embed_color = embed_color;
      else extraSettings.embed_color = "#3d3f45";
    }

    if (custom_alert !== undefined) {
      if (!isMaster && !features.includes("alert_template")) {
        return NextResponse.json({ error: "Custom templates require Professional tier or higher" }, { status: 403 });
      }
      extraSettings.custom_alert = custom_alert;
    }

    if (target_genres !== undefined) {
      if (!isMaster && !features.includes("genre_filter")) {
        return NextResponse.json({ error: "Advanced filters require Starter tier or higher" }, { status: 403 });
      }
      extraSettings.target_genres = target_genres;
    }

    if (target_languages !== undefined) {
      if (!isMaster && !features.includes("tmdb_language_filter")) {
        return NextResponse.json({ error: "Advanced filters require Starter tier or higher" }, { status: 403 });
      }
      extraSettings.target_languages = target_languages;
    }
    
    if (body.use_native_player !== undefined) {
      if (!isMaster && !features.includes("basic")) { // Basic feature for YouTube
        return NextResponse.json({ error: "Native player mode requires Starter tier or higher" }, { status: 403 });
      }
      extraSettings.use_native_player = body.use_native_player;
    }
    
    // Merge any other platform-specific settings
    extraSettings = { ...extraSettings, ...extra };

    await pool.query('UPDATE monitors SET extra_settings = $1 WHERE id = $2', [JSON.stringify(extraSettings), id]);
    
    await notifyBotOfChange();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next.js 15+ compatibility: params must be awaited
  const { id } = await params;

  // 1. Fetch the monitor to check which guild it belongs to
  const monitorRes = await pool.query('SELECT guild_id FROM monitors WHERE id = $1', [id]);
  if (monitorRes.rows.length === 0) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }
  const guildId = monitorRes.rows[0].guild_id;

  // 2. Security check: user must be master OR admin of the guild
  const allowed = await canManageGuild(session, guildId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await pool.query('DELETE FROM monitors WHERE id = $1', [id]);
    await notifyBotOfChange();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
