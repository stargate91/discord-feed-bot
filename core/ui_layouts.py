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
    
    layout = discord.ui.LayoutView()
    container_items = []
    
    # 1. Main Title (Full width)
    container_items.append(discord.ui.TextDisplay(f"### {title}"))
    
    # 2. Image (if present)
    if image_url:
        container_items.append(
            discord.ui.MediaGallery(discord.MediaGalleryItem(image_url))
        )
        
    # 3. Meta Section (Author + Published Date on the left, Button on the right)
    btn_label = bot.get_feedback("btn_read_more", guild_id=guild_id)
    button = discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link)
    
    meta_lines = []
    if author:
        meta_lines.append(f"**{author}**")
        
    if published_ts:
        meta_lines.append(f"**{bot.get_feedback('field_published_at', guild_id=guild_id)}:**\n<t:{published_ts}:f> (<t:{published_ts}:R>)")
        
    meta_text = "\n".join(meta_lines)
    
    if meta_text:
        container_items.append(
            discord.ui.Section(discord.ui.TextDisplay(meta_text), accessory=button)
        )
    else:
        # Fallback if neither author nor date
        container_items.append(
            discord.ui.Section(discord.ui.TextDisplay(f"🔗 **{btn_label}**"), accessory=button)
        )
    
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

def generate_youtube_layout(
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
    Centralized generator for YouTube feeds using Discord Components V2.
    Returns (content, view).
    """
    # Wrap URL in <> so Discord DOES NOT generate its own native embed
    content = f"{alert_text}\n<{url}>"
    
    layout = discord.ui.LayoutView()
    container_items = []
    
    # 1. Main Title (Full width)
    container_items.append(discord.ui.TextDisplay(f"### <:youtube:1495845103447576807> {title}"))
    
    # 2. Image (Thumbnail)
    if image_url:
        container_items.append(
            discord.ui.MediaGallery(discord.MediaGalleryItem(image_url))
        )
        
    # 3. Meta Section (Author + Published Date on the left, Button on the right)
    btn_label = bot.get_feedback("btn_view_youtube", guild_id=guild_id)
    button = discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link)
    
    meta_lines = []
    if author:
        meta_lines.append(f"**{author}**")
        
    if published_ts:
        meta_lines.append(f"**{bot.get_feedback('field_published_at', guild_id=guild_id)}:**\n<t:{published_ts}:f> (<t:{published_ts}:R>)")
        
    meta_text = "\n".join(meta_lines)
    
    if meta_text:
        container_items.append(
            discord.ui.Section(discord.ui.TextDisplay(meta_text), accessory=button)
        )
    else:
        container_items.append(
            discord.ui.Section(discord.ui.TextDisplay(f"🔗 **{btn_label}**"), accessory=button)
        )
        
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

def generate_tmdb_layout(
    bot,
    guild_id: int,
    alert_text: str,
    title: str,
    url: str,
    backdrop_url: str,
    poster_url: str,
    score_text: str,
    genre_text: str,
    release_date: str,
    trailer_url: str,
    accent_color: int
):
    """
    Centralized generator for TMDb Movie/TV feeds using Discord Components V2.
    Uses backdrop as the main wide image and poster as a Section thumbnail.
    Returns (content, view).
    """
    content = f"{alert_text}\n{url}"
    
    layout = discord.ui.LayoutView()
    container_items = []
    
    # 1. Backdrop (wide 16:9 hero image)
    if backdrop_url:
        container_items.append(
            discord.ui.MediaGallery(discord.MediaGalleryItem(backdrop_url))
        )
    
    # 2. Main info section: poster thumbnail on the right, title + meta on the left
    meta_lines = [f"### {title}"]
    if genre_text:
        meta_lines.append(f"🎭 {genre_text}")
    if score_text:
        meta_lines.append(f"{score_text}")
    if release_date:
        meta_lines.append(f"📅 {release_date}")
    
    meta_text = "\n".join(meta_lines)
    
    btn_label = bot.get_feedback("btn_view_tmdb", guild_id=guild_id)
    
    if poster_url:
        # Section with poster thumbnail as accessory
        section = discord.ui.Section(
            discord.ui.TextDisplay(meta_text),
            accessory=discord.ui.Thumbnail(poster_url)
        )
        container_items.append(section)
        
        # Buttons in a separate ActionRow
        action_row = discord.ui.ActionRow()
        action_row.add_item(discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link))
        if trailer_url:
            t_label, t_emoji = bot.parse_emoji_text(bot.get_feedback("btn_watch_trailer", guild_id=guild_id))
            action_row.add_item(discord.ui.Button(label=t_label, emoji=t_emoji, url=trailer_url, style=discord.ButtonStyle.link))
        container_items.append(action_row)
    else:
        # No poster — use button as accessory instead
        button = discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link)
        section = discord.ui.Section(
            discord.ui.TextDisplay(meta_text),
            accessory=button
        )
        container_items.append(section)
        
        if trailer_url:
            action_row = discord.ui.ActionRow()
            t_label, t_emoji = bot.parse_emoji_text(bot.get_feedback("btn_watch_trailer", guild_id=guild_id))
            action_row.add_item(discord.ui.Button(label=t_label, emoji=t_emoji, url=trailer_url, style=discord.ButtonStyle.link))
            container_items.append(action_row)
    
    # 3. Branding
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
