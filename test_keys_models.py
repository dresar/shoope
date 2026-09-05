import json
import urllib.request
import urllib.error

with open(r"C:\Users\NCN0C\Videos\tiktok-automation\api_keys.json", "r", encoding="utf-8") as f:
    d = json.load(f)

keys = d["keys"]

models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-lite-latest"]

payload = json.dumps({"contents": [{"parts": [{"text": "Hello"}]}]}).encode("utf-8")

for key in keys:
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    print(f"SUCCESS with key={key[:8]}... and model={model}")
                    break
        except urllib.error.HTTPError as e:
            pass
        except Exception as e:
            pass
