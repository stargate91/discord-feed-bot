import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Try multiple possible locations for config.json
    const paths = [
      path.join(process.cwd(), "..", "config.json"),
      path.join(process.cwd(), "config.json"),
      path.resolve(__dirname, "../../../../../../config.json") // Deep fallback
    ];
    
    let config = null;
    for (const p of paths) {
      if (fs.existsSync(p)) {
        config = JSON.parse(fs.readFileSync(p, "utf8"));
        break;
      }
    }

    if (!config) throw new Error("config.json not found in any expected location");
    
    // Return only the necessary stripe info
    return NextResponse.json(config.stripe_config || {});
  } catch (error) {
    console.error("Failed to load billing config:", error);
    return NextResponse.json({ error: "Failed to load configuration" }, { status: 500 });
  }
}
