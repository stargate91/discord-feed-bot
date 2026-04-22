import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get('guild');

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
  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { type, name, guildId, target_channels, target_roles, embed_color, ...rest } = data;

    if (!type || !name || !guildId) {
      return NextResponse.json({ error: "Missing required fields (type, name, guildId)" }, { status: 400 });
    }

    // Build extra_settings from remaining fields
    const extra_settings = {
      target_channels: target_channels || [],
      target_roles: target_roles || [],
      embed_color: embed_color || "#7b2cbf",
      ...rest
    };

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
    return NextResponse.json(res.rows[0]);
  } catch (error) {
    console.error("[Monitors POST] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
