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
    Uses backdrop as the main wide image with clean metadata below.
    Returns (content, view).
    """
    content = f"{alert_text}\n{url}"
    
    layout = discord.ui.LayoutView()
    container_items = []
    
    # 1. Title at the top
    container_items.append(discord.ui.TextDisplay(f"### <:tmdb:1495845178945044590> {title}"))
    
    # 2. Backdrop (wide 16:9 hero image)
    if backdrop_url:
        container_items.append(
            discord.ui.MediaGallery(discord.MediaGalleryItem(backdrop_url))
        )
    
    # 3. Meta info section with button as accessory
    score_label = bot.get_feedback("field_score", guild_id=guild_id)
    date_label = bot.get_feedback("field_release_date", guild_id=guild_id)
    
    meta_lines = []
    if genre_text:
        meta_lines.append(f"**{genre_text}**")
    if score_text:
        meta_lines.append(f"{score_label}: {score_text}")
    if release_date:
        meta_lines.append(f"{date_label}: {release_date}")
    
    meta_text = "\n".join(meta_lines) if meta_lines else f"**{title}**"
    
    btn_label = bot.get_feedback("btn_view_tmdb", guild_id=guild_id)
    
    # Meta as plain text
    container_items.append(discord.ui.TextDisplay(meta_text))
    
    # 4. Buttons in a single ActionRow
    action_row = discord.ui.ActionRow()
    action_row.add_item(discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link))
    if trailer_url:
        t_label, t_emoji = bot.parse_emoji_text(bot.get_feedback("btn_watch_trailer", guild_id=guild_id))
        action_row.add_item(discord.ui.Button(label=t_label, emoji=t_emoji, url=trailer_url, style=discord.ButtonStyle.link))
    container_items.append(action_row)
    
    # 5. Branding
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

# Platform emoji mapping for streams
STREAM_EMOJIS = {
    "twitch": "<:twitch:1495846084352934139>",
    "kick": "<:kick:1498048392335724664>",
}

def generate_stream_layout(
    bot,
    guild_id: int,
    alert_text: str,
    display_name: str,
    title: str,
    url: str,
    thumbnail_url: str,
    profile_image_url: str,
    game: str,
    viewers: int,
    platform: str,
    accent_color: int
):
    """
    Centralized generator for Twitch/Kick stream notifications using Discord Components V2.
    Returns (content, view).
    """
    content = f"{alert_text}\n{url}"
    
    layout = discord.ui.LayoutView()
    container_items = []
    
    # 1. Title with platform emoji + LIVE indicator
    platform_emoji = STREAM_EMOJIS.get(platform, "")
    container_items.append(discord.ui.TextDisplay(f"### {platform_emoji} {display_name} • LIVE"))
    
    # 2. Stream title as subtitle
    if title:
        container_items.append(discord.ui.TextDisplay(title))
    
    # 3. Stream thumbnail
    if thumbnail_url:
        container_items.append(
            discord.ui.MediaGallery(discord.MediaGalleryItem(thumbnail_url))
        )
    
    # 4. Meta section (game + viewers) with watch button as accessory
    na_text = bot.get_feedback("default_unknown", guild_id=guild_id)
    game_label = bot.get_feedback("field_game", guild_id=guild_id)
    viewers_label = bot.get_feedback("field_viewers", guild_id=guild_id)
    
    meta_lines = []
    if game and game != na_text:
        meta_lines.append(f"**{game_label}:** {game}")
    if viewers:
        meta_lines.append(f"**{viewers_label}:** {viewers:,}")
    
    meta_text = "\n".join(meta_lines) if meta_lines else f"**{display_name}**"
    
    btn_label = bot.get_feedback("btn_view_stream", guild_id=guild_id)
    button = discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link)
    
    container_items.append(
        discord.ui.Section(discord.ui.TextDisplay(meta_text), accessory=button)
    )
    
    # 5. Branding
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

def generate_steam_news_layout(
    bot,
    guild_id: int,
    alert_text: str,
    title: str,
    url: str,
    description: str,
    image_url: str,
    author: str,
    published_ts: int,
    accent_color: int
):
    """
    Centralized generator for Steam News feeds using Discord Components V2.
    Returns (content, view).
    """
    content = f"{alert_text}\n{url}"
    
    layout = discord.ui.LayoutView()
    container_items = []
    
    # 1. Main Title with Steam emoji
    formatted_title_lines = []
    for i, line in enumerate(title.split('\n')):
        if i == 0:
            formatted_title_lines.append(f"### <:steam:1490131413956038656> {line}")
        else:
            formatted_title_lines.append(f"### {line}")
            
    container_items.append(discord.ui.TextDisplay("\n".join(formatted_title_lines)))
    
    # 2. Image (Thumbnail/Cover)
    if image_url:
        container_items.append(
            discord.ui.MediaGallery(discord.MediaGalleryItem(image_url))
        )
        
    # 3. Description (excerpt)
    if description:
        container_items.append(discord.ui.TextDisplay(description))
        
    # 4. Meta Section (Author + Date on left, Read More button on right)
    meta_lines = []
    if author:
        meta_lines.append(f"**{author}**")
        
    if published_ts:
        meta_lines.append(f"**{bot.get_feedback('field_published_at', guild_id=guild_id)}:** <t:{published_ts}:f> (<t:{published_ts}:R>)")
        
    meta_text = "\n".join(meta_lines)
    
    btn_label = bot.get_feedback("btn_read_more", guild_id=guild_id)
    button = discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link)
    
    if meta_text:
        container_items.append(
            discord.ui.Section(discord.ui.TextDisplay(meta_text), accessory=button)
        )
    else:
        # If no meta, just show the button on the right
        container_items.append(
            discord.ui.Section(discord.ui.TextDisplay(f"**{btn_label}**"), accessory=button)
        )
        
    # 5. Branding
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

def generate_github_layout(
    bot,
    guild_id: int,
    alert_text: str,
    repo_name: str,
    title: str,
    url: str,
    description: str,
    author: str,
    published_ts: int,
    accent_color: int
):
    """
    Centralized generator for GitHub Release feeds using Discord Components V2.
    Returns (content, view).
    """
    content = f"{alert_text}\n{url}"
    
    layout = discord.ui.LayoutView()
    container_items = []
    
    # 1. Main Title with GitHub emoji
    formatted_title_lines = []
    for i, line in enumerate(title.split('\n')):
        if i == 0:
            formatted_title_lines.append(f"### <:gitgub:1495845732874321980> {repo_name} - {line}")
        else:
            formatted_title_lines.append(f"### {line}")
            
    container_items.append(discord.ui.TextDisplay("\n".join(formatted_title_lines)))
        
    # 2. Description (excerpt)
    if description:
        container_items.append(discord.ui.TextDisplay(description))
        
    # 3. Meta Section
    meta_lines = []
    if author and author != "Unknown":
        meta_lines.append(f"**{author}**")
        
    if published_ts:
        meta_lines.append(f"**{bot.get_feedback('field_published_at', guild_id=guild_id)}:** <t:{published_ts}:f> (<t:{published_ts}:R>)")
        
    meta_text = "\n".join(meta_lines)
    
    btn_label = bot.get_feedback("btn_view_github", guild_id=guild_id)
    button = discord.ui.Button(label=btn_label, url=url, style=discord.ButtonStyle.link)
    
    if meta_text:
        container_items.append(
            discord.ui.Section(discord.ui.TextDisplay(meta_text), accessory=button)
        )
    else:
        # If no meta, just show the button on the right
        container_items.append(
            discord.ui.Section(discord.ui.TextDisplay(f"**{btn_label}**"), accessory=button)
        )
        
    # 4. Branding
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

def generate_dashboard_layout(bot, guild_id: int):
    """
    Generates a premium Discord Components V2 layout for the /dashboard command.
    """
    title = bot.get_feedback("dashboard_cmd_title", guild_id=guild_id)
    desc = bot.get_feedback("dashboard_cmd_desc", guild_id=guild_id)
    
    db_text = bot.get_feedback("btn_web_dashboard", guild_id=guild_id)
    sup_text = bot.get_feedback("btn_support_server", guild_id=guild_id)
    
    db_label, _ = bot.parse_emoji_text(db_text)
    sup_label, _ = bot.parse_emoji_text(sup_text)
    
    # Custom requested emojis
    db_emoji = "<:webcolorful:1498074998953476206>"
    sup_emoji = "<:discord:1498075023871709224>"
    
    layout = discord.ui.LayoutView()
    container_items = []
    
    # 1. Header with Bot Avatar as thumbnail
    bot_avatar = bot.user.display_avatar.url
    header_section = discord.ui.Section(
        discord.ui.TextDisplay(f"### {title}"),
        accessory=discord.ui.MediaGallery(discord.MediaGalleryItem(bot_avatar))
    )
    container_items.append(header_section)
    container_items.append(discord.ui.Separator())
    
    # 2. Description
    container_items.append(discord.ui.TextDisplay(desc))
    
    # 3. Action Buttons
    btn_db = discord.ui.Button(label=db_label, emoji=db_emoji, url="https://novafeeds.xyz", style=discord.ButtonStyle.link)
    btn_sup = discord.ui.Button(label=sup_label, emoji=sup_emoji, url="https://discord.gg/novafeeds", style=discord.ButtonStyle.link)
    
    container_items.append(discord.ui.Separator())
    container_items.append(discord.ui.ActionRow(btn_db, btn_sup))
    
    # Note: Branding removed per user request
            
    container = discord.ui.Container(*container_items, accent_color=0x2b2d31)
    layout.add_item(container)
    
    return layout
