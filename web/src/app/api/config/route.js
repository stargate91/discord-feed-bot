import { getConfig } from "@/lib/config";
import { NextResponse } from "next/server";

export async function GET() {
  const config = getConfig();
  
  // Return only safe/public parts of the config
  const publicConfig = {
    tier_config: config.tier_config || {}
  };

  return NextResponse.json(publicConfig);
}
