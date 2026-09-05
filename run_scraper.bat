@echo off
title Master Shopee Product Scraper & AI Ranker (Incogniton Edition)
cls
echo ================================================================================
echo           SHOPEE PRODUCT SCRAPER & CLAUDE AI RANKER (INCOGNITON)
echo ================================================================================
echo.
echo Pilihan Eksekusi:
echo [1] Buka Incogniton Anti-Detect Browser (Port 9222)
echo [2] Jalankan Batch Scraper Semua Folder Lanjutan (Folder 6 s/d 10)
echo [3] Jalankan Scraping Folder Tertentu Saja (Misal: Folder 6)
echo.

set /p pilihan="Pilih nomor (1/2/3): "

if "%pilihan%"=="1" (
    call "%~dp0buka_incogniton.bat"
    exit /b
)

if "%pilihan%"=="2" (
    echo.
    echo Menjalankan batch scraping untuk semua folder lanjutan via Incogniton...
    node "%~dp0product_finder\collector_batch.js"
    goto finish
)

if "%pilihan%"=="3" (
    echo.
    set /p fnum="Masukkan nomor folder (contoh: 6): "
    echo.
    echo Menjalankan scraping khusus Folder %fnum%...
    node -e "const { processSingleFolder, CDPClient } = require('./product_finder/collector_batch.js'); (async()=>{ const c=new CDPClient(); await c.ensureConnected(); await processSingleFolder(c, '%fnum%'); c.close(); })()"
    goto finish
)

:finish
echo.
echo ================================================================================
echo Proses selesai! Tekan sembarang tombol untuk keluar.
echo ================================================================================
pause
