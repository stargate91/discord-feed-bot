import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { canManageGuild } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { notifyBotOfChange } from "@/lib/bot-sync";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guild')?.trim();

  // Security check:
  // 1. If guildId is provided, check if user can manage THAT guild
  // 2. If no guildId is provided, ONLY master users can see ALL monitors
  if (guildId) {
    const allowed = await canManageGuild(session, guildId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden: You don't have permission for this server" }, { status: 403 });
    }
  } else if (session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized: Only master users can view all monitors" }, { status: 401 });
  }

  try {
    let query = 'SELECT * FROM monitors';
    let values = [];

    if (guildId) {
      query += ' WHERE guild_id = $1';
      values.push(guildId);
    }

    query += ' ORDER BY id DESC';

    const res = await pool.query(query, values);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { type, name, guildId, target_channels, target_roles, embed_color, ...rest } = data;

    if (!guildId) {
      return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
    }

    // Security check: user must be master OR admin of the guild
    const allowed = await canManageGuild(session, guildId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // --- MONITOR LIMIT ENFORCEMENT ---
    const guildInfo = await pool.query('SELECT tier FROM guild_settings WHERE guild_id = $1', [guildId]);
    const tier = guildInfo.rows[0]?.tier || 0;
    
    const countRes = await pool.query('SELECT COUNT(*) FROM monitors WHERE guild_id = $1', [guildId]);
    const currentCount = parseInt(countRes.rows[0].count);

    let maxAllowed = 3;
    let maxChannelsRoles = 1;
    if (session.user.role === "master") {
      maxAllowed = 1000;
      maxChannelsRoles = 20;
    } else {
      switch (tier) {
        case 1: maxAllowed = 10; maxChannelsRoles = 5; break;
        case 2: maxAllowed = 30; maxChannelsRoles = 10; break;
        case 3: maxAllowed = 100; maxChannelsRoles = 20; break;
        default: maxAllowed = 3; maxChannelsRoles = 1;
      }
    }

    if (currentCount >= maxAllowed) {
      return NextResponse.json({ error: `Limit reached! Your ${tier === 0 ? 'Free' : 'Premium'} plan only allows ${maxAllowed} monitors.` }, { status: 402 });
    }
    // ---------------------------------

    if (!type || !name || !guildId) {
      return NextResponse.json({ error: "Missing required fields (type, name, guildId)" }, { status: 400 });
    }

    const tChannels = Array.isArray(target_channels) ? target_channels : [];
    const tRoles = Array.isArray(target_roles) ? target_roles : [];

    if (tChannels.length === 0) {
      return NextResponse.json({ error: "You must select at least one target channel." }, { status: 400 });
    }

    if (tChannels.length > maxChannelsRoles) {
      return NextResponse.json({ error: `Limit reached! Your tier allows a maximum of ${maxChannelsRoles} target channels per monitor.` }, { status: 402 });
    }
    if (tRoles.length > maxChannelsRoles) {
      return NextResponse.json({ error: `Limit reached! Your tier allows a maximum of ${maxChannelsRoles} ping roles per monitor.` }, { status: 402 });
    }

    // Build extra_settings from remaining fields
    const extra_settings = {
      target_channels: tChannels,
      target_roles: tRoles,
      ...rest
    };

    // Premium field filtering on creation
    if (session.user.role !== "master") {
      if (embed_color && tier >= 1) extra_settings.embed_color = embed_color;
      else if (!embed_color) extra_settings.embed_color = "#7b2cbf"; // default

      if (rest.custom_alert && tier < 2) delete extra_settings.custom_alert;
      if (rest.target_genres && tier < 1) delete extra_settings.target_genres;
      if (rest.target_languages && tier < 1) delete extra_settings.target_languages;
    } else {
      extra_settings.embed_color = embed_color || "#7b2cbf";
    }

    const query = `
      INSERT INTO monitors (guild_id, type, name, discord_channel_id, ping_role_id, enabled, extra_settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      guildId,
      type,
      name,
      0, // legacy discord_channel_id
      0, // legacy ping_role_id
      true, // enabled by default
      JSON.stringify(extra_settings)
    ];

    const res = await pool.query(query, values);
    
    // Notify the bot of the new monitor
    await notifyBotOfChange();
    
    return NextResponse.json(res.rows[0]);
  } catch (error) {
    console.error("[Monitors POST] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
