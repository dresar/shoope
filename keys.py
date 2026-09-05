"""
keys.py - Gemini API Key Pool Health Checker & Validator
Tests keys concurrently against Gemini models and saves active keys to valid_gemini_keys.json.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).parent.resolve()
VALID_KEYS_FILE = BASE_DIR / "valid_gemini_keys.json"
TIKTOK_KEYS_FILE = Path(r"C:\Users\NCN0C\Videos\tiktok-automation\api_keys.json")
TEST_MODEL = "gemini-2.0-flash"

def test_single_key(key_info, index=1) -> tuple:
    """Tests if an API key is valid and responsive."""
    if isinstance(key_info, str):
        api_key = key_info.strip()
        key_id = index
    elif isinstance(key_info, dict):
        key_id = key_info.get("id", index)
        api_key = key_info.get("api_key") or key_info.get("key") or key_info.get("credentials", {}).get("api_key")
    else:
        return {"id": index, "api_key": ""}, False, "Invalid format"

    if not api_key:
        return {"id": key_id, "api_key": ""}, False, "Empty API Key"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{TEST_MODEL}:generateContent?key={api_key}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": "Hello"}]}]
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            if resp.status == 200:
                return {"id": key_id, "api_key": api_key}, True, "200 OK"
    except urllib.error.HTTPError as e:
        return {"id": key_id, "api_key": api_key}, False, f"HTTP {e.code}"
    except Exception as e:
        return {"id": key_id, "api_key": api_key}, False, str(e)

    return {"id": key_id, "api_key": api_key}, False, "Unknown Error"

def validate_keys_pool(keys_source=None, output_file=VALID_KEYS_FILE, max_workers=15):
    """Validates list of keys and writes healthy ones to JSON file."""
    keys_to_test = []

    if keys_source is None:
        if os.path.exists(VALID_KEYS_FILE):
            keys_source = VALID_KEYS_FILE
        elif os.path.exists(TIKTOK_KEYS_FILE):
            keys_source = TIKTOK_KEYS_FILE

    if isinstance(keys_source, (str, Path)) and os.path.exists(keys_source):
        with open(keys_source, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
            if isinstance(raw_data, dict) and "keys" in raw_data:
                keys_to_test = raw_data["keys"]
            elif isinstance(raw_data, list):
                keys_to_test = raw_data
    elif isinstance(keys_source, list):
        keys_to_test = keys_source

    if not keys_to_test:
        print("[keys.py] No keys found to test.")
        return []

    print(f"[keys.py] Testing {len(keys_to_test)} API keys with {max_workers} threads...", flush=True)

    healthy_keys = []
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(test_single_key, k, idx + 1): idx for idx, k in enumerate(keys_to_test)}
        for f in as_completed(futures):
            res_key, ok, msg = f.result()
            key_id = res_key.get("id")
            if ok:
                healthy_keys.append(res_key)
                print(f"  [+] Key ID {key_id}: ACTIVE ({msg})", flush=True)
            else:
                print(f"  [-] Key ID {key_id}: FAILED ({msg})", flush=True)

    healthy_keys.sort(key=lambda x: x.get("id", 0))

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(healthy_keys, f, indent=2)

    print(f"\n[keys.py] Validation complete! {len(healthy_keys)}/{len(keys_to_test)} keys are active.")
    print(f"[keys.py] Saved healthy keys to: {output_file}")
    return healthy_keys

def get_active_key() -> str:
    """Gets the first valid active API key from the pool, or tests one."""
    if os.path.exists(VALID_KEYS_FILE):
        with open(VALID_KEYS_FILE, "r", encoding="utf-8") as f:
            keys = json.load(f)
            if keys:
                return keys[0].get("api_key")
    # If not yet validated, validate pool
    healthy = validate_keys_pool()
    if healthy:
        return healthy[0].get("api_key")
    return None

if __name__ == "__main__":
    validate_keys_pool()
