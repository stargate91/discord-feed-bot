import discord
import stripe
import os
from logger import log

class PremiumPurchaseView(discord.ui.View):
    def __init__(self, bot, guild_id):
        super().__init__(timeout=180)
        self.bot = bot
        self.guild_id = guild_id
        
        # Load products from config
        self.stripe_config = bot.config.get("stripe_config", {})
        self.products = self.stripe_config.get("products", {})
        
        options = []
        for price_id, info in self.products.items():
            options.append(discord.SelectOption(
                label=info.get("label", "Premium"),
                value=price_id,
                description=f"Add {info.get('days')} days of Premium"
            ))
            
        if not options:
            # Fallback if config is empty
            options.append(discord.SelectOption(label="No products configured", value="none"))

        self.select = discord.ui.Select(
            placeholder="Choose your Premium plan...",
            options=options,
            disabled=len(options) == 0 or options[0].value == "none"
        )
        self.select.callback = self.select_callback
        self.add_item(self.select)

    async def select_callback(self, interaction: discord.Interaction):
        price_id = self.select.values[0]
        
        await interaction.response.defer(ephemeral=True)
        
        try:
            # Initialize Stripe if not already done (it should be in main.py but safe to ensure)
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
            
            # Create Checkout Session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='payment',
                client_reference_id=str(self.guild_id),
                success_url=self.stripe_config.get("success_url"),
                cancel_url=self.stripe_config.get("cancel_url"),
                # We can also metadata if we want more info
                metadata={
                    "guild_id": str(self.guild_id),
                    "user_id": str(interaction.user.id)
                }
            )
            
            embed = discord.Embed(
                title="🚀 Upgrade to Premium",
                description=(
                    "Click the button below to complete your payment on our secure Stripe checkout page.\n\n"
                    "**Note:** Premium will be activated automatically for this server once the payment is completed."
                ),
                color=0x40C4FF
            )
            
            button = discord.ui.Button(label="Proceed to Payment", url=session.url, style=discord.ButtonStyle.link)
            view = discord.ui.View()
            view.add_item(button)
            
            await interaction.followup.send(embed=embed, view=view, ephemeral=True)
            
        except Exception as e:
            log.error(f"Stripe Session Error: {e}")
            await interaction.followup.send("❌ Failed to generate payment link. Please contact support.", ephemeral=True)
