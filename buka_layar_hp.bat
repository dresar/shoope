@echo off
chcp 65001 > nul
title Buka Layar HP Shopee

echo ===================================================
echo    MEMBUKA TAMPILAN LAYAR HP SHOPEE (SCRCPY)
echo ===================================================

set "ADB_PATH=C:\Users\NCN0C\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "SCRCPY_PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\scrcpy-win64-v4.1\scrcpy.exe"

if not exist "%SCRCPY_PATH%" (
    for /d %%d in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\Genymobile.scrcpy*") do (
        for /d %%s in ("%%d\scrcpy*") do (
            if exist "%%s\scrcpy.exe" set "SCRCPY_PATH=%%s\scrcpy.exe"
        )
    )
)

echo [*] Memeriksa koneksi perangkat...
"%ADB_PATH%" connect 192.168.18.101:5555 > nul 2>&1

:: Cek apakah tersambung via WiFi
for /f "tokens=1" %%i in ('"%ADB_PATH%" devices ^| findstr "192.168.18.101:5555"') do (
    set "TARGET_DEV=192.168.18.101:5555"
)

:: Jika tidak ada WiFi, pakai perangkat USB
if not defined TARGET_DEV (
    for /f "skip=1 tokens=1" %%i in ('"%ADB_PATH%" devices ^| findstr "device$"') do (
        set "TARGET_DEV=%%i"
    )
)

if defined TARGET_DEV (
    echo [+] Menghubungkan ke perangkat: %TARGET_DEV%
    start "" "%SCRCPY_PATH%" -s %TARGET_DEV% --window-title "Layar HP Shopee" --always-on-top --max-size 1400
    echo [+] Jendela Layar HP Shopee berhasil dibuka!
) else (
    echo [!] Tidak ada HP yang terdeteksi. Pastikan HP terhubung ke WiFi atau USB.
    pause
)
