import { NextResponse } from 'next/server';
import { notifyBotOfChange } from "@/lib/bot-sync";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { guildId, type, sources, targetChannels, targetRoles, embedColor, sendInitialAlert } = await req.json();

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

    // Build channel/role arrays as strings (IMPORTANT: No parseInt here, would lose precision)
    const channelIds = targetChannels.map(id => String(id));
    const roleIds = (targetRoles || []).map(id => String(id));

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

        // Construct extra_settings JSON
        const extraSettings = {
          api_url: apiUrl,
          target_channels: channelIds,
          target_roles: roleIds,
          embed_color: embedColor || (type === 'youtube' ? null : '#3d3f45'),
          send_initial_alert: sendInitialAlert ?? false
        };

        // For YouTube, also provide channel_id which the monitor specifically looks for
        if (type === 'youtube') {
           extraSettings.channel_id = name; // 'name' here is the handle/id extracted
        }

        // Check for duplicates in this guild by searching in extra_settings text
        const dupCheck = await query(
          "SELECT id FROM monitors WHERE guild_id = $1 AND type = $2 AND extra_settings LIKE $3",
          [guildId, type, `%${apiUrl}%`]
        );

        if (dupCheck.rows.length > 0) {
          errorCount++;
          errors.push(`Skipped duplicate: ${name}`);
          continue;
        }

        // Insert into database
        await query(
          `INSERT INTO monitors (guild_id, type, name, enabled, extra_settings, discord_channel_id, ping_role_id)
           VALUES ($1, $2, $3, true, $4, $5, $6)`,
          [
            String(guildId), 
            type, 
            name,
            JSON.stringify(extraSettings),
            channelIds[0] ? String(channelIds[0]) : "0",
            roleIds[0] ? String(roleIds[0]) : "0"
          ]
        );
        successCount++;

      } catch (e) {
        errorCount++;
        errors.push(`Error adding ${source}: ${e.message}`);
      }
    }

    // Notify bot to sync new monitors
    await notifyBotOfChange();

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
