@echo off
chcp 65001 >nul
title RiftClaw Client Setup
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║     RiftWalker - Client Setup                                ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Check if riftclaw-client folder exists
if exist "riftclaw-client" (
    echo [INFO] Found existing 'riftclaw-client' folder
    echo [INFO] Deleting old installation...
    rmdir /s /q "riftclaw-client"
    if errorlevel 1 (
        echo [ERROR] Failed to delete folder. Try running as Administrator.
        pause
        exit /b 1
    )
    echo [OK] Old installation deleted
) else (
    echo [INFO] No existing installation found
)

echo.
echo [INFO] Cloning RiftClaw Client from GitHub...
git clone https://github.com/RiftClawOrg/riftclaw-client.git
if errorlevel 1 (
    echo [ERROR] Failed to clone repository. Check your internet connection.
    pause
    exit /b 1
)
echo [OK] Repository cloned successfully

echo.
echo [INFO] Entering project directory...
cd riftclaw-client
if errorlevel 1 (
    echo [ERROR] Failed to enter directory.
    pause
    exit /b 1
)

echo.
echo [INFO] Installing dependencies (this may take a few minutes)...
npm install
if errorlevel 1 (
    echo [ERROR] npm install failed. Check that Node.js is installed.
    echo [INFO] Download Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║     Setup Complete! Starting RiftWalker...                   ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [INFO] Launching RiftWalker Client...
echo.

npm run dev

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start application.
    echo.
    pause
    exit /b 1
)

echo.
echo [INFO] RiftWalker has closed.
echo.
echo Press any key to close this window...
pause > nul
