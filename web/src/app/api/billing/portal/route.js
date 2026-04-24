import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Stripe from "stripe";
import pool from "@/lib/db";
import { canManageGuild } from "@/lib/permissions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { guildId } = await req.json();
    if (!guildId) {
      return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
    }

    // Permission check
    const allowed = await canManageGuild(session, guildId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get subscription ID from DB
    const res = await pool.query(
      "SELECT stripe_subscription_id FROM guild_settings WHERE guild_id = $1::bigint",
      [guildId]
    );

    if (res.rows.length === 0 || !res.rows[0].stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription found for this server." }, { status: 404 });
    }

    const subscriptionId = res.rows[0].stripe_subscription_id;

    // Retrieve subscription to get customer ID
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer;

    // Create Portal Session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.nextUrl.origin}/dashboard/settings?guild=${guildId}`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[Stripe Portal] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
