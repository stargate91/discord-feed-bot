import unicodedata
import re

def slugify(text: str) -> str:
    """
    Normalizes string, converts to lowercase, removes non-alphanumeric characters,
    and converts spaces to hyphens.
    
    Example: "Hétvégi csapatok" -> "hetvegi-csapatok"
    """
    # Normalize unicode characters to their closest ASCII equivalent (é -> e)
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    # Remove all non-word characters (everything except numbers and letters)
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    # Replace all spaces/underscores/repeating hyphens with a single hyphen
    text = re.sub(r'[-\s_]+', '-', text)
    return text
