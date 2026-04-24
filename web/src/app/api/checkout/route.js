import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import fs from "fs";
import path from "path";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId, guildId } = await req.json();

    if (!priceId || !guildId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Load URLs from config
    let successUrl = `${req.nextUrl.origin}/dashboard?guild=${guildId}&success=true`;
    let cancelUrl = `${req.nextUrl.origin}/premium?guild=${guildId}&canceled=true`;

    try {
      const configPath = path.join(process.cwd(), "..", "config.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.stripe_config?.success_url) {
        successUrl = config.stripe_config.success_url.replace("?payment=success", `?guild=${guildId}&success=true`);
      }
      if (config.stripe_config?.cancel_url) {
        cancelUrl = config.stripe_config.cancel_url.includes("?") 
          ? `${config.stripe_config.cancel_url}&guild=${guildId}&canceled=true`
          : `${config.stripe_config.cancel_url}?guild=${guildId}&canceled=true`;
      }
    } catch (e) {}

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      automatic_payment_methods: { enabled: true },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: guildId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        guildId: guildId,
        userId: session.user.id
      },
      subscription_data: {
        metadata: {
          guildId: guildId
        }
      }
    });


    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
