import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUserGuilds } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch user guilds from Discord API (with caching)
    const userGuilds = await getUserGuilds(session);
    
    if (!userGuilds) {
      return NextResponse.json({ 
        error: "Discord API Busy", 
        details: "Please wait a moment. We are fetching your data from Discord." 
      }, { status: 429 });
    }

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
