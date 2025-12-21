@echo off
echo 🚀 MUVOV Electron 无签名构建
echo.

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    echo 📥 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 📦 开始无签名构建...
echo.

REM 清理之前的构建
if exist "electron-dist" (
    echo 🧹 清理之前的构建文件...
    rmdir /s /q "electron-dist"
)

REM 设置环境变量禁用代码签名
set CSC_IDENTITY_AUTO_DISCOVERY=false
set DEBUG=electron-builder

echo 🔧 构建配置:
echo    - 禁用代码签名: %CSC_IDENTITY_AUTO_DISCOVERY%
echo    - 调试模式: %DEBUG%
echo.

REM 构建应用
call npm run build:electron-unsigned

if %errorlevel% equ 0 (
    echo.
    echo ✅ 无签名构建成功！
    echo 📁 构建文件位置: electron-dist\
    echo.
    echo 🎯 可执行文件:
    if exist "electron-dist\win-unpacked\MUVOV Chat.exe" (
        echo    - electron-dist\win-unpacked\MUVOV Chat.exe (便携版)
    )
    if exist "electron-dist\MUVOV Chat Setup *.exe" (
        echo    - electron-dist\MUVOV Chat Setup *.exe (安装程序)
    )
    echo.
    echo ⚠️  注意: 未签名的应用可能会触发 Windows 安全警告
    echo 🚀 你现在可以运行应用或分发给用户了！
    echo.
    echo 📋 测试应用:
    if exist "electron-dist\win-unpacked\MUVOV Chat.exe" (
        echo    双击: electron-dist\win-unpacked\MUVOV Chat.exe
    )
) else (
    echo.
    echo ❌ 构建失败，请检查错误信息
)

echo.
pause