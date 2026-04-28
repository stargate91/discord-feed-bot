import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`, {
      headers: {
        'User-Agent': 'NovaFeeds/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`Steam API returned ${res.status}`);
    }

    const data = await res.json();
    
    // Map items to a simpler format for the frontend
    const results = (data.items || []).map(item => ({
      id: String(item.id),
      name: item.name,
      thumbnail: item.tiny_image
    })).slice(0, 5); // Return top 5 results

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Steam Search API] Error:", error);
    return NextResponse.json({ error: "Failed to search Steam" }, { status: 500 });
  }
}
