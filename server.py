import os
import sys
import time
import json
import asyncio
import subprocess
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import SCREENSHOTS_DIR, OUTPUTS_DIR
from core.adb_helper import ADBHelper
from core.video_enhancer import VideoEnhancer
from core.window_capturer import WindowCapturer
from uploader import ShopeeUploader

app = FastAPI(title="Shopee Video Mobile Automation Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR = OUTPUTS_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/screenshots", StaticFiles(directory=str(SCREENSHOTS_DIR)), name="screenshots")
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()
current_uploader: Optional[ShopeeUploader] = None
is_running = False
main_event_loop = None
window_capturer = WindowCapturer(target_title_keyword="Layar HP Shopee")
latest_frame_bytes: Optional[bytes] = None

def sync_event_dispatcher(event_type: str, data: dict):
    global main_event_loop
    if main_event_loop and main_event_loop.is_running():
        asyncio.run_coroutine_threadsafe(
            manager.broadcast({"type": event_type, "data": data, "timestamp": time.time()}),
            main_event_loop
        )

# Background Frame Streamer Generator for Live MJPEG
async def frame_stream_generator():
    global latest_frame_bytes
    adb = ADBHelper()
    last_adb_capture = 0

    while True:
        frame = None
        # 1. Prioritas Utama: Capture langsung dari jendela Scrcpy (0ms overhead, up to 30 FPS)
        try:
            frame = window_capturer.capture_jpeg_bytes()
        except Exception:
            pass

        # 2. Fallback: Tangkap frame via ADB screenshot jika Scrcpy belum terbuka (interval 1.5s)
        if not frame:
            now = time.time()
            if now - last_adb_capture > 1.5:
                last_adb_capture = now
                p = SCREENSHOTS_DIR / "live_current_inspect.png"
                if p.exists():
                    try:
                        with open(p, "rb") as f:
                            frame = f.read()
                            latest_frame_bytes = frame
                    except Exception:
                        pass
            elif latest_frame_bytes:
                frame = latest_frame_bytes

        if frame:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        
        await asyncio.sleep(0.04)  # 25 FPS stream rate

