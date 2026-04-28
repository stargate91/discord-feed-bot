import { NextResponse } from "next/server";

// Simple in-memory cache for the Twitch App Token so we don't fetch it on every keystroke
let cachedTwitchToken = null;
let tokenExpiry = 0;

async function getTwitchToken() {
  if (cachedTwitchToken && Date.now() < tokenExpiry) {
    return cachedTwitchToken;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
      method: 'POST'
    });
    
    if (res.ok) {
      const data = await res.json();
      cachedTwitchToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Cache until 1 min before expiry
      return cachedTwitchToken;
    }
  } catch (e) {
    console.error("Twitch Token Fetch Error:", e);
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Missing or too short search query" }, { status: 400 });
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const token = await getTwitchToken();

  if (!clientId || !token) {
    return NextResponse.json({ error: "Twitch API credentials not configured" }, { status: 501 });
  }

  try {
    const res = await fetch(`https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=5&live_only=false`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Twitch API returned ${res.status}`);
    }

    const data = await res.json();
    
    // Map items
    const results = (data.data || []).map(item => ({
      id: item.broadcaster_login,
      name: item.display_name,
      thumbnail: item.thumbnail_url,
      is_live: item.is_live
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Twitch Search API] Error:", error);
    return NextResponse.json({ error: "Failed to search Twitch" }, { status: 500 });
  }
}
