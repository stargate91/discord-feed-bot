import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { notifyBotOfChange } from "@/lib/bot-sync";
import { canManageGuild } from "@/lib/permissions";

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

    // Full update logic
    const { name, target_channels, target_roles, embed_color, ...extra } = body;
    
    // Fetch current extra_settings to merge
    const currentRes = await pool.query('SELECT extra_settings FROM monitors WHERE id = $1', [id]);
    let extraSettings = currentRes.rows[0]?.extra_settings || {};
    
    // Update core fields
    if (name) {
      await pool.query('UPDATE monitors SET name = $1 WHERE id = $2', [name, id]);
    }

    // Merge extra settings
    if (target_channels !== undefined) extraSettings.target_channels = target_channels;
    if (target_roles !== undefined) extraSettings.target_roles = target_roles;
    if (embed_color !== undefined) extraSettings.embed_color = embed_color;
    
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
