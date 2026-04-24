import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from 'crypto';

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { days, uses = 1, tier = 3 } = await request.json();

  try {
    // Generate format PREM-XXXX-XXXX-XXXX-XXXX
    const generateSegment = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const code = `PREM-${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;

    await pool.query(
      'INSERT INTO premium_codes (code, duration_days, max_uses, tier, used_count, created_at) VALUES ($1, $2, $3, $4, 0, NOW())',
      [code, days, uses, tier]
    );

    return NextResponse.json({ success: true, code });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
