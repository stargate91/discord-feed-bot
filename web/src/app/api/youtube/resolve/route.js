import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim();
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!input) {
    return NextResponse.json({ error: "Input is required" }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API Key not configured on server" }, { status: 500 });
  }

  try {
    let channelId = null;
    let channelTitle = "";
    let channelThumb = "";

    // 1. If it's already a UCID
    if (input.startsWith("UC") && input.length === 24) {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${input}&key=${apiKey}`);
      const data = await res.json();
      if (data.items?.length > 0) {
        return NextResponse.json({
          id: data.items[0].id,
          title: data.items[0].snippet.title,
          thumbnail: data.items[0].snippet.thumbnails.default.url
        });
      }
    }

    // 2. Try to resolve handle (@handle)
    let handle = input;
    if (input.includes("youtube.com/")) {
        // Extract handle from URL
        const match = input.match(/youtube\.com\/(@[a-zA-Z0-9._-]+)/);
        if (match) handle = match[1];
    }
    
    if (handle.startsWith("@")) {
        // Search by handle
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${apiKey}&maxResults=1`);
        const data = await res.json();
        if (data.items?.length > 0) {
            return NextResponse.json({
                id: data.items[0].snippet.channelId,
                title: data.items[0].snippet.title,
                thumbnail: data.items[0].snippet.thumbnails.default.url
            });
        }
    }

    // 3. Final Fallback: Search
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(input)}&key=${apiKey}&maxResults=1`);
    const data = await res.json();
    if (data.items?.length > 0) {
      return NextResponse.json({
        id: data.items[0].snippet.channelId,
        title: data.items[0].snippet.title,
        thumbnail: data.items[0].snippet.thumbnails.default.url
      });
    }

    return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  } catch (error) {
    console.error("[YouTube Resolve] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
