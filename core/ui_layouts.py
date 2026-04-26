import discord

def generate_free_game_layout(
    bot,
    guild_id: int,
    alert_text: str,
    title: str,
    game_url: str,
    image_url: str,
    worth: str,
    giveaway_type: str,
    expiry_ts: int,
    accent_color: int
):
    """
    Centralized generator for Free Game giveaways using Discord Components V2.
    Returns (content, view).
    """
    content = f"{alert_text}\n{game_url}"
    
    lines = []
    na_text = bot.get_feedback("default_na", guild_id=guild_id)
    
    if worth and worth != na_text and worth != "0":
        lines.append(f"**{bot.get_feedback('field_worth', guild_id=guild_id)}:** ~~{worth}~~ **FREE**")
        
    if giveaway_type and giveaway_type != "Game":
        lines.append(f"**{bot.get_feedback('field_type', guild_id=guild_id)}:** {giveaway_type}")
        
    if expiry_ts:
        lines.append(f"**{bot.get_feedback('field_expiry', guild_id=guild_id)}:** <t:{expiry_ts}:R>")
        
    desc_text = "\n".join(lines)
    section_text = f"### {title}\n{desc_text}" if desc_text else f"### {title}"
    
    # Initialize Layout
    layout = discord.ui.LayoutView()
    
    # Construct Container Items
    container_items = []
    
    # Top Wide Image (if any)
    if image_url:
        container_items.append(
            discord.ui.MediaGallery(discord.MediaGalleryItem(image_url))
        )
        
    # Text Section with the Link Button on the right
    btn_label = bot.get_feedback("btn_get_game", guild_id=guild_id)
    section = discord.ui.Section(
        discord.ui.TextDisplay(section_text),
        accessory=discord.ui.Button(label=btn_label, url=game_url, style=discord.ButtonStyle.link)
    )
    container_items.append(section)
    
    # Custom Branding Support
    settings = bot.guild_settings_cache.get(guild_id, {})
    custom_branding = settings.get("custom_branding")
    
    if custom_branding == "":
        # Hide branding entirely
        pass
    else:
        # Native V2 Separator
        container_items.append(discord.ui.Separator())
        
        # Branding Text
        if custom_branding:
            container_items.append(discord.ui.TextDisplay(custom_branding))
        else:
            branding_text = bot.get_feedback("branding_delivered_by", guild_id=guild_id)
            container_items.append(discord.ui.TextDisplay(branding_text))
    
    # Put everything in a container
    container = discord.ui.Container(*container_items, accent_color=accent_color)
    
    
    layout.add_item(container)
    
    return content, layout

def generate_news_layout(
    bot,
    guild_id: int,
    alert_text: str,
    title: str,
    url: str,
    image_url: str,
    author: str,
    published_ts: int,
    accent_color: int
):
    """
    Centralized generator for News/RSS feeds using Discord Components V2.
    Returns (content, view).
    """
    content = f"{alert_text}\n{url}"
    
    lines = []
    if published_ts:
        lines.append(f"**{bot.get_feedback('field_published_at', guild_id=guild_id)}:** <t:{published_ts}:f> (<t:{published_ts}:R>)")
        
    desc_text = "\n".join(lines)
    
    if author:
        section_text = f"### {title}\n**{author}**\n\n{desc_text}" if desc_text else f"### {title}\n**{author}**"
    else:
        section_text = f"### {title}\n{desc_text}" if desc_text else f"### {title}"
        
    layout = discord.ui.LayoutView()
    container_items = []
    
    if image_url:
        container_items.append(
            discord.ui.MediaGallery(discord.MediaGalleryItem(image_url))
        )
        
    btn_label = bot.get_feedback("btn_read_more", guild_id=guild_id)
    section = discord.ui.Section(
        discord.ui.TextDisplay(section_text),
        accessory=discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link)
    )
    container_items.append(section)
    
    settings = bot.guild_settings_cache.get(guild_id, {})
    custom_branding = settings.get("custom_branding")
    
    if custom_branding == "":
        pass
    else:
        container_items.append(discord.ui.Separator())
        if custom_branding:
            container_items.append(discord.ui.TextDisplay(custom_branding))
        else:
            branding_text = bot.get_feedback("branding_delivered_by", guild_id=guild_id)
            container_items.append(discord.ui.TextDisplay(branding_text))
            
    container = discord.ui.Container(*container_items, accent_color=accent_color)
    layout.add_item(container)
    
    return content, layout
