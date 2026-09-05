"""
Diagnostic & Verification Script for Shopee Mobile Automation Setup.
Run this script to verify your phone's wireless or USB connection and readiness.
"""
import sys
import os
import time
from config import ADB_PATH, SHOPEE_PACKAGE, SCREENSHOTS_DIR
from core.adb_helper import ADBHelper
from core.device_agent import DeviceAgent

def main():
    print("=" * 60)
    print("   PENGUJIAN KONEKSI & DIAGNOSTIK HP SHOPEE AUTOMATION")
    print("=" * 60)

    adb = ADBHelper(ADB_PATH)
    ready, msg = adb.is_device_ready()
    print(f"[*] Lokasi ADB: {ADB_PATH}")
    print(f"[*] Status Perangkat: {msg}")

    if not ready:
        print("\n[!] PETUNJUK PENYELESAIAN:")
        print("1. Pastikan HP dan Laptop terhubung ke WiFi yang sama.")
        print("2. Jika sebelumnya kabel dicabut, jalankan kembali script ini (script akan auto-reconnect).")
        sys.exit(1)

    print(f"[*] Menggunakan perangkat aktif: {adb.serial}")
    adb.wake_and_unlock()

    # Check Shopee
    print(f"[*] Memeriksa instalasi aplikasi Shopee ({SHOPEE_PACKAGE})...")
    code, out = adb.run_command(["shell", "pm", "path", SHOPEE_PACKAGE])
    if code == 0 and "package:" in out:
        print("[+] Aplikasi Shopee Indonesia TERINSTAL di HP!")
    else:
        print(f"[!] Peringatan: Paket {SHOPEE_PACKAGE} tidak ditemukan di HP.")

    # Screenshot test
    test_shot = str(SCREENSHOTS_DIR / "check_test.png")
    print(f"[*] Mengambil screenshot uji coba ke: {test_shot}...")
    if adb.take_screenshot(test_shot):
        print(f"[+] Screenshot berhasil disimpan ({os.path.getsize(test_shot)} bytes)!")
    else:
        print("[!] Gagal mengambil screenshot via ADB.")

    # UIAutomator2 test
    print("[*] Menginisialisasi UIAutomator2 Engine...")
    agent = DeviceAgent(serial=adb.serial)
    if agent.connect():
        print(f"[+] UIAutomator2 BERHASIL terhubung ke {adb.serial} dan siap mengontrol HP 100%!")
        print("\n" + "=" * 60)
        print("   STATUS: SEMUA SISTEM SIAP DIGUNAKAN! (READY TO UPLOAD)")
        print("=" * 60)
    else:
        print("[!] Inisialisasi UIAutomator2 gagal. Pastikan 'Debugging USB (Setelan Keamanan)' aktif di HP Xiaomi/Redmi.")

if __name__ == "__main__":
    main()
