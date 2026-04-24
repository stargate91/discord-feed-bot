import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT * FROM announcements 
      WHERE is_active = true 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("[API Announcements] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'master') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content, type, expires_at } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const res = await pool.query(`
      INSERT INTO announcements (title, content, type, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title, content, type || 'info', expires_at || null]);

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    console.error("[API Announcements] POST Error:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'master') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
    } else {
      // Deactivate all
      await pool.query('UPDATE announcements SET is_active = false');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Announcements] DELETE Error:", error);
    return NextResponse.json({ error: "Failed to remove announcement" }, { status: 500 });
  }
}
