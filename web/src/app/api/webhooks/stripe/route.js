import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import fs from "fs";
import path from "path";
import pool from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Load mapping from config.json
const configPath = path.join(process.cwd(), "..", "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const products = config.stripe_config.products;

export async function POST(req) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`[Stripe Webhook] Signature verification failed:`, err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const session = event.data.object;

  if (event.type === "checkout.session.completed") {
    const guildId = session.client_reference_id || session.metadata?.guildId;
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const priceId = subscription.items.data[0].price.id;
    
    // Get tier from config
    const tier = products[priceId]?.tier || 0;
    const expiresAt = new Date(subscription.current_period_end * 1000);

    console.log(`[Stripe Webhook] Activating Premium for Guild: ${guildId}, Tier: ${tier}, Expires: ${expiresAt}`);

    try {
      await pool.query(
        `INSERT INTO guild_settings (guild_id, tier, premium_until, stripe_subscription_id) 
         VALUES ($1::bigint, $2, $3, $4)
         ON CONFLICT (guild_id) DO UPDATE 
         SET tier = $2, premium_until = $3, stripe_subscription_id = $4`,
        [guildId, tier, expiresAt, session.subscription]
      );
    } catch (dbErr) {
      console.error("[Stripe Webhook] DB Update Error:", dbErr);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const guildId = session.metadata?.guildId;
    if (guildId) {
      const tier = session.status === "active" ? (PRICE_TO_TIER[session.items.data[0].price.id] || 0) : 0;
      const expiresAt = new Date(session.current_period_end * 1000);
      
      console.log(`[Stripe Webhook] Updating Subscription for Guild: ${guildId}, Status: ${session.status}`);

      await pool.query(
        `UPDATE guild_settings SET tier = $2, premium_until = $3 WHERE guild_id = $1::bigint`,
        [guildId, session.status === "active" ? tier : 0, expiresAt]
      );
    }
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
