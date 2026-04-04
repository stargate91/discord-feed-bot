import logging
import sys
import os
from colorama import init, Fore, Style

init(autoreset=True)

class ColoredFormatter(logging.Formatter):
    def format(self, record):
        level_colors = {
            logging.DEBUG: Fore.CYAN,
            logging.INFO: Fore.GREEN,
            logging.WARNING: Fore.YELLOW,
            logging.ERROR: Fore.RED,
            logging.CRITICAL: Fore.RED + Style.BRIGHT,
        }
        color = level_colors.get(record.levelno, Fore.WHITE)
        record.levelname = f"{color}{record.levelname}{Style.RESET_ALL}"
        # Highlight warnings and errors
        if record.levelno >= logging.WARNING:
            record.msg = f"{Style.BRIGHT}{record.msg}{Style.RESET_ALL}"
        return super().format(record)

log = logging.getLogger("FeedBot")

def setup_logging(level_name: str = "INFO"):
    level = getattr(logging, level_name.upper(), logging.INFO)
    log.setLevel(level)

    # Ensure directory exists for logging
    os.makedirs("data", exist_ok=True)

    # File Handler
    file_handler = logging.FileHandler("data/feed_bot.log", encoding="utf-8")
    file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    log.addHandler(file_handler)

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(ColoredFormatter("%(asctime)s [%(levelname)s] %(message)s", "%H:%M:%S"))
    log.addHandler(console_handler)
