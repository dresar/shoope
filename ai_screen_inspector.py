"""
AI Screen Inspector: Captures the live phone screen and analyzes it using Gemini Vision AI.
Tells you exactly what is on the screen, current app state, and detected buttons.
"""
import os
import sys
import json
import base64
from pathlib import Path
from PIL import Image

from config import SCREENSHOTS_DIR, ADB_PATH
from core.adb_helper import ADBHelper

BASE_DIR = Path(__file__).parent.resolve()
SCREENSHOT_PATH = SCREENSHOTS_DIR / "live_screen.png"
TIKTOK_KEYS_FILE = Path(r"C:\Users\NCN0C\Videos\tiktok-automation\api_keys.json")

def get_working_keys():
    if os.path.exists(TIKTOK_KEYS_FILE):
        with open(TIKTOK_KEYS_FILE, "r", encoding="utf-8") as f:
            d = json.load(f)
            return d.get("keys", [])
    return [os.environ.get("GEMINI_API_KEY")]

def analyze_screen_with_ai():
    print("=" * 60)
    print("   AI VISION LIVE SCREEN INSPECTOR")
    print("=" * 60)
    adb = ADBHelper(ADB_PATH)
    ready, msg = adb.is_device_ready()
    if not ready:
        print(f"[!] Error koneksi: {msg}")
        return

    print(f"[*] Mengambil screenshot dari HP ({adb.serial})...")
    if not adb.take_screenshot(str(SCREENSHOT_PATH)):
        print("[!] Gagal mengambil screenshot HP.")
        return

    print(f"[+] Screenshot berhasil tersimpan ({os.path.getsize(SCREENSHOT_PATH)} bytes).")
    
    from google import genai
    from google.genai import types

    keys = get_working_keys()
    pil_img = Image.open(SCREENSHOT_PATH)

    prompt = """
Lihat screenshot layar smartphone ini dengan sangat teliti.
Jelaskan dalam Bahasa Indonesia dengan format ringkas & rapi:
1. Halaman / Aplikasi apa yang sedang terbuka di layar HP saat ini?
2. Apa saja elemen atau tombol utama yang terlihat di layar?
3. Apakah aplikasi Shopee sedang terbuka? Jika ya, berada di halaman mana?
4. Apa langkah atau tombol yang harus diklik selanjutnya jika ingin mengunggah Shopee Video?
"""

    for idx, key in enumerate(keys):
        try:
            print(f"[*] Mengirim screenshot ke Gemini Vision AI (Key #{idx + 1})...")
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[pil_img, prompt]
            )
            
            print("\n" + "=" * 60)
            print("   HASIL ANALISIS AI TERHADAP LAYAR HP ANDA:")
            print("=" * 60)
            print(response.text)
            print("=" * 60)
            return
        except Exception as e:
            print(f"[!] Key #{idx + 1} gagal ({e}), mencoba key berikutnya...")

if __name__ == "__main__":
    analyze_screen_with_ai()
