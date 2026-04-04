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
    config["token"] = os.getenv("DISCORD_TOKEN") or config.get("token")
    # Use database_path from config, falling back to environment variable or default
    config["database_path"] = config.get("database_path") or os.getenv("DATABASE_PATH") or "data/feed_bot.db"
    
    return config
