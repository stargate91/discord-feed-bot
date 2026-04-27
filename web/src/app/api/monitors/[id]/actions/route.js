import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { canManageGuild } from "@/lib/permissions";

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

  // --- Unified Bot Check (Permissions + Tier + Features) ---
  const monitorRes = await pool.query('SELECT guild_id FROM monitors WHERE id = $1', [id]);
  if (!monitorRes.rows[0]) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }
  const guildId = monitorRes.rows[0].guild_id;

  const botInfo = await getBotPermissions(guildId, session.user.id);
  
  if (!botInfo) {
    return NextResponse.json({ error: "Could not verify permissions with bot" }, { status: 503 });
  }

  // 1. Security check:
  if (!botInfo.is_admin && session.user.role !== "master") {
    return NextResponse.json({ error: "Forbidden: You don't have permission for this server" }, { status: 403 });
  }

  // 2. Feature check:
  if (action === "repost" && !botInfo.features.includes("repost") && session.user.role !== "master") {
    return NextResponse.json({ error: `Repost requires ${botInfo.tier === 0 ? 'Professional' : 'higher'} tier` }, { status: 403 });
  }

  // 3. Limits enforcement:
  const limits = botInfo.limits || {};
  const maxPurge = session.user.role === "master" ? 100 : (limits.max_purge || 10);
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
      headers: {
        "x-webhook-secret": process.env.WEBHOOK_SECRET || ""
      }
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
