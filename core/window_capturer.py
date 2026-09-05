"""
Window Capturer: Captures scrcpy 'Layar HP Shopee' window directly from Windows desktop.
Ultra-fast, 0ms phone overhead.
"""
import sys
import os
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import ctypes
from ctypes import wintypes
import time
from typing import Optional, List, Tuple
from PIL import ImageGrab
from config import SCREENSHOTS_DIR

user32 = ctypes.windll.user32

class WindowCapturer:
    def __init__(self, target_title_keyword: str = "Layar HP Shopee"):
        self.target_keyword = target_title_keyword

    def capture_window(self, save_path: str = None) -> bool:
        """Captures the scrcpy window and saves to file."""
        raw = self.capture_jpeg_bytes()
        if not raw:
            return False
        save_path = save_path or str(SCREENSHOTS_DIR / f"pc_window_{int(time.time())}.png")
        try:
            with open(save_path, "wb") as f:
                f.write(raw)
            return True
        except Exception:
            return False

    def find_window(self):
        """Finds the window handle (HWND) matching the keyword."""
        found_hwnd = []

        def enum_windows_proc(hwnd, lParam):
            if user32.IsWindowVisible(hwnd):
                length = user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buff = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, buff, length + 1)
                    title = buff.value
                    if self.target_keyword.lower() in title.lower() or "scrcpy" in title.lower() or "lh7n" in title.lower():
                        found_hwnd.append((hwnd, title))
            return True

        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
        user32.EnumWindows(WNDENUMPROC(enum_windows_proc), 0)
        return found_hwnd

    def capture_jpeg_bytes(self) -> Optional[bytes]:
        """Captures the scrcpy window directly to in-memory JPEG bytes (0ms disk I/O, up to 30 FPS)."""
        windows = self.find_window()
        if not windows:
            return None

        hwnd, title = windows[0]
        rect = wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))

        left = rect.left + 8
        top = rect.top + 32
        right = rect.right - 8
        bottom = rect.bottom - 8

        if right <= left or bottom <= top:
            left, top, right, bottom = rect.left, rect.top, rect.right, rect.bottom

        try:
            import io
            img = ImageGrab.grab(bbox=(left, top, right, bottom), all_screens=True)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=80)
            return buf.getvalue()
        except Exception:
            return None

if __name__ == "__main__":
    capturer = WindowCapturer()
    wins = capturer.find_window()
    print(f"Detected Windows: {wins}")
    if wins:
        test_file = str(SCREENSHOTS_DIR / "pc_window_test.png")
        if capturer.capture_window(test_file):
            print(f"[+] Berhasil capture jendela scrcpy ke: {test_file}")
