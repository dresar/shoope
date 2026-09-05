@echo off
title Shopee Video Automation Dashboard
cd /d "%~dp0"
echo =======================================================
echo    SHOPEE VIDEO MOBILE AUTOMATION WEB DASHBOARD
echo    Buka di browser: http://localhost:8000
echo =======================================================
echo.
.venv\Scripts\python.exe server.py
pause
