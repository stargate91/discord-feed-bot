import json
import os
from dotenv import load_dotenv

def load_config(config_file: str = "config.json"):
    # Load environment variables from .env
    load_dotenv()
    
    if not os.path.exists(config_file):
        raise FileNotFoundError(f"Configuration file not found: {config_file}")
        
    with open(config_file, "r", encoding="utf-8") as f:
        config = json.load(f)
    
    # Overwrite with environment variables if present
    config["token"] = os.getenv("BOT_TOKEN") or config.get("token")
    config["tmdb_api_key"] = os.getenv("TMDB_API_KEY") or config.get("tmdb_api_key")
    config["tmdb_bearer_token"] = os.getenv("TMDB_BEARER_TOKEN") or config.get("tmdb_bearer_token")
    config["database_url"] = os.getenv("DATABASE_URL") or config.get("database_url")
    
    return config