@app.get("/api/stream.mjpg")
async def live_video_stream():
    """Returns continuous real-time video stream in MJPEG format."""
    return StreamingResponse(
        frame_stream_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/api/device/launch_scrcpy")
async def launch_scrcpy():
    """Launches scrcpy mirror window for ultra fast 30-60 FPS capturing."""
    try:
        bat_file = BASE_DIR / "buka_layar_hp.bat"
        if bat_file.exists():
            subprocess.Popen(["cmd.exe", "/c", str(bat_file)], creationflags=subprocess.CREATE_NEW_CONSOLE)
            return {"success": True, "message": "Scrcpy Live Mirroring berhasil diluncurkan!"}
        return {"success": False, "error": "buka_layar_hp.bat tidak ditemukan"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global current_uploader, is_running
    await manager.connect(websocket)
    adb = ADBHelper()
    ready, msg = adb.is_device_ready()
    await websocket.send_json({
        "type": "device_status",
        "data": {
            "ready": ready,
            "serial": adb.serial,
            "message": msg,
            "is_running": is_running
        }
    })
    try:
        while True:
            raw_msg = await websocket.receive_text()
            try:
                payload = json.loads(raw_msg)
                action = payload.get("action")

                if action == "get_device_status":
                    ready, msg = adb.is_device_ready()
                    await websocket.send_json({
                        "type": "device_status",
                        "data": {"ready": ready, "serial": adb.serial, "message": msg, "is_running": is_running}
                    })

                elif action == "take_screenshot":
                    p = str(SCREENSHOTS_DIR / "live_manual_snap.png")
                    ok = adb.take_screenshot(p)
                    if ok:
                        t = int(time.time() * 1000)
                        await manager.broadcast({
                            "type": "screenshot",
                            "data": {"name": "live_manual_snap", "path": f"/screenshots/live_manual_snap.png?t={t}"}
                        })

                elif action == "stop_batch":
                    if current_uploader:
                        current_uploader.stop()
                    is_running = False
                    await manager.broadcast({"type": "log", "data": {"level": "warning", "message": "Proses dihentikan oleh pengguna."}})
            except Exception as e:
                print(f"Error handling WS message: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/device/status")
async def get_device_status():
    adb = ADBHelper()
    ready, msg = adb.is_device_ready()
    return {"ready": ready, "serial": adb.serial, "message": msg, "is_running": is_running}

@app.post("/api/device/connect")
async def connect_device(payload: dict):
    serial = payload.get("serial", "192.168.18.101:5555")
    adb = ADBHelper(serial=serial)
    ok = adb.connect()
    ready, msg = adb.is_device_ready()
    return {"success": ok, "ready": ready, "serial": adb.serial, "message": msg}

@app.post("/api/device/screenshot")
async def capture_screen():
    adb = ADBHelper()
    p = str(SCREENSHOTS_DIR / "live_dashboard_screen.png")
    ok = adb.take_screenshot(p)
    if ok:
        t = int(time.time() * 1000)
        url = f"/screenshots/live_dashboard_screen.png?t={t}"
        await manager.broadcast({"type": "screenshot", "data": {"name": "live_dashboard_screen", "path": url}})
        return {"success": True, "url": url}
    return {"success": False, "error": "Gagal mengambil screenshot HP"}

@app.post("/api/scan_folder")
async def scan_folder(payload: dict):
    folder_path = payload.get("folder_path", "").strip()
    if not folder_path or not os.path.isdir(folder_path):
        raise HTTPException(status_code=400, detail="Folder tidak ditemukan atau path tidak valid.")

    enhancer = VideoEnhancer()
    videos = []
    valid_exts = [".mp4", ".mov", ".mkv", ".avi"]
    
    for root, _, files in os.walk(folder_path):
        for f in files:
            if any(f.lower().endswith(ext) for ext in valid_exts):
                full_path = os.path.join(root, f)
                w, h = enhancer.get_resolution(full_path)
                size_mb = round(os.path.getsize(full_path) / (1024 * 1024), 2)
                
                base_name = os.path.splitext(f)[0]
                clean_name = base_name.replace("-", " ").replace("_", " ")
                suggested_caption = f"{clean_name}! Barang unik serbaguna praktis wajib punya #RacunShopee #BarangUnik"[:150]
                
                res_label = f"{w}x{h} HD" if (w >= 720 or h >= 1280) else f"{w}x{h} (Auto Upscale 720p)"
                
                videos.append({
                    "path": full_path,
                    "filename": f,
                    "size_mb": size_mb,
                    "width": w,
                    "height": h,
                    "resolution_label": res_label,
                    "suggested_caption": suggested_caption,
                    "default_product": "barang unik"
                })

    return {"folder": folder_path, "count": len(videos), "videos": videos}

@app.post("/api/upload_video_file")
async def upload_video_file(file: UploadFile = File(...)):
    dest_path = UPLOADS_DIR / file.filename
    with open(dest_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    enhancer = VideoEnhancer()
    w, h = enhancer.get_resolution(str(dest_path))
    size_mb = round(os.path.getsize(str(dest_path)) / (1024 * 1024), 2)
    base_name = os.path.splitext(file.filename)[0]
    res_label = f"{w}x{h} HD" if (w >= 720 or h >= 1280) else f"{w}x{h} (Auto Upscale 720p)"

    return {
        "path": str(dest_path),
        "filename": file.filename,
        "size_mb": size_mb,
        "width": w,
        "height": h,
        "resolution_label": res_label,
        "suggested_caption": f"{base_name}! Rekomendasi barang unik praktis untuk di rumah #RacunShopee #BarangUnik"[:150],
        "default_product": "barang unik"
    }

def run_uploader_task(items: list, delay: float):
    global current_uploader, is_running
    try:
        is_running = True
        current_uploader = ShopeeUploader(event_callback=sync_event_dispatcher)
        current_uploader.upload_batch(items, delay_between_videos=delay)
    except Exception as e:
        print(f"[Batch Task Error] {e}")
        sync_event_dispatcher("log", {"level": "error", "message": f"Error batch: {str(e)}"})
    finally:
        is_running = False
        current_uploader = None

@app.post("/api/batch/start")
async def start_batch(payload: dict):
    global is_running, main_event_loop
    if is_running:
        raise HTTPException(status_code=400, detail="Proses upload batch sedang berjalan.")

    items = payload.get("items", [])
    delay = float(payload.get("delay", 3.0))

    if not items:
        raise HTTPException(status_code=400, detail="Daftar video kosong.")

    main_event_loop = asyncio.get_event_loop()
    asyncio.get_event_loop().run_in_executor(None, run_uploader_task, items, delay)
    return {"success": True, "message": f"Batch dimulai dengan {len(items)} video."}

@app.post("/api/batch/stop")
async def stop_batch():
    global current_uploader, is_running
    if current_uploader:
        current_uploader.stop()
    is_running = False
    return {"success": True, "message": "Sinyal stop berhasil dikirim."}

@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    index_path = BASE_DIR / "templates" / "index.html"
    if index_path.exists():
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Dashboard template not found.</h1>"

if __name__ == "__main__":
    print("[+] Menjalankan Web Dashboard Shopee Video di http://localhost:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False, log_level="info")

