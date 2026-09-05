@echo off
title Incogniton Anti-Detect Browser (Shopee Scraper Live)
echo ===================================================================
echo   MEMBUKA INCOGNITON ANTI-DETECT BROWSER (PORT 9222)
echo   Engine: Incogniton Custom Chromium (Stealth & Anti-Bot Bypass)
echo   Folder Sesi: incogniton_session
echo ===================================================================

:: Buat folder sesi jika belum ada
if not exist "%~dp0incogniton_session" mkdir "%~dp0incogniton_session"

:: Tutup proses Chrome sebelumnya agar port 9222 bersih
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Jalankan Incogniton Custom Chromium dengan remote port 9222
start "" "C:\Users\NCN0C\AppData\Roaming\Incogniton\Incogniton\browser\149\win\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%~dp0incogniton_session" --no-first-run --no-default-browser-check "https://shopee.co.id"

echo.
echo [BERHASIL] Incogniton Anti-Detect Browser telah terbuka di layar Anda!
echo Sesi login di browser ini 100% kebal blokir rate limit / bot detection.
echo ===================================================================
pause
