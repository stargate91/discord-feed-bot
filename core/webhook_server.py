import os
import stripe
from fastapi import FastAPI, Request, Header, HTTPException
from logger import log
import database

app = FastAPI()

# Configuration will be passed at runtime or loaded from env
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

def setup_webhook_bot(bot_instance):
    """Link the web server to the bot instance to allow notifications."""
    app.state.bot = bot_instance
    app.state.stripe_config = bot_instance.config.get("stripe_config", {})

@app.post("/stripe/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature")

    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        log.error(f"[STRIPE] Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        log.error(f"[STRIPE] Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        guild_id_str = session.get('client_reference_id')
        if not guild_id_str:
            log.error("[STRIPE] Missing client_reference_id (Guild ID) in session.")
            return {"status": "error"}

        guild_id = int(guild_id_str)
        subscription_id = session.get('subscription')
        
        # Retrieve full session to get price/tier
        full_session = stripe.checkout.Session.retrieve(session['id'], expand=['line_items'])
        if not full_session.line_items or not full_session.line_items.data:
            return {"status": "error"}
            
        price_id = full_session.line_items.data[0].price.id
        products = app.state.stripe_config.get("products", {})
        
        # Determine tier from config mapping
        # Config should look like: "price_abc": {"tier": 1, "days": 30}
        product_info = products.get(price_id, {"tier": 3, "days": 30})
        tier = product_info.get("tier", 3)
        days = product_info.get("days", 30)

        # Update DB: Tier + Expiration + Sub ID
        from datetime import datetime, timedelta
        expiry = datetime.now() + timedelta(days=days + 2) # Grace period

        await database.update_guild_settings(
            guild_id=guild_id,
            tier=tier,
            premium_until=expiry,
            stripe_subscription_id=subscription_id,
            bot=app.state.bot
        )
        
        log.info(f"[STRIPE] Activated Tier {tier} for guild {guild_id} (Sub: {subscription_id})")

    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        guild_id_str = subscription.get('metadata', {}).get('guild_id')
        if not guild_id_str: 
            return {"status": "ignored"}
            
        guild_id = int(guild_id_str)
        price_id = subscription['items']['data'][0]['price']['id']
        
        products = app.state.stripe_config.get("products", {})
        product_info = products.get(price_id, {"tier": 1})
        tier = product_info.get("tier", 1)
        
        await database.update_guild_settings(guild_id=guild_id, tier=tier, bot=app.state.bot)
        log.info(f"[STRIPE] Updated Tier to {tier} for guild {guild_id} due to sub update.")

    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        guild_id_str = subscription.get('metadata', {}).get('guild_id')
        if not guild_id_str: return {"status": "ignored"}
        
        guild_id = int(guild_id_str)
        # Revert to Free Tier
        await database.update_guild_settings(
            guild_id=guild_id, 
            tier=0, 
            premium_until=None, 
            stripe_subscription_id=None, 
            bot=app.state.bot
        )
        log.info(f"[STRIPE] Subscription deleted for guild {guild_id}. Reverted to Free.")

    return {"status": "success"}

from fastapi.responses import RedirectResponse

@app.get("/checkout")
async def create_checkout(guild_id: str, tier: int, interval: str = "mo"):
    """Create a Stripe Checkout Session and redirect the user."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured on the bot.")

    products = app.state.stripe_config.get("products", {})
    price_id = None
    
    # Search for matching product in config
    for pid, info in products.items():
        if info.get("tier") == tier and info.get("interval") == interval:
            price_id = pid
            break
            
    if not price_id:
        # Fallback for testing/initial setup if tier is in the key name
        if tier == 1: price_id = os.getenv(f"STRIPE_PRICE_TIER1_{interval.upper()}")
        elif tier == 2: price_id = os.getenv(f"STRIPE_PRICE_TIER2_{interval.upper()}")
        elif tier == 3: price_id = os.getenv(f"STRIPE_PRICE_TIER3_{interval.upper()}")

    if not price_id:
        log.error(f"[CHECKOUT] Price not found for Tier {tier}, Interval {interval}")
        raise HTTPException(status_code=400, detail=f"Price ID not configured for Tier {tier} ({interval})")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            client_reference_id=guild_id,
            success_url=app.state.stripe_config.get("success_url"),
            cancel_url=app.state.stripe_config.get("cancel_url"),
            subscription_data={
                "metadata": {
                    "guild_id": guild_id
                }
            },
            metadata={
                "guild_id": guild_id,
                "tier": str(tier)
            }
        )
        return RedirectResponse(url=session.url)
    except Exception as e:
        log.error(f"[CHECKOUT] Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@app.post("/monitors/sync")
async def sync_monitors():
    if not hasattr(app.state, 'bot') or not app.state.bot.monitor_manager:
        raise HTTPException(status_code=500, detail="Bot or Monitor Manager not initialized")
    
    success = await app.state.bot.monitor_manager.sync_with_db()
    if success:
        return {"status": "success", "message": "Monitors synchronized with database"}
    else:
        raise HTTPException(status_code=500, detail="Failed to synchronize monitors")

@app.get("/health")
async def health():
    return {"status": "ok"}
