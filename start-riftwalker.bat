@echo off
title RiftWalker

if not exist "riftclaw-client" (
    echo [ERROR] RiftWalker not found. Run setup.bat first.
    pause
    exit /b 1
)

cd riftclaw-client

echo ==========================================
echo    Starting RiftWalker
echo ==========================================
echo.
echo Press Ctrl+C to stop
echo.

npm run dev

echo.
echo ==========================================
echo    RiftWalker stopped
echo ==========================================
pause
