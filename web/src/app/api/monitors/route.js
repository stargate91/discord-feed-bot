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
      query += ' WHERE guild_id = $1::bigint';
      values.push(guildId);
    }

    query += ' ORDER BY id DESC';

    const res = await pool.query(query, values);
    
    // Parse and flatten extra_settings for each monitor
    const monitors = res.rows.map(row => {
      let extra = {};
      if (row.extra_settings) {
        try {
          extra = typeof row.extra_settings === 'string' 
            ? JSON.parse(row.extra_settings) 
            : row.extra_settings;
          
          // Data healing: If it's double nested, flatten it
          if (extra.extra_settings && typeof extra.extra_settings === 'object') {
            const nested = extra.extra_settings;
            delete extra.extra_settings;
            extra = { ...extra, ...nested };
          }
        } catch (e) {
          console.error(`Failed to parse extra_settings for monitor ${row.id}:`, e);
        }
      }

      // Merge extra into core object
      const m = { ...row, ...extra };

      // Ensure target_channels/roles exist
      if (!m.target_channels) {
        m.target_channels = row.discord_channel_id && String(row.discord_channel_id) !== '0' ? [String(row.discord_channel_id)] : [];
      }
      if (!m.target_roles) {
        m.target_roles = row.ping_role_id && String(row.ping_role_id) !== '0' ? [String(row.ping_role_id)] : [];
      }

      return m;
    });

    return NextResponse.json(monitors);
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
    const { type, name, guildId, target_channels, target_roles, embed_color, send_initial_alert, ...rest } = data;

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
      target_channels: (tChannels || []).map(id => String(id)),
      target_roles: (tRoles || []).map(id => String(id)),
      send_initial_alert: send_initial_alert ?? true,
      ...rest
    };

    // Premium field filtering on creation
    if (session.user.role !== "master") {
      if (embed_color && tier >= 1) extra_settings.embed_color = embed_color;
      else if (!embed_color) extra_settings.embed_color = "#3d3f45"; // default

      if (rest.custom_alert && tier < 2) delete extra_settings.custom_alert;
      if (rest.target_genres && tier < 1) delete extra_settings.target_genres;
      if (rest.target_languages && tier < 1) delete extra_settings.target_languages;
      if (rest.use_native_player !== undefined) {
        if (tier < 1) delete extra_settings.use_native_player;
        else extra_settings.use_native_player = rest.use_native_player;
      }
    } else {
      extra_settings.embed_color = embed_color || "#3d3f45";
      if (rest.use_native_player !== undefined) extra_settings.use_native_player = rest.use_native_player;
    }

    const query = `
      INSERT INTO monitors (guild_id, type, name, discord_channel_id, ping_role_id, enabled, extra_settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      String(guildId),
      type,
      name,
      extra_settings.target_channels[0] || "0",
      extra_settings.target_roles[0] || "0",
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
