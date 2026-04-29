import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim();
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!input) {
    return NextResponse.json({ error: "Input is required" }, { status: 400 });
  }

  // 0. Check Cache First (Skip if it's a direct link to ensure fix applies)
  const isDirectLink = input.includes("youtube.com/") || input.includes("youtu.be/") || input.startsWith("@");
  
  try {
    if (!isDirectLink) {
      const cacheRes = await pool.query(
        "SELECT channel_id, title, thumbnail, updated_at FROM youtube_cache WHERE query = $1",
        [input.toLowerCase()]
      );

      if (cacheRes.rows.length > 0) {
        const row = cacheRes.rows[0];
        const ageInDays = (new Date() - new Date(row.updated_at)) / (1000 * 60 * 60 * 24);
        
        if (ageInDays < 7) {
          return NextResponse.json({
            id: row.channel_id,
            title: row.title,
            thumbnail: row.thumbnail,
            cached: true
          });
        }
      }
    }
  } catch (cacheErr) {
    console.error("[YouTube Cache] Error:", cacheErr);
  }

  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API Key not configured on server" }, { status: 500 });
  }

  try {
    let result = null;

    // 1. If it's already a UCID
    if (input.startsWith("UC") && input.length === 24) {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${input}&key=${apiKey}`);
      const data = await res.json();
      if (data.items?.length > 0) {
        result = {
          id: data.items[0].id,
          title: data.items[0].snippet.title,
          thumbnail: data.items[0].snippet.thumbnails.default.url
        };
      }
    }

    if (!result) {
      // 2. Try to extract ID or Handle from URL
      let channelId = null;
      let handle = null;

      if (input.includes("youtube.com/") || input.includes("youtu.be/")) {
        const channelIdMatch = input.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
        const handleMatch = input.match(/youtube\.com\/(@[a-zA-Z0-9._-]+)/);
        
        if (channelIdMatch) channelId = channelIdMatch[1];
        else if (handleMatch) handle = handleMatch[1];
      } else if (input.startsWith("@")) {
        handle = input;
      }

      if (channelId) {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
        const data = await res.json();
        if (data.items?.length > 0) {
          result = {
            id: data.items[0].id,
            title: data.items[0].snippet.title,
            thumbnail: data.items[0].snippet.thumbnails.default.url
          };
        }
      } else if (handle) {
        // Use forHandle for EXACT match (premium fix)
        const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`);
        const data = await res.json();
        if (data.items?.length > 0) {
          result = {
            id: data.items[0].id,
            title: data.items[0].snippet.title,
            thumbnail: data.items[0].snippet.thumbnails.default.url
          };
        }
      }
    }

    if (!result) {
        // 3. Fallback to search only if not a direct link/handle
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(input)}&key=${apiKey}&maxResults=1`);
        const data = await res.json();
        if (data.items?.length > 0) {
            result = {
                id: data.items[0].snippet.channelId,
                title: data.items[0].snippet.title,
                thumbnail: data.items[0].snippet.thumbnails.default.url
            };
        }
    }

    if (result) {
        // Store in Cache
        try {
            await pool.query(
                `INSERT INTO youtube_cache (query, channel_id, title, thumbnail, updated_at) 
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                 ON CONFLICT (query) DO UPDATE SET 
                    channel_id = EXCLUDED.channel_id,
                    title = EXCLUDED.title,
                    thumbnail = EXCLUDED.thumbnail,
                    updated_at = CURRENT_TIMESTAMP`,
                [input.toLowerCase(), result.id, result.title, result.thumbnail]
            );
        } catch (saveErr) {
            console.error("[YouTube Cache] Save Error:", saveErr);
        }
        
        return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  } catch (error) {
    console.error("[YouTube Resolve] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
