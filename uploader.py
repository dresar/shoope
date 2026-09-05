"""
Master Shopee Video Mobile Uploader Script - Production & WebSocket Enabled
Auto 720p HD Upscaler + Tab 'Semua' Affiliate Search + 150-char strict limit + Auto Cleanup.
"""
import sys
import os
import time
import argparse
from pathlib import Path
from typing import Optional, List, Callable

# Ensure UTF-8 output on Windows console for emojis
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from config import BASE_DIR, UI_TRANSITION_DELAY, TIMEOUT_DEFAULT, SCREENSHOTS_DIR
from core.adb_helper import ADBHelper
from core.device_agent import DeviceAgent
from core.video_enhancer import VideoEnhancer

def format_caption(caption: str, hashtags: str = "", max_chars: int = 150) -> str:
    """Formats and trims caption + hashtags to strictly fit under 150 characters."""
    caption = caption.strip()
    hashtags = hashtags.strip()
    
    if not hashtags:
        return caption[:max_chars]
        
    full = f"{caption} {hashtags}".strip()
    if len(full) <= max_chars:
        return full

    allowed_caption_len = max_chars - len(hashtags) - 4
    if allowed_caption_len > 15:
        trimmed = caption[:allowed_caption_len].rstrip()
        return f"{trimmed}.. {hashtags}".strip()
    return full[:max_chars]

