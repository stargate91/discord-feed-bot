import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { canManageGuild } from "@/lib/permissions";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: guildId } = await params;

  // Security Check
  const allowed = await canManageGuild(session, guildId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: "Server Configuration Error (Missing Token)" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json({ error: "Discord API Error", details: errorData }, { status: res.status });
    }

    const channels = await res.json();
    
    // Filter for Text Channels (0) and Announcement Channels (5)
    const textChannels = channels
      .filter(c => c.type === 0 || c.type === 5)
      .sort((a, b) => a.position - b.position)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type
      }));

    return NextResponse.json(textChannels);
  } catch (error) {
    console.error("[Channels API GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
