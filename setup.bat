@echo off
title RiftWalker Setup

echo ==========================================
echo    RiftWalker Setup
echo ==========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git not found. Install from: https://git-scm.com/download/win
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from: https://nodejs.org/
    pause
    exit /b 1
)

if exist "riftclaw-client" (
    echo [INFO] Updating existing installation...
    cd riftclaw-client
    git pull
    npm install
) else (
    echo [INFO] Downloading RiftWalker...
    git clone https://github.com/RiftClawOrg/riftclaw-client.git
    cd riftclaw-client
    npm install
)

echo.
echo ==========================================
echo    Setup Complete!
echo ==========================================
echo.
echo To start RiftWalker, run: start-riftwalker.bat
echo.
pause
