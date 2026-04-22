import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { notifyBotOfChange } from "@/lib/bot-sync";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, guildId } = await request.json();

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  try {
    let query = "";
    let params = [];

    if (action === "delete") {
      if (guildId) {
        query = "DELETE FROM monitors WHERE guild_id = $1::bigint";
        params = [guildId];
      } else {
        // Global delete - exercise caution
        query = "DELETE FROM monitors";
      }
    } else if (action === "pause") {
      if (guildId) {
        query = "UPDATE monitors SET enabled = false WHERE guild_id = $1::bigint";
        params = [guildId];
      } else {
        query = "UPDATE monitors SET enabled = false";
      }
    } else if (action === "resume") {
      if (guildId) {
        query = "UPDATE monitors SET enabled = true WHERE guild_id = $1::bigint";
        params = [guildId];
      } else {
        query = "UPDATE monitors SET enabled = true";
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await pool.query(query, params);
    await notifyBotOfChange();
    return NextResponse.json({ success: true, message: `Bulk ${action} completed successfully` });
  } catch (error) {
    console.error("Bulk Action Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
