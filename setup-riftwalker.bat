@echo off
chcp 65001 >nul
title RiftClaw Client Setup

REM Keep window open on error
goto :start

:error
@echo.
@echo [ERROR] An error occurred during setup.
@echo.
@echo Press any key to exit...
pause > nul
exit /b 1

:start
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║     RiftWalker - Client Setup                                ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Check if git is installed
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH.
    echo [INFO] Download Git from: https://git-scm.com/download/win
    pause
    goto :error
)

REM Check if npm is installed
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js/npm is not installed or not in PATH.
    echo [INFO] Download Node.js from: https://nodejs.org/
    pause
    goto :error
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
        pause
        goto :error
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
    pause
    goto :error
)
echo [OK] Repository cloned successfully

echo.
echo [INFO] Entering project directory...
cd riftclaw-client
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to enter directory.
    pause
    goto :error
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
    pause
    goto :error
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
echo ==========================================
echo.

npm run dev

@echo.
@echo ==========================================
@echo.
if errorlevel 1 (
    echo [WARNING] RiftWalker exited with an error.
) else (
    echo [INFO] RiftWalker has closed.
)
@echo.
@echo Press any key to close this window...
pause > nul
