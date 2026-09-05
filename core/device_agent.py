"""
Device Agent for high-precision Android UI automation with UIAutomator2 and Gemini Vision AI Grounding.
"""
import time
import os
import re
from typing import Optional, List, Tuple
from config import ADB_PATH, SCREENSHOTS_DIR, TIMEOUT_DEFAULT, UI_TRANSITION_DELAY
from core.adb_helper import ADBHelper
from core.vision_detector import VisionDetector

class DeviceAgent:
    def __init__(self, serial: Optional[str] = None):
        self.serial = serial
        self.adb = ADBHelper(ADB_PATH)
        self.vision = VisionDetector()
        self.d = None # uiautomator2 device instance

    def connect(self) -> bool:
        """Connects to the Android device via UIAutomator2."""
        try:
            import uiautomator2 as u2
            print("[*] Menghubungkan ke UIAutomator2 di HP...")
            if self.serial:
                self.d = u2.connect(self.serial)
            else:
                self.d = u2.connect()

            info = self.d.info
            print(f"[+] Berhasil terhubung ke HP: {info.get('productName', 'Android')} (Layar: {self.d.window_size()})")
            return True
        except Exception as e:
            print(f"[!] Gagal menghubungkan UIAutomator2: {e}")
            return False

    def dismiss_popups(self):
        """Auto-dismisses common nuisance popups in Shopee."""
        if not self.d:
            return

        dismiss_texts = [
            "Nanti Saja", "Tutup", "Lain Kali", "Batalkan", "Batal",
            "Izinkan", "Saat aplikasi digunakan", "Mengerti"
        ]

        for text in dismiss_texts:
            try:
                elem = self.d(text=text)
                if elem.exists(timeout=0.3):
                    print(f"[*] Menutup popup gangguan: '{text}'")
                    elem.click()
                    time.sleep(0.4)
            except Exception:
                pass

    def find_and_click(self, selectors: List[str], timeout: float = TIMEOUT_DEFAULT, by_type: str = "text") -> bool:
        """
        Attempts to find and click an element using multiple fallback selectors.
        Supports by_type: 'text', 'desc', 'id', 'any'.
        """
        if not self.d:
            return False

        start_time = time.time()
        while time.time() - start_time < timeout:
            for sel in selectors:
                try:
                    # 1. Text Exact & Contains & Regex
                    if by_type in ["text", "any"]:
                        if self.d(text=sel).exists(timeout=0.3):
                            print(f"[+] Menemukan tombol teks: '{sel}'")
                            self.d(text=sel).click()
                            return True
                        if self.d(textContains=sel).exists(timeout=0.3):
                            print(f"[+] Menemukan tombol mengandung teks: '{sel}'")
                            self.d(textContains=sel).click()
                            return True
                        if self.d(textMatches=sel).exists(timeout=0.3):
                            print(f"[+] Menemukan tombol regex: '{sel}'")
                            self.d(textMatches=sel).click()
                            return True

                    # 2. Content Description (Accessibility)
                    if by_type in ["desc", "any"]:
                        if self.d(description=sel).exists(timeout=0.3):
                            print(f"[+] Menemukan tombol deskripsi: '{sel}'")
                            self.d(description=sel).click()
                            return True
                        if self.d(descriptionContains=sel).exists(timeout=0.3):
                            print(f"[+] Menemukan tombol mengandung deskripsi: '{sel}'")
                            self.d(descriptionContains=sel).click()
                            return True

                    # 3. Resource ID
                    if by_type in ["id", "any"]:
                        if self.d(resourceId=sel).exists(timeout=0.3):
                            print(f"[+] Menemukan tombol ID: '{sel}'")
                            self.d(resourceId=sel).click()
                            return True
                except Exception:
                    pass

            self.dismiss_popups()
            time.sleep(0.3)

        return False

    def click_with_ai(self, element_description: str) -> bool:
        """
        Takes real-time screenshot, sends to Gemini Multimodal Vision AI to get exact coordinates,
        and clicks the target element.
        """
        print(f"[*] Mengambil screenshot untuk dianalisis oleh AI Vision ('{element_description}')...")
        screenshot_file = str(SCREENSHOTS_DIR / f"ai_grounding_{int(time.time())}.png")
        if not self.adb.take_screenshot(screenshot_file):
            return False

        coords = self.vision.locate_element_with_ai(screenshot_file, element_description)
        if coords:
            x, y = coords
            print(f"[+] AI Vision sukses: Mengklik koordinat ({x}, {y})...")
            if self.d:
                self.d.click(x, y)
            else:
                self.adb.run_command(["shell", "input", "tap", str(x), str(y)])
            time.sleep(1.0)
            return True

        # Fallback to orange button detection if AI Vision is unavailable
        print("[*] Fallback: Mencoba deteksi tombol oranye lokal...")
        orange_coords = self.vision.find_orange_action_button(screenshot_file)
        if orange_coords:
            x, y = orange_coords
            if self.d:
                self.d.click(x, y)
            else:
                self.adb.run_command(["shell", "input", "tap", str(x), str(y)])
            return True

        return False

    def ensure_toggle_enabled(self, label_text: str = "penggunaan ulang konten", timeout: float = 4.0) -> bool:
        """Ensures a switch / checkbox with the given label is checked/enabled."""
        if not self.d:
            return False

        print(f"[*] Memeriksa status opsi '{label_text}'...")
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                # 1. By direct resourceId of the toggle
                toggle = self.d(resourceIdMatches=r".*allow_reuse_toggle.*")
                if toggle.exists(timeout=0.5):
                    print("[+] Mengaktifkan toggle via resourceId 'allow_reuse_toggle'...")
                    toggle.click()
                    time.sleep(0.5)
                    return True

                # 2. By text match
                label = self.d(textContains=label_text)
                if label.exists(timeout=0.5):
                    info = label.info
                    b = info.get("bounds", {})
                    if b:
                        # Click on the right side of the row where the switch is
                        w, _ = self.d.window_size()
                        target_x = int(w * 0.90)
                        target_y = int((b.get("top", 0) + b.get("bottom", 0)) / 2)
                        print(f"[+] Mengaktifkan toggle pada baris ({target_x}, {target_y})...")
                        self.d.click(target_x, target_y)
                        time.sleep(0.5)
                        return True
            except Exception:
                pass
            time.sleep(0.3)

        # Fallback click on typical toggle coordinate (x=970, y=1180)
        try:
            w, h = self.d.window_size()
            self.d.click(int(w * 0.90), int(h * 0.49))
            return True
        except Exception:
            return False

    def handle_whatsapp_popup(self, timeout: float = 6.0) -> bool:
        """Detects post-upload WhatsApp share popup and clicks 'Kembali'."""
        print("[*] Memeriksa pop-up 'Bagikan ke WhatsApp'...")
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                if self.d(text="Kembali").exists(timeout=0.5):
                    print("[+] Pop-up terdeteksi: Mengklik 'Kembali'...")
                    self.d(text="Kembali").click()
                    time.sleep(1.0)
                    return True
                if self.d(textContains="WhatsApp").exists(timeout=0.5) and self.d(text="Kembali").exists(timeout=0.5):
                    self.d(text="Kembali").click()
                    time.sleep(1.0)
                    return True
            except Exception:
                pass
            time.sleep(0.5)
        return False

    def input_text(self, text: str, clear_first: bool = False):
        """Types text safely using fastinput_ime or uiautomator2."""
        if not self.d:
            return

        try:
            self.d.set_fastinput_ime(True)
            if clear_first:
                self.d.clear_text()
            self.d.send_keys(text)
            self.d.set_fastinput_ime(False)
        except Exception:
            escaped_text = text.replace(" ", "%s").replace("\n", "%s")
            self.adb.run_command(["shell", "input", "text", escaped_text])

    def open_posting_screen(self, timeout: float = 10.0) -> bool:
        """
        Smartly navigates to the Camera/Recorder page from any screen state.
        Handles:
        1. Already on Camera/Recorder (text="Galeri", text="Video Produk")
        2. Top-right Create Icon (+) on Live/Video Feed (desc="click top right create icon" -> (1009, 157))
        3. Top-left Profile Icon (desc="click me page icon" -> (72, 157))
        4. Small circular FAB (+) button on Profile (desc="click to post video" -> center: 965, 2158)
        5. Large pill '+ Posting Video' button on Profile (text="Posting Video" -> center: 860, 2170)
        """
        if not self.d:
            return False

        print("[*] Memeriksa status layar untuk membuka Galeri/Perekam...")
        start_time = time.time()
        while time.time() - start_time < timeout:
            # 1. Sudah di Layar Kamera / Perekam
            if self.d(text="Galeri").exists(timeout=0.5) or self.d(text="Video Produk").exists(timeout=0.5):
                print("[+] Layar Kamera/Perekam sudah terbuka.")
                return True

            # 2. Tutup popup interaktif jika ada (e.g. Ikuti/Ditutup dalam/X)
            if self.d(textContains="Ditutup dalam").exists(timeout=0.2) or self.d(text="Ikuti Sekarang").exists(timeout=0.2):
                print("[*] Menutup pop-up live stream...")
                self.d.click(980, 1800)
                time.sleep(0.5)

            # 3. Tombol Buat Konten (+) di Pojok Kanan Atas (Layar Live / Video / Feed)
            if self.d(description="click top right create icon").exists(timeout=0.5):
                print("[+] Menemukan tombol (+) 'click top right create icon' di pojok kanan atas. Mengklik...")
                self.d(description="click top right create icon").click()
                time.sleep(2.0)
                if self.d(text="Galeri").exists(timeout=1.5):
                    return True
                continue

            # 4. Jika di Feed Live/Video (terdapat tab 'Untuk Anda', 'Live', atau 'Drama'), klik langsung icon create (1009, 157)
            if self.d(text="Untuk Anda").exists(timeout=0.5) or self.d(text="Drama").exists(timeout=0.5):
                print("[*] Terdeteksi di Layar Feed/Live: Mengklik icon create di pojok kanan atas (1009, 157)...")
                self.d.click(1009, 157)
                time.sleep(2.0)
                if self.d(text="Galeri").exists(timeout=1.5):
                    return True
                # Jika belum terbuka, coba klik icon Profile di pojok kiri atas (72, 157)
                print("[*] Mencoba navigasi ke Profil via icon kiri atas (72, 157)...")
                self.d.click(72, 157)
                time.sleep(2.0)
                continue

            # 5. Tombol Bulat Kecil (+) di Profil (desc='click to post video')
            if self.d(description="click to post video").exists(timeout=0.5):
                print("[+] Menemukan tombol bulat (+) 'click to post video' di profil. Mengklik...")
                self.d(description="click to post video").click()
                time.sleep(2.0)
                if self.d(text="Galeri").exists(timeout=1.5):
                    return True
                continue

            # 6. Tombol Besar Pill '+ Posting Video' di Profil (text='Posting Video')
            if self.d(text="Posting Video").exists(timeout=0.5):
                print("[+] Menemukan tombol besar 'Posting Video' di profil. Mengklik...")
                self.d(text="Posting Video").click()
                time.sleep(2.0)
                if self.d(text="Galeri").exists(timeout=1.5):
                    return True
                continue

            # 7. Di Profil tetapi tombol tidak terdeteksi via selector: klik koordinat FAB (965, 2158)
            if self.d(text="Pengikut").exists(timeout=0.3) or self.d(text="Mengikuti").exists(timeout=0.3):
                print("[*] Berada di Profil: Mengklik koordinat tombol FAB (+)...")
                self.d.click(965, 2158)
                time.sleep(2.0)
                if self.d(text="Galeri").exists(timeout=1.5):
                    return True
                # Scroll ke atas sedikit untuk mengembalikan tombol pill
                self.d.swipe(500, 800, 500, 1600, 0.2)
                time.sleep(1.0)
                continue

            # 8. Navigasi ke tab Profil via icon kiri atas (72, 157)
            if self.d(description="click me page icon").exists(timeout=0.5):
                print("[*] Mengklik icon Profil di kiri atas (72, 157)...")
                self.d(description="click me page icon").click()
                time.sleep(2.0)
                continue

            time.sleep(0.5)

        return self.d(text="Galeri").exists(timeout=1.5)
