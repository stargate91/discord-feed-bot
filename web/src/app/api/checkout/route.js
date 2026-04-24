import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";

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

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: guildId,
      success_url: `${req.nextUrl.origin}/dashboard?guild=${guildId}&success=true`,
      cancel_url: `${req.nextUrl.origin}/premium?guild=${guildId}&canceled=true`,
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
