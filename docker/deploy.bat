@echo off
REM MUVOV Windows 部署脚本

echo 🚀 MUVOV 部署脚本
echo ==================

REM 检查 Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未安装，请先安装 Docker Desktop
    pause
    exit /b 1
)

REM 检查 Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose 未安装，请先安装 Docker Compose
        pause
        exit /b 1
    )
)

REM 获取域名
if "%1"=="" (
    set /p DOMAIN="请输入您的域名: "
) else (
    set DOMAIN=%1
)

if "%DOMAIN%"=="" (
    echo ❌ 域名不能为空
    pause
    exit /b 1
)

echo 🌐 使用域名: %DOMAIN%

REM 创建 .env 文件
echo 📝 创建配置文件...
(
echo DOMAIN=%DOMAIN%
echo COTURN_SECRET=muvov-secret-key-%RANDOM%
echo PEERJS_KEY=muvov
echo PEERJS_PATH=/peerjs
echo TURN_MIN_PORT=49152
echo TURN_MAX_PORT=65535
) > .env

REM 构建 MUVOV 应用
echo 🔨 构建 MUVOV 应用...
cd ..
call npm run build
cd docker

REM 启动服务
echo 🚀 启动服务...
docker-compose up -d

REM 等待服务启动
echo ⏳ 等待服务启动...
timeout /t 10 /nobreak >nul

REM 检查服务状态
echo 📊 检查服务状态...
docker-compose ps

REM 显示访问信息
echo.
echo ✅ 部署完成！
echo ==================
echo 🌐 访问地址: https://%DOMAIN%
echo 🔧 PeerJS 服务: https://%DOMAIN%/peerjs
echo 🌍 STUN 服务器: stun:%DOMAIN%:3478
echo 🔒 TURN 服务器: turn:%DOMAIN%:3478
echo.
echo 📋 管理命令:
echo   查看日志: docker-compose logs -f
echo   停止服务: docker-compose down
echo   重启服务: docker-compose restart
echo.
echo ⚠️  注意事项:
echo   1. 确保域名 DNS 已正确解析到此服务器
echo   2. 确保防火墙已开放端口 80, 443, 3478, 5349
echo   3. TURN 服务器端口范围 49152-65535 需要开放
echo.
echo 🎉 享受安全的 P2P 通信吧！
pause