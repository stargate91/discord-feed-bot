import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await pool.query('SELECT * FROM premium_codes ORDER BY created_at DESC');
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    await pool.query('DELETE FROM premium_codes WHERE code = $1', [code]);
    return NextResponse.json({ success: true });
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

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Mark code as revoked
      await client.query('UPDATE premium_codes SET is_revoked = TRUE WHERE code = $1', [code]);

      // 2. Find all guilds that used this code
      const affectedRes = await client.query('SELECT guild_id FROM premium_redemptions WHERE code = $1', [code]);
      const guildIds = affectedRes.rows.map(r => r.guild_id);

      if (guildIds.length > 0) {
        // 3. Reset these guilds to Free tier (tier 0, premium_until null)
        // We do this simply for now: if the code is revoked, the benefit is gone.
        await client.query(
          'UPDATE guild_settings SET tier = 0, premium_until = NULL WHERE guild_id = ANY($1::bigint[])',
          [guildIds]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, affectedGuilds: guildIds.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
