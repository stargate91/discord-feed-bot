import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Next.js 15+ compatibility: params must be awaited
  const { id } = await params;
  const guildId = id;
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
