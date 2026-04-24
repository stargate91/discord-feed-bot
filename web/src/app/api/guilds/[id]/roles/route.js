import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
    const res = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json({ error: "Discord API Error", details: errorData }, { status: res.status });
    }

    const roles = await res.json();
    
    // Sort roles by position (highest first)
    const sortedRoles = roles
      .filter(r => r.name !== "@everyone") // Usually everyone role info isn't needed for selection
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : null
      }));

    return NextResponse.json(sortedRoles);
  } catch (error) {
    console.error("[Roles API GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
