import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Next.js 15+ compatibility: params must be awaited
  const { id } = await params;
  const guildId = String(id).trim();

  try {
    // 1. Load Master Guilds from config.json (Sidebar logic)
    let isMaster = false;
    try {
      const configPath = path.resolve(process.cwd(), '../config.json');
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf8');
        const sanitizedData = rawData.replace(/:\s*([0-9]{15,})/g, ': "$1"');
        const config = JSON.parse(sanitizedData);
        const masterGuilds = config.master_guilds || {};
        if (masterGuilds.hasOwnProperty(guildId)) {
          isMaster = true;
        }
      }
    } catch (cfgErr) {
      console.error("[Settings API GET] Config check failed:", cfgErr);
    }

    const res = await pool.query(
      "SELECT language, admin_role_id, premium_until, refresh_interval, alert_templates, tier FROM guild_settings WHERE guild_id = $1::bigint",
      [guildId]
    );

    let settings = {
        language: "en",
        admin_role_id: "0",
        premium_until: null,
        refresh_interval: 15,
        alert_templates: {},
        tier: 0,
        isMaster: isMaster
    };

    if (res.rows.length > 0) {
        const row = res.rows[0];
        let templates = {};
        if (row.alert_templates) {
            try {
                templates = typeof row.alert_templates === 'string' 
                    ? JSON.parse(row.alert_templates) 
                    : row.alert_templates;
            } catch (e) {
                console.error("Failed to parse alert_templates:", e);
            }
        }

        let tier = row.tier || 0;
        const now = new Date();
        const premiumUntil = row.premium_until;
        
        // Legacy support: If tier is 0 but premium_until is valid, treat as Tier 3
        if (tier === 0 && premiumUntil && new Date(premiumUntil) > now) {
            tier = 3;
        }

        settings = {
            language: row.language || "en",
            admin_role_id: row.admin_role_id ? String(row.admin_role_id) : "0",
            premium_until: row.premium_until,
            refresh_interval: row.refresh_interval || 15,
            alert_templates: templates,
            tier: tier,
            isMaster: isMaster
        };
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[Settings API GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Next.js 15+ compatibility: params must be awaited
  const { id } = await params;
  const guildId = String(id).trim();
  
  const body = await req.json();
  const { language, admin_role_id, refresh_interval, alert_templates } = body;

  try {
    const q = `
      INSERT INTO guild_settings (guild_id, language, admin_role_id, refresh_interval, alert_templates)
      VALUES ($1::bigint, $2, $3::bigint, $4, $5::jsonb)
      ON CONFLICT (guild_id) DO UPDATE SET
        language = EXCLUDED.language,
        admin_role_id = EXCLUDED.admin_role_id,
        refresh_interval = EXCLUDED.refresh_interval,
        alert_templates = EXCLUDED.alert_templates
    `;
    await pool.query(q, [
        guildId, 
        language, 
        admin_role_id, 
        refresh_interval, 
        JSON.stringify(alert_templates || {})
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Settings API PATCH] Error:", error);
    return NextResponse.json({ 
        error: "Internal Server Error", 
        details: error.message 
    }, { status: 500 });
  }
}
