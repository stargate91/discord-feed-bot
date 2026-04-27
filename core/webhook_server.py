import os
import stripe
from fastapi import FastAPI, Request, Header, HTTPException, Depends
from logger import log
import database
from fastapi.responses import RedirectResponse

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

from fastapi import Depends
from fastapi.responses import RedirectResponse

def verify_webhook_secret(x_webhook_secret: str = Header(None)):
    expected_secret = os.getenv("WEBHOOK_SECRET")
    if not expected_secret:
        return True # If not configured, allow (for backwards compatibility/testing)
    if x_webhook_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
    return True

@app.post("/monitors/sync")
async def sync_monitors():
    if not hasattr(app.state, 'bot') or not app.state.bot.monitor_manager:
        raise HTTPException(status_code=500, detail="Bot or Monitor Manager not initialized")
    
    # Also reload guild settings cache (Premium tiers, language, etc.)
    await app.state.bot.reload_guild_settings_cache()
    
    success = await app.state.bot.monitor_manager.sync_with_db()
    if success:
        return {"status": "success", "message": "Monitors and settings synchronized with database"}
    else:
        raise HTTPException(status_code=500, detail="Failed to synchronize monitors")

@app.post("/monitors/{monitor_id}/check")
async def manual_check(monitor_id: int, authorized: bool = Depends(verify_webhook_secret)):
    if not hasattr(app.state, 'bot') or not app.state.bot.monitor_manager:
        raise HTTPException(status_code=500, detail="Bot or Monitor Manager not initialized")
    
    success, message = await app.state.bot.monitor_manager.manual_check(monitor_id)
    if success:
        return {"status": "success", "message": message}
    else:
        raise HTTPException(status_code=400, detail=message)

@app.post("/monitors/{monitor_id}/repost")
async def repost_recent(monitor_id: int, count: int = 1, authorized: bool = Depends(verify_webhook_secret)):
    if not hasattr(app.state, 'bot') or not app.state.bot.monitor_manager:
        raise HTTPException(status_code=500, detail="Bot or Monitor Manager not initialized")
    
    success = await app.state.bot.monitor_manager.repost_recent(monitor_id, count)
    if success:
        return {"status": "success", "message": f"Reposted {count} items for monitor {monitor_id}"}
    else:
        raise HTTPException(status_code=400, detail="No history found or repost failed")

@app.post("/monitors/{monitor_id}/purge")
async def purge_channel(monitor_id: int, amount: int = 50, authorized: bool = Depends(verify_webhook_secret)):
    if not hasattr(app.state, 'bot') or not app.state.bot.monitor_manager:
        raise HTTPException(status_code=500, detail="Bot or Monitor Manager not initialized")
    
    success = await app.state.bot.monitor_manager.purge_channel(monitor_id, amount)
    if success:
        return {"status": "success", "message": f"Purged messages in channels for monitor {monitor_id}"}
    else:
        raise HTTPException(status_code=400, detail="Purge failed")

async def verify_webhook_secret(x_webhook_secret: str = Header(None)):
    if x_webhook_secret != os.getenv("WEBHOOK_SECRET"):
        raise HTTPException(status_code=403, detail="Invalid webhook secret")
    return True

@app.post("/monitors/{monitor_id}/reset")
async def reset_history(monitor_id: int, authorized: bool = Depends(verify_webhook_secret)):
    if not hasattr(app.state, 'bot') or not app.state.bot.monitor_manager:
        raise HTTPException(status_code=500, detail="Bot or Monitor Manager not initialized")
    
    success = await app.state.bot.monitor_manager.reset_history(monitor_id)
    if success:
        return {"status": "success", "message": f"History reset for monitor {monitor_id}"}
    else:
        raise HTTPException(status_code=400, detail="Monitor not found or reset failed")

@app.post("/monitors/reset-all")
async def reset_all_history(authorized: bool = Depends(verify_webhook_secret)):
    if not hasattr(app.state, 'bot') or not app.state.bot.monitor_manager:
        raise HTTPException(status_code=500, detail="Bot or Monitor Manager not initialized")
    
    success = await app.state.bot.monitor_manager.reset_all_history()
    if success:
        return {"status": "success", "message": "ALL monitor history has been reset globally"}
    else:
        raise HTTPException(status_code=500, detail="Global reset failed")

@app.post("/admin/factory-reset")
async def factory_reset(authorized: bool = Depends(verify_webhook_secret)):
    if not hasattr(app.state, 'bot') or not app.state.bot.monitor_manager:
        raise HTTPException(status_code=500, detail="Bot or Monitor Manager not initialized")
    
    success = await app.state.bot.monitor_manager.factory_reset()
    if success:
        return {"status": "success", "message": "FACTORY RESET COMPLETE. All data has been wiped."}
    else:
        raise HTTPException(status_code=500, detail="Factory reset failed")

@app.get("/health")
async def health():
    return {"status": "ok"}



@app.get("/guilds/{guild_id}/permissions/{user_id}")
async def get_permissions(guild_id: int, user_id: int, authorized: bool = Depends(verify_webhook_secret)):
    bot = app.state.bot
    guild = bot.get_guild(guild_id)
    
    # 1. Base Tier Info (Always available from DB cache)
    settings = bot.guild_settings_cache.get(guild_id, {})
    tier = settings.get("tier", 0)
    if tier == 0 and bot.is_premium(guild_id): tier = 3
    
    tier_config_all = bot.config.get("tier_config", {})
    tier_info = tier_config_all.get(str(tier), tier_config_all.get("0", {}))

    # 2. Member Permissions (Requires bot in guild)
    is_admin = False
    bot_in_guild = False
    
    if guild:
        bot_in_guild = True
        member = guild.get_member(user_id)
        if not member:
            try: member = await guild.fetch_member(user_id)
            except: member = None
        
        if member:
            is_admin = bot.is_bot_admin(member)

    return {
        "is_admin": is_admin,
        "tier": tier,
        "tier_name": tier_info.get("name", "Unknown"),
        "features": tier_info.get("features", []),
        "limits": tier_info,
        "bot_in_guild": bot_in_guild
    }
