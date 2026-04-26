import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://kick.com/"
      }
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch image", { status: res.status });
    }

    const contentType = res.headers.get("content-type");
    const buffer = await res.arrayBuffer();

    const headers = new Headers();
    if (contentType) headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");

    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("[Proxy API] Error fetching image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
