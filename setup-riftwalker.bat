@echo off
title RiftWalker Client

echo ==========================================
echo    RiftWalker - Client Setup
echo ==========================================
echo.

REM Check if git is installed
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git not found. Install from: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if riftclaw-client folder exists
if exist "riftclaw-client" (
    echo [INFO] Deleting old installation...
    rmdir /s /q "riftclaw-client"
)

echo [INFO] Downloading...
git clone https://github.com/RiftClawOrg/riftclaw-client.git

echo [INFO] Installing...
cd riftclaw-client
npm install

echo.
echo ==========================================
echo    Starting RiftWalker...
echo ==========================================
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

echo.
echo ==========================================
echo    RiftWalker stopped
echo ==========================================
echo.
pause
