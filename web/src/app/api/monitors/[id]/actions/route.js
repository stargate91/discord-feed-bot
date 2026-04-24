import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action, count, amount } = await request.json();
  const BOT_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || "http://localhost:8080";

  try {
    let endpoint = "";
    if (action === "check") endpoint = `/monitors/${id}/check`;
    else if (action === "repost") endpoint = `/monitors/${id}/repost?count=${count || 1}`;
    else if (action === "purge") endpoint = `/monitors/${id}/purge?amount=${amount || 50}`;
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
