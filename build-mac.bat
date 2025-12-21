@echo off
echo 🍎 MUVOV macOS 构建脚本
echo.

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

echo 📦 开始 macOS 构建...
echo.

REM 设置环境变量
set CSC_IDENTITY_AUTO_DISCOVERY=false

echo 🔧 构建目标:
echo    - DMG (安装程序) - Intel + Apple Silicon
echo    - ZIP (压缩包) - Intel + Apple Silicon
echo.

REM 构建 macOS 版本
call npm run build:mac

if %errorlevel% equ 0 (
    echo.
    echo ✅ macOS 构建成功！
    echo 📁 构建文件: electron-dist\
) else (
    echo ❌ 构建失败
)

pause