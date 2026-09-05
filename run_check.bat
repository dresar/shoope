@echo off
chcp 65001 > nul
echo ===================================================
echo    MEMERIKSA KONEKSI HP & KESIAPAN SHOPEE VIDEO
echo ===================================================
.venv\Scripts\python.exe check_device.py
pause
