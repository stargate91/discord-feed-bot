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
    // We wrap this in a sub-try to handle cases where the schema hasn't been updated yet
    try {
      const result = await pool.query(`
        SELECT 
          platform, 
          title, 
          published_at,
          author_name
        FROM published_entries_v2 
        WHERE title IS NOT NULL AND published_at IS NOT NULL
        ORDER BY published_at DESC 
        LIMIT 15
      `);
      return NextResponse.json(result.rows);
    } catch (dbError) {
      console.warn("Global stats DB error (possibly missing columns):", dbError.message);
      return NextResponse.json([]); // Return empty list if schema is old
    }
  } catch (error) {
    console.error("Global stats error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
