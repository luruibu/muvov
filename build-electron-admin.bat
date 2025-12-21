@echo off
echo 🔧 MUVOV Electron 构建脚本 (需要管理员权限)
echo.

REM 检查是否以管理员身份运行
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 此脚本需要管理员权限才能运行
    echo 📋 请右键点击此文件，选择"以管理员身份运行"
    echo.
    pause
    exit /b 1
)

echo ✅ 检测到管理员权限
echo.

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    echo 📥 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 📦 开始构建 MUVOV Electron 应用...
echo.

REM 清理之前的构建
if exist "electron-dist" (
    echo 🧹 清理之前的构建文件...
    rmdir /s /q "electron-dist"
)

REM 清理 electron-builder 缓存 (需要管理员权限)
echo 🧹 清理 electron-builder 缓存...
if exist "%APPDATA%\Local\electron-builder\Cache" (
    rmdir /s /q "%APPDATA%\Local\electron-builder\Cache"
)

REM 设置环境变量禁用代码签名
set CSC_IDENTITY_AUTO_DISCOVERY=false
set DEBUG=electron-builder

echo 🚀 开始构建...
echo.

REM 构建应用
call npm run build:electron

if %errorlevel% equ 0 (
    echo.
    echo ✅ 构建成功！
    echo 📁 构建文件位置: electron-dist\
    echo.
    echo 🎯 可执行文件:
    if exist "electron-dist\win-unpacked\MUVOV Chat.exe" (
        echo    - electron-dist\win-unpacked\MUVOV Chat.exe
    )
    if exist "electron-dist\MUVOV Chat Setup *.exe" (
        echo    - electron-dist\MUVOV Chat Setup *.exe (安装程序)
    )
    echo.
    echo 🚀 你现在可以运行应用或分发安装程序了！
) else (
    echo.
    echo ❌ 构建失败，请检查错误信息
)

echo.
pause