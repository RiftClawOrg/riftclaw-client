@echo off
title RiftClaw Client Setup

echo.
echo ==========================================
echo    RiftWalker - Client Setup
echo ==========================================
echo.

REM Check if git is installed
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH.
    echo [INFO] Download Git from: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js/npm is not installed or not in PATH.
    echo [INFO] Download Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Git and Node.js found

REM Check if riftclaw-client folder exists
if exist "riftclaw-client" (
    echo.
    echo [INFO] Found existing 'riftclaw-client' folder
    echo [INFO] Deleting old installation...
    rmdir /s /q "riftclaw-client"
    if errorlevel 1 (
        echo [ERROR] Failed to delete folder. Try running as Administrator.
        echo.
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
    echo.
    echo [ERROR] Failed to clone repository.
    echo [INFO] Check your internet connection.
    echo.
    pause
    exit /b 1
)
echo [OK] Repository cloned successfully

echo.
echo [INFO] Entering project directory...
cd riftclaw-client
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to enter directory.
    echo.
    pause
    exit /b 1
)

echo.
echo [INFO] Installing dependencies...
echo [INFO] This may take a few minutes...
echo.
npm install
if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    echo [INFO] Check that Node.js is properly installed.
    echo.
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo ==========================================
echo    Setup Complete! Starting RiftWalker...
echo ==========================================
echo.
echo [INFO] Launching RiftWalker in new window...
echo [INFO] This window will stay open.
echo.

REM Spawn a new command prompt that runs npm run dev and stays open
start "RiftWalker Client" cmd /k "npm run dev"

echo [OK] RiftWalker launched in separate window
echo.
echo You can close this window now, or press any key to close it...
pause > nul
