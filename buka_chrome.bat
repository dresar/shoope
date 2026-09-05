@echo off
title Browser Chrome Scraper (Port 9222)
echo ========================================================
echo   MEMBUKA GOOGLE CHROME BIASA UNTUK SCRAPER (PORT 9222)
echo ========================================================
echo.
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Users\%USERNAME%\AppData\Local\Google\Chrome\Application\chrome.exe"

start "" %CHROME_PATH% --remote-debugging-port=9222 --user-data-dir="%~dp0chrome_session" --no-first-run --no-default-browser-check "https://shopee.co.id"

echo [OK] Google Chrome biasa telah terbuka di Port 9222!
echo Tidak perlu login Shopee jika hanya scraping pencarian.
ping 127.0.0.1 -n 3 >nul