class ShopeeUploader:
    def __init__(self, serial: Optional[str] = None, event_callback: Optional[Callable] = None):
        self.adb = ADBHelper()
        self.agent = DeviceAgent(serial=serial)
        self.enhancer = VideoEnhancer(target_w=720, target_h=1280)
        self.event_callback = event_callback
        self.is_stopped = False

    def emit(self, event_type: str, data: dict):
        """Dispatches an event to the registered WebSocket callback if present."""
        if self.event_callback:
            try:
                self.event_callback(event_type, data)
            except Exception as e:
                print(f"[!] Callback error: {e}")

    def snap(self, name: str):
        """Saves a step-by-step screenshot for visual inspection & learning."""
        p = str(SCREENSHOTS_DIR / f"{name}.png")
        self.adb.take_screenshot(p)
        print(f"[Screenshot] Tersimpan: {p}")
        self.emit("screenshot", {"name": name, "path": f"/screenshots/{name}.png?t={int(time.time()*1000)}"})
        return p

    def upload_single_video(
        self,
        video_path: str,
        caption: str,
        hashtags: str = "",
        product_keyword: Optional[str] = None,
        is_first_video: bool = True
    ) -> bool:
        if self.is_stopped:
            return False

        final_caption = format_caption(caption, hashtags, max_chars=150)

        print("\n" + "=" * 65)
        print("   MEMULAI UPLOAD SHOPEE VIDEO MOBILE (HD & TAB SEMUA)")
        print("=" * 65)
        print(f"[*] File Video : {os.path.basename(video_path)}")
        print(f"[*] Caption    : {final_caption} ({len(final_caption)}/150 karakter)")
        if product_keyword:
            print(f"[*] Produk Aff : {product_keyword}")
        print("=" * 65)

        self.emit("log", {"level": "info", "message": f"Memulai upload video: {os.path.basename(video_path)}"})

        # 1. Pastikan perangkat siap
        ready, msg = self.adb.is_device_ready()
        if not ready:
            err_msg = f"Perangkat tidak siap: {msg}"
            print(f"[!] {err_msg}")
            self.emit("log", {"level": "error", "message": err_msg})
            return False

        if self.adb.serial:
            self.agent.serial = self.adb.serial

        self.adb.wake_and_unlock()

        if not self.agent.d:
            if not self.agent.connect():
                err_msg = "Gagal menghubungkan UIAutomator2 ke HP"
                print(f"[!] {err_msg}")
                self.emit("log", {"level": "error", "message": err_msg})
                return False

        # Screenshot status awal
        self.snap("step_01_initial_state")

        # 2. AUTO UPSCALE KE 720p HD JIKA RESOLUSI < 576p
        self.emit("step", {"step": 1, "title": "Cek Resolusi & Upscale HD", "desc": "Memeriksa resolusi 720p..."})
        print("\n[*] Memeriksa resolusi video...")
        ready_video_path = self.enhancer.upscale_to_hd(video_path)

        if self.is_stopped: return False

        # 3. INJEKSI VIDEO KE MEMORI HP DENGAN TIMESTAMP TERKINI
        self.emit("step", {"step": 2, "title": "Injeksi Video ke Galeri HP", "desc": "Transfer file & update scanner..."})
        print(f"\n[LANGKAH 0] Menginjeksi file video HD '{os.path.basename(ready_video_path)}' ke Galeri HP...")
        remote_video = self.adb.push_video(ready_video_path)
        if not remote_video:
            err_msg = "Gagal mentransfer video ke galeri HP."
            print(f"[!] {err_msg}")
            self.emit("log", {"level": "error", "message": err_msg})
            return False
        time.sleep(1.0)

        if self.is_stopped: return False

        # 4. NAVIGASI KE LAYAR PEREKAM / GALERI DARI PROFIL (HANDLES BULAT (+) & PILL BESAR)
        self.emit("step", {"step": 3, "title": "Buka Layar Perekam / Galeri", "desc": "Klik tombol Posting Video / (+) di profil..."})
        print("\n[LANGKAH 1] Memeriksa status layar & membuka Galeri...")
        self.agent.open_posting_screen(timeout=8.0)
        time.sleep(UI_TRANSITION_DELAY)
        self.agent.dismiss_popups()
        self.snap("step_02_camera_recorder_page")

        if self.is_stopped: return False

        # 5. KLIK TOMBOL 'GALERI' (DI BAGIAN BAWAH KANAN PEREKAM)
        self.emit("step", {"step": 4, "title": "Buka Galeri Picker", "desc": "Mengklik icon Galeri..."})
        print("\n[LANGKAH 2] Mengklik tombol 'Galeri' di bagian kanan bawah...")
        if self.agent.d(text="Galeri").exists(timeout=1.5):
            self.agent.d(text="Galeri").click()
        else:
            self.agent.d.click(848, 1870)
        time.sleep(2.5)
        self.snap("step_03_gallery_picker")

        if self.is_stopped: return False

        # 6. PILIH TAB 'VIDEO' DI GALERI & PILIH VIDEO PERTAMA
        self.emit("step", {"step": 5, "title": "Pilih Tab Video & Item 1", "desc": "Memilih video terbaru di grid..."})
        print("\n[LANGKAH 3] Mengklik tab Video & memilih video pertama...")
        # Klik tab Video (540, 360)
        if self.agent.d(text="Video").exists(timeout=1.5):
            self.agent.d(text="Video").click()
        else:
            self.agent.d.click(540, 360)
        time.sleep(1.5)

        # Klik lingkaran centang pada item video pertama (206, 490)
        print("[*] Mencentang item video pertama di grid galeri (206, 490)...")
        self.agent.d.click(206, 490)
        time.sleep(1.5)
        self.snap("step_04_video_selected")

        if self.is_stopped: return False

        # 7. KLIK TOMBOL ORANGE 'LANJUTKAN (1)' DI BAGIAN BAWAH GALERI
        self.emit("step", {"step": 6, "title": "Lanjutkan Galeri", "desc": "Klik Lanjutkan (1)..."})
        print("\n[LANGKAH 4] Mengklik tombol orange 'Lanjutkan (1)' di galeri (883, 2008)...")
        if self.agent.d(textContains="Lanjutkan").exists(timeout=1.5):
            self.agent.d(textContains="Lanjutkan").click()
        else:
            self.agent.d.click(883, 2008)
        time.sleep(3.0)
        self.snap("step_05_editor_preview")

        if self.is_stopped: return False

        # 8. LAYAR EDITOR (JIKA ADA) -> KLIK 'LANJUTKAN' (892, 2184)
        if not self.agent.d(textContains="Tambah Keterangan").exists(timeout=1.0):
            self.emit("step", {"step": 7, "title": "Editor Video", "desc": "Klik Lanjutkan di editor..."})
            print("\n[LANGKAH 5] Di layar Editor: Mengklik 'Lanjutkan' (892, 2184)...")
            self.agent.dismiss_popups()
            if self.agent.d(text="Lanjutkan").exists(timeout=1.5):
                self.agent.d(text="Lanjutkan").click()
            else:
                self.agent.d.click(892, 2184)
            time.sleep(3.0)

        self.snap("step_06_caption_screen")

        if self.is_stopped: return False

        # 9. LAYAR TAMBAH KETERANGAN -> ISI CAPTION & HASHTAG (<=150 CHARS)
        self.emit("step", {"step": 8, "title": "Isi Caption & Hashtags", "desc": f"Mengisi {len(final_caption)} karakter..."})
        print(f"\n[LANGKAH 6] Mengisi Caption & Hashtag ({len(final_caption)} karakter)...")
        # Pastikan berada di layar form caption [352,260][1080,529]
        if self.agent.d(textContains="Tambah keterangan").exists(timeout=1.5):
            self.agent.d(textContains="Tambah keterangan").click()
        elif self.agent.d(text="Tambah Keterangan").exists(timeout=1.5):
            self.agent.d.click(550, 200)
        else:
            self.agent.d.click(550, 200)
        time.sleep(1.0)
        self.agent.input_text(final_caption)
        time.sleep(1.0)

        # Tutup keyboard / klik OK
        if self.agent.d(text="OK").exists(timeout=1.5):
            self.agent.d(text="OK").click()
        else:
            self.agent.d.press("back")
        time.sleep(1.0)
        self.snap("step_07_caption_filled")

        if self.is_stopped: return False

        # 10. ATRIBUT PRODUK AFFILIATE (LINK IMPORT / KATA KUNCI)
        if product_keyword:
            if isinstance(product_keyword, list):
                clean_product = [p.strip() for p in product_keyword if isinstance(p, str) and p.strip()]
                is_link = any("http" in p for p in clean_product)
            else:
                clean_product = product_keyword.strip()
                is_link = clean_product.startswith("http") or ("shopee.co.id" in clean_product)

            self.emit("step", {"step": 8, "title": "Tambah Produk", "desc": "Membuka menu tambah produk..."})
            print("\n[LANGKAH 7] Menambahkan Produk Affiliate (Link Import)...")
            
            # Buka panel Tambah Produk
            if self.agent.d(textContains="tambah produk").exists(timeout=2.0):
                self.agent.d(textContains="tambah produk").click()
            elif self.agent.d(text="Tambah Produk").exists(timeout=1.0):
                self.agent.d(text="Tambah Produk").click()
            else:
                self.agent.d.click(782, 740)
            time.sleep(2.5)
            self.snap("step_08_product_menu_opened")

            if self.is_stopped: return False

            if is_link:
                # --- MODE 1: IMPORT BULK SEMUA 5 LINK SEKALIGUS (PASTE SEKALIGUS) ---
                candidate_links = [clean_product] if isinstance(clean_product, str) else list(clean_product)
                if isinstance(clean_product, str) and ("\n" in clean_product or "," in clean_product):
                    candidate_links = [l.strip() for l in clean_product.replace("\n", ",").split(",") if l.strip().startswith("http")]

                # Gabungkan seluruh link dengan spasi/enter agar ter-import sekaligus
                combined_links_text = " ".join(candidate_links)
                print(f"\n[*] Mengimpor BULK {len(candidate_links)} Link Shopee Sekaligus...")

                # 1. Klik icon link 🔗 di pojok kanan atas
                if self.agent.d(resourceIdMatches=r".*link.*").exists(timeout=1.5):
                    self.agent.d(resourceIdMatches=r".*link.*").click()
                else:
                    self.agent.d.click(998, 174)
                time.sleep(2.0)
                self.snap("step_09_link_import_opened")

                # 2. Masukkan gabungan 5 link sekaligus ke kolom input
                print(f"[*] Menempelkan (Paste) 5 Link Sekaligus ke Form Input...")
                if self.agent.d(className="android.widget.EditText").exists(timeout=2.0):
                    self.agent.d(className="android.widget.EditText").set_text(combined_links_text)
                else:
                    self.agent.d.click(540, 568)
                    time.sleep(0.5)
                    self.agent.input_text(combined_links_text, clear_first=True)
                time.sleep(1.5)

                # 3. Klik tombol 'Import'
                print("[*] Mengklik tombol 'Import'...")
                if self.agent.d(text="Import").exists(timeout=2.0):
                    self.agent.d(text="Import").click()
                else:
                    self.agent.d.click(570, 934)
                time.sleep(4.0)

                # 4. Centang Pilih Semua & Tambah Semua Produk
                if self.agent.d(text="Pilih Semua").exists(timeout=2.5) or self.agent.d(textMatches=r".*Komisi.*").exists(timeout=2.0) or self.agent.d(textContains="Tambah").exists(timeout=2.0):
                    print("[+] Berhasil import produk sekaligus! Menambahkan semua produk ke keranjang...")
                    if self.agent.d(text="Pilih Semua").exists(timeout=1.5):
                        self.agent.d(text="Pilih Semua").click()
                        time.sleep(1.0)
                    if self.agent.d(textMatches=r".*Tambah.*").exists(timeout=1.5):
                        self.agent.d(textMatches=r".*Tambah.*").click()
                    else:
                        self.agent.d.click(695, 2100)
                    time.sleep(2.5)
                    self.snap("step_10_product_added")
                else:
                    print("[!] Bulk import belum memunculkan produk. Mencoba centang / fallback tab Semua...")
                    if self.agent.d(textMatches=r".*Tambah.*").exists(timeout=1.0):
                        self.agent.d(textMatches=r".*Tambah.*").click()
                        time.sleep(1.5)
                    elif self.agent.d(text="Semua").exists(timeout=1.0):
                        self.agent.d(text="Semua").click()
                        time.sleep(1.5)
                        if self.agent.d(text="Tambah").exists(timeout=1.5):
                            self.agent.d(text="Tambah").click()
                            time.sleep(1.5)
                            if self.agent.d(text="Selesai").exists(timeout=1.5):
                                self.agent.d(text="Selesai").click()
                    else:
                        print("[*] Menggunakan AI Vision Grounding untuk menambahkan produk...")
                        ai_act = self.agent.vision.analyze_screen_ai(str(SCREENSHOTS_DIR / "step_09_link_import_opened.png"), "tambah produk affiliate")
                        if ai_act.get("target_coords"):
                            tx, ty = ai_act["target_coords"]
                            self.agent.d.click(tx, ty)
                            time.sleep(2.0)

                # 5. VALIDASI: Pastikan sudah kembali ke halaman Tambah Keterangan
                if not (self.agent.d(textContains="Tambah Keterangan").exists(timeout=2.0) or self.agent.d(text="Posting").exists(timeout=2.0)):
                    print("[*] Menutup dialog import untuk kembali ke form posting...")
                    self.agent.d.press("back")
                    time.sleep(1.5)
                    self.agent.dismiss_popups()

                self.snap("step_10_product_added")

            else:
                # --- MODE 2: CARI PRODUK DI TAB 'SEMUA' ---
                search_kw = clean_product
                # Pastikan Tab 'Semua' aktif
                if self.agent.d(text="Semua").exists(timeout=2.0):
                    self.agent.d(text="Semua").click()
                    time.sleep(1.0)

                # Jika keyword spesifik diberikan dan bukan default populer, cari di search box
                if search_kw.lower() not in ["bebas", "populer", "otomatis", ""]:
                    if self.agent.d(textContains="Cari Produk").exists(timeout=1.5):
                        self.agent.d(textContains="Cari Produk").click()
                        time.sleep(0.5)
                        self.agent.input_text(search_kw)
                        time.sleep(0.5)
                        self.agent.d.press("enter")
                        time.sleep(2.5)
                        self.snap("step_09_product_search_results")

                # Klik tombol 'Tambah' pada produk pertama (center 915, 964)
                print("[*] Mengklik tombol 'Tambah' pada produk...")
                if self.agent.d(text="Tambah").exists(timeout=2.5):
                    self.agent.d(text="Tambah").click()
                else:
                    self.agent.d.click(915, 964)
                time.sleep(1.8)

                # Klik tombol 'Selesai' pada modal konfirmasi produk
                print("[*] Mengonfirmasi pemilihan produk (tombol 'Selesai')...")
                if self.agent.d(text="Selesai").exists(timeout=2.0):
                    self.agent.d(text="Selesai").click()
                else:
                    self.agent.d.click(540, 1420)
                time.sleep(1.8)
                self.snap("step_10_product_added")

        if self.is_stopped: return False

        # 11. AKTIFKAN 'IZINKAN PENGGUNAAN ULANG KONTEN'
        self.emit("step", {"step": 10, "title": "Toggle Penggunaan Ulang", "desc": "Memeriksa toggle switch..."})
        print("\n[LANGKAH 8] Memeriksa & Mengaktifkan opsi 'Izinkan penggunaan ulang konten'...")
        try:
            if self.agent.d(textContains="Izinkan penggunaan ulang").exists(timeout=1.5):
                info = self.agent.d(textContains="Izinkan penggunaan ulang").info
                bounds = info.get("bounds", {})
                if bounds:
                    target_y = int((bounds.get("top", 500) + bounds.get("bottom", 600)) / 2)
                    self.agent.d.click(970, target_y)
            else:
                self.agent.d.click(970, 520)
        except Exception:
            self.agent.d.click(970, 520)
        time.sleep(1.0)
        self.snap("step_11_ready_to_post")

        if self.is_stopped: return False

        # 12. KLIK TOMBOL 'POSTING'
        self.emit("step", {"step": 11, "title": "Eksekusi Posting", "desc": "Mengunggah video ke Shopee..."})
        print("\n[LANGKAH 9] Mengeksekusi tombol oranye 'Posting'...")
        if self.agent.d(text="Posting").exists(timeout=2.0):
            self.agent.d(text="Posting").click()
        elif self.agent.d(resourceIdMatches=r".*publish.*").exists(timeout=1.5):
            self.agent.d(resourceIdMatches=r".*publish.*").click()
        else:
            self.agent.d.click(570, 915) # Center tombol posting oranye
        time.sleep(UI_TRANSITION_DELAY + 3.0)
        self.snap("step_12_posting_triggered")

        # 13. HANDLE POP-UP 'BAGIKAN KE WHATSAPP' -> PILIH 'KEMBALI'
        self.emit("step", {"step": 12, "title": "Tutup Popup WhatsApp & Cleanup", "desc": "Menyelesaikan proses upload..."})
        print("\n[LANGKAH 10] Menangani pop-up 'Bagikan ke WhatsApp'...")
        self.agent.handle_whatsapp_popup(timeout=6.0)
        time.sleep(UI_TRANSITION_DELAY)
        self.snap("step_13_whatsapp_dismissed")

        # 14. PEMBERSIHAN FILE VIDEO DARI STORAGE HP (AUTO CLEANUP)
        print("\n[LANGKAH 11] Membersihkan file video yang telah diunggah dari galeri HP...")
        self.adb.delete_remote_video(remote_video)

        # 15. SELESAI & SIAP MENUJU LOOP BERIKUTNYA
        self.snap("step_14_completed_and_ready")
        print("\n" + "=" * 65)
        print(f"   [+] SUKSES 100%! Video '{os.path.basename(video_path)}' berhasil di-posting!")
        print("   [+] File sementara di HP dibersihkan. Halaman siap untuk video berikutnya.")
        print("=" * 65)
        self.emit("log", {"level": "success", "message": f"Sukses posting video: {os.path.basename(video_path)}"})
        return True

    def upload_batch(self, video_items: List[dict], min_delay_sec: float = 180.0, max_delay_sec: float = 300.0) -> dict:
        """
        Uploads a batch of videos sequentially with auto-looping.
        In between uploads, runs a realistic human browsing simulation (random 3-5 minutes).
        """
        import random
        self.is_stopped = False
        total = len(video_items)
        success_count = 0
        failed_count = 0

        print("\n" + "#" * 65)
        print(f"   MEMULAI BATCH UPLOAD SHOPEE VIDEO ({total} TOTAL VIDEO)")
        print(f"   - Jeda Antar Video: Acak {int(min_delay_sec/60)} - {int(max_delay_sec/60)} Menit (Human Warming-Up)")
        print("#" * 65)
        self.emit("batch_start", {"total": total})

        for idx, item in enumerate(video_items):
            if self.is_stopped:
                print("[!] Batch dihentikan oleh pengguna.")
                self.emit("log", {"level": "warning", "message": "Batch dihentikan oleh pengguna."})
                break

            is_first = (idx == 0)
            v_path = item.get("video") or item.get("path")
            print(f"\n>>> [PROGRES BATCH: {idx + 1}/{total}] Memproses Video #{idx + 1} <<<")
            self.emit("video_start", {
                "index": idx,
                "total": total,
                "video": os.path.basename(v_path) if v_path else f"Video #{idx+1}",
                "caption": item.get("caption", ""),
                "product": item.get("product", "")
            })
            
            ok = self.upload_single_video(
                video_path=v_path,
                caption=item.get("caption", ""),
                hashtags=item.get("hashtags", ""),
                product_keyword=item.get("product"),
                is_first_video=is_first
            )

            if ok:
                success_count += 1
                self.emit("video_complete", {"index": idx, "status": "success"})
            else:
                failed_count += 1
                print(f"\n[!] Video #{idx + 1} ({os.path.basename(v_path)}) GAGAL / LINK BERMASALAH.")
                self.emit("video_complete", {"index": idx, "status": "failed"})
                print("[!] Menghentikan batch otomatis sesuai protokol fail-safe...")
                self.stop()
                break

            if idx < total - 1 and not self.is_stopped:
                # Random jeda 3 sampai 5 menit (180 - 300 detik)
                delay_between_videos = random.uniform(min_delay_sec, max_delay_sec)
                delay_min = delay_between_videos / 60.0
                print(f"\n[*] Menjalankan Human Browsing di Feed Shopee Live & Video selama {delay_min:.2f} menit ({int(delay_between_videos)} detik)...")
                self.emit("log", {"level": "info", "message": f"Human Warm-Up selama {delay_min:.2f} menit..."})
                
                # Simulasi nonton santai, scroll, tap love natural selama jeda
                self.agent.warm_up_live_feed(duration_seconds=delay_between_videos)

        print("\n" + "#" * 65)
        print("   RINGKASAN BATCH UPLOAD SHOPEE VIDEO:")
        print(f"   - Total Video   : {total}")
        print(f"   - Berhasil      : {success_count}")
        print(f"   - Gagal         : {failed_count}")
        print("#" * 65)
        self.emit("batch_complete", {
            "total": total,
            "success": success_count,
            "success_count": success_count,
            "failed": failed_count
        })
        return {"total": total, "success": success_count, "success_count": success_count, "failed": failed_count}

    def stop(self):
        """Flags the batch runner to stop immediately."""
        self.is_stopped = True
        print("[*] Sinyal STOP diterima.")

