"""
ADB Helper for device management, wireless auto-reconnect, and multi-device serial handling.
"""
import os
import subprocess
import time
import json
from pathlib import Path
from typing import Optional, List, Tuple
from config import ADB_PATH, PHONE_VIDEO_DIR, SHOPEE_PACKAGE, BASE_DIR

LAST_IP_FILE = BASE_DIR / "last_phone_ip.json"

class ADBHelper:
    def __init__(self, adb_path: str = ADB_PATH, serial: Optional[str] = None):
        self.adb_path = adb_path
        self.serial = serial

    def run_command(self, args: List[str], timeout: int = 30) -> Tuple[int, str]:
        """Runs an ADB command, automatically prepending -s <serial> if serial is set."""
        if self.serial and args and args[0] not in ["devices", "connect", "disconnect", "kill-server", "start-server"]:
            cmd = [self.adb_path, "-s", self.serial] + args
        else:
            cmd = [self.adb_path] + args

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                encoding="utf-8",
                errors="replace"
            )
            return res.returncode, res.stdout.strip()
        except Exception as e:
            return -1, str(e)

    def save_known_ip(self, ip: str):
        try:
            with open(LAST_IP_FILE, "w", encoding="utf-8") as f:
                json.dump({"ip": ip}, f)
        except Exception:
            pass

    def get_known_ip(self) -> Optional[str]:
        if os.path.exists(LAST_IP_FILE):
            try:
                with open(LAST_IP_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("ip")
            except Exception:
                pass
        return "192.168.18.101"

    def auto_connect_wifi(self) -> bool:
        ip = self.get_known_ip()
        if ip:
            target = f"{ip}:5555" if ":" not in ip else ip
            print(f"[*] Menghubungkan nirkabel ke: {target}...")
            code, out = self.run_command(["connect", target], timeout=8)
            if "connected" in out.lower() or "already connected" in out.lower():
                print(f"[+] Berhasil tersambung via WiFi ke {target}!")
                return True
        return False

    def get_connected_devices(self) -> List[dict]:
        code, out = self.run_command(["devices"])
        devices = []
        if code != 0:
            return devices

        for line in out.splitlines()[1:]:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) >= 2:
                devices.append({
                    "serial": parts[0],
                    "state": parts[1]
                })
        return devices

    def is_device_ready(self) -> Tuple[bool, str]:
        devices = self.get_connected_devices()

        # If no device found or offline, attempt WiFi connect
        if not devices or all(d["state"] != "device" for d in devices):
            self.auto_connect_wifi()
            time.sleep(1.0)
            devices = self.get_connected_devices()

        ready_devices = [d for d in devices if d["state"] == "device"]
        if not ready_devices:
            return False, "Tidak ada HP Android yang siap via WiFi atau USB."

        # Pick the active wireless device first, or first ready device
        wifi_devs = [d for d in ready_devices if ":" in d["serial"]]
        selected = wifi_devs[0] if wifi_devs else ready_devices[0]
        self.serial = selected["serial"]

        if ":" in self.serial:
            ip_clean = self.serial.split(":")[0]
            self.save_known_ip(ip_clean)

        return True, f"HP terdeteksi siap: {self.serial}"

    def wake_and_unlock(self):
        code, out = self.run_command(["shell", "dumpsys", "power"])
        if "mHoldingDisplaySuspendBlocker=true" not in out and "Display Power: state=ON" not in out:
            self.run_command(["shell", "input", "keyevent", "26"])
            time.sleep(0.5)
        self.run_command(["shell", "input", "swipe", "500", "1500", "500", "300", "300"])
        time.sleep(0.5)

    def push_video(self, local_path: str, remote_dir: str = PHONE_VIDEO_DIR) -> Optional[str]:
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"File video lokal tidak ditemukan: {local_path}")

        timestamp_str = time.strftime("%Y%m%d_%H%M%S")
        remote_filename = f"VID_{timestamp_str}_SHOPEE.mp4"
        remote_path = f"{remote_dir.rstrip('/')}/{remote_filename}"

        self.run_command(["shell", f"rm -f {remote_dir.rstrip('/')}/VID_*_SHOPEE.mp4"])

        print(f"[*] Mengirim video ke HP ({self.serial}): -> {remote_path}...")
        code, out = self.run_command(["push", local_path, remote_path], timeout=180)
        if code != 0:
            print(f"[!] Gagal push video: {out}")
            return None

        self.run_command(["shell", "touch", remote_path])
        print("[*] Memperbarui indeks Galeri HP (MediaStore Scanner)...")
        self.run_command([
            "shell", "am", "broadcast",
            "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
            "-d", f"file://{remote_path}"
        ])
        self.run_command([
            "shell", "content", "call",
            "--uri", "content://media",
            "--method", "scan_volume",
            "--arg", "external_primary"
        ])
        time.sleep(1.5)
        return remote_path

    def delete_remote_video(self, remote_path: str):
        if not remote_path:
            return
        print(f"[*] Membersihkan video dari memori HP: {remote_path}...")
        self.run_command(["shell", "rm", "-f", remote_path])
        self.run_command([
            "shell", "am", "broadcast",
            "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
            "-d", f"file://{remote_path}"
        ])

    def launch_shopee(self):
        self.run_command([
            "shell", "monkey",
            "-p", SHOPEE_PACKAGE,
            "-c", "android.intent.category.LAUNCHER", "1"
        ])

    def take_screenshot(self, save_path: str) -> bool:
        remote_tmp = "/sdcard/shopee_screen_tmp.png"
        self.run_command(["shell", "screencap", "-p", remote_tmp])
        code, _ = self.run_command(["pull", remote_tmp, save_path])
        self.run_command(["shell", "rm", remote_tmp])
        return code == 0
