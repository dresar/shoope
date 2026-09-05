"""
Configuration settings for Shopee Video Mobile Automation
"""
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUTS_DIR = OUTPUT_DIR
SCREENSHOTS_DIR = BASE_DIR / "screenshots"

# Ensure runtime directories exist
OUTPUT_DIR.mkdir(exist_ok=True)
SCREENSHOTS_DIR.mkdir(exist_ok=True)

# Android & ADB Config
DEFAULT_ADB_PATHS = [
    r"C:\Users\NCN0C\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"),
    r"C:\platform-tools\adb.exe",
    r"C:\scrcpy\adb.exe",
]

def get_adb_path() -> str:
    for path in DEFAULT_ADB_PATHS:
        if os.path.exists(path):
            return path
    return "adb"

ADB_PATH = get_adb_path()

# Shopee App Configuration
SHOPEE_PACKAGE = "com.shopee.id"
SHOPEE_MAIN_ACTIVITY = "com.shopee.app.ui.home.HomeActivity_"

# Remote Phone Storage Path for Videos
PHONE_VIDEO_DIR = "/sdcard/DCIM/Camera"

# Precision & Timing Delays (Seconds)
TIMEOUT_DEFAULT = 15
UI_TRANSITION_DELAY = 2.0
HUMAN_TYPING_DELAY = 0.05
POLL_INTERVAL = 0.5
