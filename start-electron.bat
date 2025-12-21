@echo off
echo 🚀 Starting MUVOV Electron App...
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo 📥 Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查 dist 目录是否存在
if not exist "dist" (
    echo 📦 Building application...
    call npm run build
    if %errorlevel% neq 0 (
        echo ❌ Build failed
        pause
        exit /b 1
    )
)

REM 启动 Electron 应用
echo 🖥️ Starting Electron desktop app...
echo.
echo ⚠️  Close the app window to stop
echo.

npx electron electron-main.js

echo.
echo ✅ App closed
pause