@echo off
echo 🪟 MUVOV Windows 专用构建脚本
echo.

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    echo 📥 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 🚀 开始 Windows 构建...
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
echo    - 平台: Windows x64
echo    - 禁用代码签名: %CSC_IDENTITY_AUTO_DISCOVERY%
echo    - 调试模式: %DEBUG%
echo.

echo 📦 构建目标:
echo    - NSIS 安装程序 (.exe)
echo    - 便携版 (win-unpacked/)
echo.

REM 构建 Windows 版本
echo 🏗️ 开始构建 Windows 版本...
call npm run build:win

if %errorlevel% equ 0 (
    echo.
    echo ✅ Windows 构建成功！
    echo 📁 构建文件位置: electron-dist\
    echo.
    echo 🎯 构建产物:
    if exist "electron-dist\MUVOV Chat Setup *.exe" (
        echo    ✅ MUVOV Chat Setup *.exe (安装程序)
    )
    if exist "electron-dist\win-unpacked\" (
        echo    ✅ win-unpacked\ (便携版)
        echo       └── MUVOV Chat.exe
    )
    echo.
    echo 🚀 Windows 版本构建完成！
    echo.
    echo 📋 测试应用:
    if exist "electron-dist\win-unpacked\MUVOV Chat.exe" (
        echo    双击运行: electron-dist\win-unpacked\MUVOV Chat.exe
    )
    echo.
    echo 💡 其他平台构建:
    echo    - 使用 GitHub Actions 自动构建 Linux/macOS 版本
    echo    - 查看 CROSS-PLATFORM-SOLUTIONS.md 了解详情
) else (
    echo.
    echo ❌ 构建失败，请检查错误信息
    echo.
    echo 🔧 常见问题:
    echo    - 确保所有依赖已安装: npm install
    echo    - 检查磁盘空间是否充足
    echo    - 关闭杀毒软件的实时保护
)

echo.
pause