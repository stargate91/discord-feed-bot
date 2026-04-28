import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ error: "Missing or too short search query" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`, {
      headers: {
        'User-Agent': 'NovaFeeds/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const data = await res.json();
    
    // Map items to a simpler format for the frontend
    const results = (data.items || []).map(item => ({
      id: item.full_name,
      name: item.name,
      thumbnail: item.owner.avatar_url,
      description: item.description,
      stars: item.stargazers_count
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("[GitHub Search API] Error:", error);
    return NextResponse.json({ error: "Failed to search GitHub" }, { status: 500 });
  }
}
