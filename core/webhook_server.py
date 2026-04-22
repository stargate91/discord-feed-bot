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
        
        # client_reference_id should be our Guild ID
        guild_id_str = session.get('client_reference_id')
        if not guild_id_str:
            log.error("[STRIPE] Missing client_reference_id (Guild ID) in session.")
            return {"status": "error", "message": "No guild mapping"}

        guild_id = int(guild_id_str)
        
        # Determine duration from Price ID
        # We need to look up line items to get price_id
        full_session = stripe.checkout.Session.retrieve(
            session['id'],
            expand=['line_items'],
        )
        
        if not full_session.line_items or len(full_session.line_items.data) == 0:
             log.error(f"[STRIPE] No line items for session {session['id']}")
             return {"status": "error"}

        price_id = full_session.line_items.data[0].price.id
        products = app.state.stripe_config.get("products", {})
        
        product_info = products.get(price_id)
        if not product_info:
            log.error(f"[STRIPE] Price ID {price_id} not found in bot config.")
            return {"status": "error", "message": "Unknown product"}

        days = product_info.get("days", 30)
        
        # 1. Activate in DB
        await database.add_premium_days(guild_id, days)
        
        # 2. Log History
        await database.log_payment(
            guild_id=guild_id,
            session_id=session['id'],
            price_id=price_id,
            amount=session['amount_total'],
            currency=session['currency']
        )
        
        log.info(f"[STRIPE] Successfully activated {days} days of premium for guild {guild_id}")
        
        # 3. Optional: Notify in Discord
        # try:
        #     guild = app.state.bot.get_guild(guild_id)
        #     if guild:
        #         # Logic to find a channel to post in
        #         pass
        # except Exception as e:
        #     log.error(f"Failed to notify guild {guild_id}: {e}")

    return {"status": "success"}

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
