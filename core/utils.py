import unicodedata
import re

def slugify(text: str) -> str:
    """
    Normalizes string, converts to lowercase, removes non-alphanumeric characters,
    and converts spaces to hyphens.
    """
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s_]+', '-', text)
    return text

def clean_html(text: str) -> str:
    """Removes HTML tags and cleans up content."""
    if not text: return ""
    # Remove HTML tags
    clean = re.compile('<.*?>')
    text = re.sub(clean, '', text)
    # Remove BBCode tags
    text = re.sub(r'\[.*?\]', '', text)
    # Unescape some common HTML entities
    text = text.replace("&quot;", "\"").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&#39;", "'")
    return text.strip()

def extract_image_url(text: str) -> str | None:
    """Extracts the first image URL found in HTML or BBCode tags."""
    if not text: return None
    # Try HTML <img> tag
    img_match = re.search(r'<img [^>]*src=["\']([^"\']+)["\']', text)
    if img_match:
        return img_match.group(1)
    
    # Try BBCode [img] tag
    bb_match = re.search(r'\[img\](.*?)\[/img\]', text)
    if bb_match:
        return bb_match.group(1)
        
    return None
