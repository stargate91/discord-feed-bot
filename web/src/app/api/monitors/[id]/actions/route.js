import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import pool from "@/lib/db";

const TIER_PURGE_LIMITS = { 0: 10, 1: 25, 2: 50, 3: 100 };

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action, count, amount } = await request.json();
  const BOT_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || "http://localhost:8080";
  const isMaster = session.user?.role === "master";

  // --- Server-side tier enforcement ---
  let tier = 0;
  if (!isMaster) {
    try {
      // 1. Get guild_id from the monitor
      const monitorRes = await pool.query('SELECT guild_id FROM monitors WHERE id = $1', [id]);
      if (!monitorRes.rows[0]) {
        return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
      }
      const guildId = monitorRes.rows[0].guild_id;

      // 2. Get tier from guild_settings
      const guildRes = await pool.query('SELECT tier FROM guild_settings WHERE guild_id = $1', [guildId]);
      tier = guildRes.rows[0]?.tier || 0;
    } catch (e) {
      console.error("[API Action] Tier lookup failed:", e);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Block repost for tier < 2
    if (action === "repost" && tier < 2) {
      return NextResponse.json({ error: "Repost requires Professional tier or higher" }, { status: 403 });
    }
  }

  // Cap purge amount based on tier (master = unlimited)
  const maxPurge = isMaster ? 100 : (TIER_PURGE_LIMITS[tier] || 10);
  const safePurgeAmount = Math.min(amount || 10, maxPurge);

  try {
    let endpoint = "";
    if (action === "check") endpoint = `/monitors/${id}/check`;
    else if (action === "repost") endpoint = `/monitors/${id}/repost?count=${count || 1}`;
    else if (action === "purge") endpoint = `/monitors/${id}/purge?amount=${safePurgeAmount}`;
    else if (action === "reset") endpoint = `/monitors/${id}/reset`;
    else return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const res = await fetch(`${BOT_WEBHOOK_URL}${endpoint}`, {
      method: "POST",
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json({ error: errorData.detail || "Bot action failed" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API Action] Error performing ${action} for ${id}:`, error);
    return NextResponse.json({ error: "Could not connect to bot server" }, { status: 500 });
  }
}
