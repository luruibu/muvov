@echo off
echo 🐧 MUVOV Linux 构建脚本
echo.

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

echo 📦 开始 Linux 构建...
echo.

REM 设置环境变量
set CSC_IDENTITY_AUTO_DISCOVERY=false

echo 🔧 构建目标:
echo    - AppImage (便携应用)
echo    - DEB (Debian/Ubuntu)
echo    - RPM (RedHat/CentOS)
echo.

REM 构建 Linux 版本
call npm run build:linux

if %errorlevel% equ 0 (
    echo.
    echo ✅ Linux 构建成功！
    echo 📁 构建文件: electron-dist\
) else (
    echo ❌ 构建失败
)

pause