import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const { action } = await request.json();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const BOT_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || "http://localhost:8080";
  let endpoint = "/monitors/reset-all";
  if (action === "factory") endpoint = "/admin/factory-reset";

  try {
    const res = await fetch(`${BOT_WEBHOOK_URL}${endpoint}`, {
      method: "POST",
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json({ error: errorData.detail || "Global reset failed" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API Admin Reset] Error:`, error);
    return NextResponse.json({ error: "Could not connect to bot server" }, { status: 500 });
  }
}
