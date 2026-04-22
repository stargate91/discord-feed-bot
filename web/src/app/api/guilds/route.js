import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch user guilds from Discord API
    console.log("[API/Guilds] Fetching guilds from Discord...");
    const discordRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    if (!discordRes.ok) {
      const errorText = await discordRes.text();
      console.error("[API/Guilds] Discord API Error:", discordRes.status, errorText);
      
      if (discordRes.status === 429) {
        const rateLimitData = JSON.parse(errorText);
        return NextResponse.json({ 
          error: "Discord Rate Limit", 
          details: `Please wait ${rateLimitData.retry_after || 'a few'} seconds. Dashboard is making too many requests.` 
        }, { status: 429 });
      }

      return NextResponse.json({ error: `Discord API: ${discordRes.status}`, details: errorText }, { status: discordRes.status });
    }

    const userGuilds = await discordRes.json();
    console.log(`[API/Guilds] Found ${userGuilds.length} guilds for user.`);

    // 2. Fetch our bot's guild settings from DB
    console.log("[API/Guilds] Fetching bot settings from DB...");
    const dbRes = await pool.query('SELECT guild_id, premium_until FROM guild_settings');
    const botGuildsMap = {};
    dbRes.rows.forEach(row => {
      // In node-postgres, bigint is returned as string, but let's be safe
      botGuildsMap[String(row.guild_id)] = row.premium_until;
    });

    // 3. Load Master Guilds from config.json
    console.log("[API/Guilds] Loading config.json...");
    let config = {};
    try {
      const configPath = path.resolve(process.cwd(), '../config.json');
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf8');
        // Regex to find large numbers and wrap them in quotes to prevent precision loss
        const sanitizedData = rawData.replace(/:\s*([0-9]{15,})/g, ': "$1"');
        config = JSON.parse(sanitizedData);
      }
    } catch (cfgErr) {
      console.error("[API/Guilds] Config load failed (non-critical):", cfgErr);
    }
    
    const masterGuilds = config.master_guilds || {};

    // 4. Enrich & Filter
    console.log("[API/Guilds] Enriching guild data...");
    const enrichedGuilds = userGuilds.map(guild => {
      try {
        const isOwner = guild.owner;
        // Check permissions safely
        const perms = BigInt(guild.permissions || "0");
        const isAdmin = (perms & BigInt(0x8)) === BigInt(0x8);
        const isManageGuild = (perms & BigInt(0x20)) === BigInt(0x20);
        
        const guildIdStr = String(guild.id);
        const hasBot = botGuildsMap.hasOwnProperty(guildIdStr);
        const premiumUntil = botGuildsMap[guildIdStr];
        const isPremium = premiumUntil && new Date(premiumUntil) > new Date();
        const isMaster = masterGuilds.hasOwnProperty(guildIdStr);

        return {
          id: guildIdStr,
          name: guild.name,
          icon: guild.icon,
          hasBot,
          isPremium,
          isMaster,
          isOwner,
          isAdmin,
          canManage: isOwner || isAdmin || isManageGuild
        };
      } catch (err) {
        console.error(`[API/Guilds] Error processing guild ${guild.id}:`, err);
        return null;
      }
    })
    .filter(g => g !== null)
    .filter(g => g.canManage);

    // Sort: Master first, then Premium, then Bot Active, then alphabetical
    enrichedGuilds.sort((a, b) => {
      if (a.isMaster !== b.isMaster) return b.isMaster ? -1 : 1;
      if (a.isPremium !== b.isPremium) return b.isPremium ? -1 : 1;
      if (a.hasBot !== b.hasBot) return b.hasBot ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    console.log(`[API/Guilds] Returning ${enrichedGuilds.length} allowed guilds.`);
    return NextResponse.json(enrichedGuilds);
  } catch (error) {
    console.error("[API/Guilds] CRITICAL ERROR:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
