import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch last 15 global notifications with titles and platforms
    const result = await pool.query(`
      SELECT 
        platform, 
        title, 
        published_at,
        author_name
      FROM published_entries_v2 
      WHERE title IS NOT NULL
      ORDER BY published_at DESC 
      LIMIT 15
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Global stats error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