def main():
    parser = argparse.ArgumentParser(description="Shopee Video Mobile 100% Automated Uploader (HD & Tab Semua)")
    parser.add_argument("--json", "-j", type=str, default="vidio/tema01/data.json", help="Path ke data.json")
    parser.add_argument("--start", "-s", type=int, default=4, help="Nomor urut video untuk mulai (default: 4)")
    parser.add_argument("--count", "-n", type=int, default=87, help="Jumlah video yang ingin diunggah (default: 87)")
    parser.add_argument("--min-delay", type=float, default=180.0, help="Jeda minimum antar video dalam detik (default: 180 = 3 menit)")
    parser.add_argument("--max-delay", type=float, default=300.0, help="Jeda maksimum antar video dalam detik (default: 300 = 5 menit)")

    args = parser.parse_args()
    uploader = ShopeeUploader()

    import json
    if not os.path.exists(args.json):
        print(f"[!] File json tidak ditemukan: {args.json}")
        return

    with open(args.json, "r", encoding="utf-8") as f:
        all_data = json.load(f)

    # Filter dari start sampai count
    start_idx = max(0, args.start - 1)
    target_slice = all_data[start_idx : start_idx + args.count]

    batch_items = []
    base_dir = os.path.dirname(os.path.abspath(args.json))
    for item in target_slice:
        v_file = item.get("video_path")
        if not v_file or not os.path.exists(v_file):
            v_file = os.path.join(base_dir, item.get("fileName", f"{item.get('id', 1):03d}.mp4"))
        
        prod = item.get("shopee_links") or item.get("shopee_link") or item.get("product") or item.get("affiliate_url", "")
        batch_items.append({
            "video": v_file,
            "caption": item.get("short_caption") or item.get("caption", ""),
            "hashtags": item.get("hashtags", ""),
            "product": prod
        })

    print(f"[*] Menyiapkan batch upload dari Video #{args.start} sebanyak {len(batch_items)} video...")
    uploader.upload_batch(batch_items, min_delay_sec=args.min_delay, max_delay_sec=args.max_delay)

if __name__ == "__main__":
    main()
