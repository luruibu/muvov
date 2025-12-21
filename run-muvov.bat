@echo off
echo 🚀 Starting MUVOV P2P Chat...
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
    echo ❌ dist directory not found. Please run 'npm run build' first.
    pause
    exit /b 1
)

REM 启动服务器
echo 🌐 Starting local server...
echo 📱 Browser will open automatically...
echo.
echo ⚠️  Press Ctrl+C to stop the server
echo.

npx serve dist -p 3000 -s

pause