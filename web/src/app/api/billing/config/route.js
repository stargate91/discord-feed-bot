import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), "..", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    
    // Return only the necessary stripe info
    return NextResponse.json(config.stripe_config || {});
  } catch (error) {
    console.error("Failed to load billing config:", error);
    return NextResponse.json({ error: "Failed to load configuration" }, { status: 500 });
  }
}
