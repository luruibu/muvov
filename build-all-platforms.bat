@echo off
echo 🌍 MUVOV 跨平台构建脚本
echo.

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    echo 📥 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 🚀 开始跨平台构建...
echo.

REM 清理之前的构建
if exist "electron-dist" (
    echo 🧹 清理之前的构建文件...
    rmdir /s /q "electron-dist"
)

REM 设置环境变量
set CSC_IDENTITY_AUTO_DISCOVERY=false
set DEBUG=electron-builder

echo 🔧 构建配置:
echo    - 禁用代码签名: %CSC_IDENTITY_AUTO_DISCOVERY%
echo    - 调试模式: %DEBUG%
echo.

echo 📦 构建目标平台:
echo    - Windows (x64): NSIS 安装程序 + 便携版 ✅
echo    - macOS (x64 + ARM64): DMG 安装程序 + ZIP 压缩包 ⚠️
echo    - Linux (x64): AppImage + DEB + RPM ⚠️
echo.
echo ⚠️  注意: 在 Windows 上构建 Linux/macOS 可能需要特殊配置
echo 💡 建议: 使用 GitHub Actions 进行跨平台构建
echo.

REM 开始构建
echo 🏗️ 开始构建所有平台...
call npm run build:all

if %errorlevel% equ 0 (
    echo.
    echo ✅ 跨平台构建成功！
    echo 📁 构建文件位置: electron-dist\
    echo.
    echo 🎯 构建产物:
    echo.
    echo 🪟 Windows:
    if exist "electron-dist\MUVOV Chat Setup *.exe" (
        echo    - MUVOV Chat Setup *.exe (安装程序)
    )
    if exist "electron-dist\win-unpacked\" (
        echo    - win-unpacked\ (便携版)
    )
    echo.
    echo 🍎 macOS:
    if exist "electron-dist\MUVOV Chat-*.dmg" (
        echo    - MUVOV Chat-*.dmg (安装程序)
    )
    if exist "electron-dist\MUVOV Chat-*-mac.zip" (
        echo    - MUVOV Chat-*-mac.zip (压缩包)
    )
    echo.
    echo 🐧 Linux:
    if exist "electron-dist\MUVOV Chat-*.AppImage" (
        echo    - MUVOV Chat-*.AppImage (便携应用)
    )
    if exist "electron-dist\muvov_*_amd64.deb" (
        echo    - muvov_*_amd64.deb (Debian/Ubuntu)
    )
    if exist "electron-dist\muvov-*.x86_64.rpm" (
        echo    - muvov-*.x86_64.rpm (RedHat/CentOS)
    )
    echo.
    echo 🚀 所有平台的应用都已构建完成！
    echo 📋 你现在可以分发这些文件给不同平台的用户了
) else (
    echo.
    echo ❌ 构建失败，请检查错误信息
)

echo.
pause