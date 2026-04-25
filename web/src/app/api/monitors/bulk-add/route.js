import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { guildId, type, sources, targetChannels, targetRoles, embedColor } = await req.json();

    if (!guildId || !type || !sources || !targetChannels || targetChannels.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check premium status and tier
    const guildRes = await query("SELECT tier, premium_until FROM guild_settings WHERE guild_id = $1", [guildId]);
    const guild = guildRes.rows[0];
    const isPremium = (guild?.premium_until && new Date(guild.premium_until) > new Date()) || guild?.tier >= 1;
    const tier = guild?.tier || 0;

    // Check if master guild
    let isMaster = false;
    try {
      const configPath = path.resolve(process.cwd(), '../config.json');
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf8');
        const sanitizedData = rawData.replace(/:\s*([0-9]{15,})/g, ': "$1"');
        const config = JSON.parse(sanitizedData);
        isMaster = (config.master_guilds || {}).hasOwnProperty(String(guildId));
      }
    } catch (e) { /* ignore config errors */ }

    if (!isMaster && (!isPremium || tier < 2)) {
      return NextResponse.json({ error: 'Professional tier required for Bulk Import.' }, { status: 403 });
    }

    // Build channel/role arrays as integers
    const channelIds = targetChannels.map(id => parseInt(id));
    const roleIds = (targetRoles || []).map(id => parseInt(id));

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let source of sources) {
      try {
        let name = source;
        let apiUrl = source;

        // Basic naming logic based on type
        if (type === 'youtube') {
          if (source.includes('youtube.com/')) {
             const parts = source.split('/');
             name = parts[parts.length - 1].replace('@', '');
          } else {
             name = source.replace('@', '');
          }
        } 
        else if (type === 'stream') { // Twitch
          if (source.includes('twitch.tv/')) {
            name = source.split('twitch.tv/')[1].split('/')[0];
          }
          apiUrl = `https://www.twitch.tv/${name}`;
        }
        else if (type === 'kick') {
           if (source.includes('kick.com/')) {
             name = source.split('kick.com/')[1].split('/')[0];
           }
           apiUrl = `https://kick.com/${name}`;
        }
        else if (type === 'github') {
           if (source.includes('github.com/')) {
             name = source.split('github.com/')[1].split('/').slice(0, 2).join('/');
           }
           apiUrl = `https://github.com/${name}`;
        }

        // Check for duplicates in this guild
        const dupCheck = await query(
          "SELECT id FROM monitors WHERE guild_id = $1 AND type = $2 AND api_url = $3",
          [guildId, type, apiUrl]
        );

        if (dupCheck.rows.length > 0) {
          errorCount++;
          errors.push(`Skipped duplicate: ${name}`);
          continue;
        }

        // Insert into database
        await query(
          `INSERT INTO monitors (guild_id, type, name, api_url, target_channels, target_roles, embed_color, enabled)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
          [
            guildId, 
            type, 
            name, 
            apiUrl, 
            JSON.stringify(channelIds), 
            JSON.stringify(roleIds), 
            embedColor || '#7b2cbf'
          ]
        );
        successCount++;

      } catch (e) {
        errorCount++;
        errors.push(`Error adding ${source}: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      errors
    });

  } catch (err) {
    console.error("Bulk add API error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
