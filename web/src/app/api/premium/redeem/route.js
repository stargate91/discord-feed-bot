import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { code, guildId } = await request.json();

    if (!code || !guildId) {
      return NextResponse.json({ error: "Missing code or guildId" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Check code validity with LOCK
      const codeRes = await client.query(
        "SELECT duration_days, max_uses, used_count, is_revoked, tier FROM premium_codes WHERE code = $1 FOR UPDATE",
        [code.toUpperCase().trim()]
      );

      if (codeRes.rows.length === 0) {
        throw new Error("Invalid Code");
      }

      const row = codeRes.rows[0];
      if (row.is_revoked) {
        throw new Error("Code Revoked");
      }

      if (row.used_count >= row.max_uses) {
        throw new Error("Code already used");
      }

      const tier = row.tier || 3;

      // 2. Increment used_count
      await client.query(
        "UPDATE premium_codes SET used_count = used_count + 1 WHERE code = $1",
        [code.toUpperCase().trim()]
      );

      // 3. Fetch current guild premium settings
      const gRes = await client.query(
        "SELECT premium_until FROM guild_settings WHERE guild_id = $1::bigint",
        [guildId]
      );
      
      const current_until = gRes.rows[0]?.premium_until ? new Date(gRes.rows[0].premium_until) : null;
      const now = new Date();
      const duration_days = row.duration_days;
      let new_until;

      // 4. Calculate new until date
      if (duration_days === 0) {
        // Lifetime
        new_until = new Date(2099, 11, 31); // Dec 31, 2099
      } else {
        if (current_until && current_until > now) {
          new_until = new Date(current_until.getTime() + duration_days * 24 * 60 * 60 * 1000);
        } else {
          new_until = new Date(now.getTime() + duration_days * 24 * 60 * 60 * 1000);
        }
      }

      // 5. Update guild_settings
      await client.query(`
        INSERT INTO guild_settings (guild_id, premium_until, tier)
        VALUES ($1::bigint, $2, $3)
        ON CONFLICT (guild_id) DO UPDATE SET
          premium_until = EXCLUDED.premium_until,
          tier = EXCLUDED.tier
      `, [guildId, new_until, tier]);

      await client.query('COMMIT');
      return NextResponse.json({ success: true, newUntil: new_until });

    } catch (err) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: err.message }, { status: 400 });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("[Redeem API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
