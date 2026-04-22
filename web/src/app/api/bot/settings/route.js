import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await pool.query('SELECT key, value FROM bot_settings WHERE key IN (\'status_rotation_mode\', \'presence_interval_seconds\')');
    const settings = {};
    res.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    // Defaults if missing
    if (!settings.status_rotation_mode) settings.status_rotation_mode = 'random';
    if (!settings.presence_interval_seconds) settings.presence_interval_seconds = '60';

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, value } = await request.json();
  if (!key || value === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const q = 'INSERT INTO bot_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value';
    await pool.query(q, [key, String(value)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
