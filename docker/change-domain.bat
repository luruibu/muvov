@echo off
REM MUVOV Windows 域名更改脚本

echo 🔄 MUVOV 域名更改工具
echo ====================

REM 获取当前域名
set CURRENT_DOMAIN=
if exist .env (
    for /f "tokens=2 delims==" %%a in ('findstr "^DOMAIN=" .env') do set CURRENT_DOMAIN=%%a
    echo 当前域名: %CURRENT_DOMAIN%
) else (
    echo ⚠️  未找到 .env 文件
)

REM 获取新域名
if "%1"=="" (
    set /p NEW_DOMAIN="请输入新域名: "
) else (
    set NEW_DOMAIN=%1
)

if "%NEW_DOMAIN%"=="" (
    echo ❌ 新域名不能为空
    pause
    exit /b 1
)

echo 🌐 新域名: %NEW_DOMAIN%

REM 确认操作
echo.
echo ⚠️  注意事项：
echo 1. 确保新域名 DNS 已解析到此服务器
echo 2. 更改域名会重新申请 SSL 证书
echo 3. 服务会短暂中断（约1-2分钟）
echo 4. 旧域名的证书将被保留但不再使用
echo.
set /p CONFIRM="确认更改域名？(y/N): "
if /i not "%CONFIRM%"=="y" (
    echo ❌ 操作已取消
    pause
    exit /b 1
)

echo.
echo 🔧 开始更改域名...

REM 1. 停止服务
echo 1. 停止当前服务...
docker-compose down

REM 2. 备份当前配置
echo 2. 备份当前配置...
set BACKUP_DIR=backup-%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
mkdir %BACKUP_DIR% 2>nul
copy .env %BACKUP_DIR%\ 2>nul || echo    .env 文件不存在，跳过备份
echo    配置已备份到: %BACKUP_DIR%\

REM 3. 更新 .env 文件
echo 3. 更新配置文件...
if exist .env (
    REM 创建临时文件更新域名
    (
        for /f "tokens=*" %%a in (.env) do (
            echo %%a | findstr /b "DOMAIN=" >nul
            if errorlevel 1 (
                echo %%a
            ) else (
                echo DOMAIN=%NEW_DOMAIN%
            )
        )
    ) > .env.tmp
    move .env.tmp .env
    echo    已更新 .env 文件
) else (
    REM 创建新的 .env 文件
    copy .env.example .env
    (
        for /f "tokens=*" %%a in (.env) do (
            echo %%a | findstr /b "DOMAIN=" >nul
            if errorlevel 1 (
                echo %%a
            ) else (
                echo DOMAIN=%NEW_DOMAIN%
            )
        )
    ) > .env.tmp
    move .env.tmp .env
    echo    已创建新的 .env 文件
)

REM 4. 清理旧证书缓存（可选）
echo 4. 清理证书缓存...
set /p CLEAR_CERTS="是否清理旧域名的证书缓存？这将强制重新申请证书 (y/N): "
if /i "%CLEAR_CERTS%"=="y" (
    docker volume rm docker_caddy_data 2>nul || echo    证书卷不存在或已清理
    echo    ✅ 证书缓存已清理
) else (
    echo    ⏭️  保留现有证书缓存
)

REM 5. 重新构建应用
echo 5. 重新构建应用...
cd ..

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo    📦 安装依赖...
    call npm install
) else (
    echo    ✅ 依赖已存在
)

REM 构建应用
echo    🏗️  构建应用...
call npm run build

REM 检查构建结果
if not exist "dist" (
    echo    ❌ 构建失败，未找到 dist 目录
    pause
    exit /b 1
) else (
    echo    ✅ 构建成功
)

cd docker

REM 6. 启动服务
echo 6. 启动服务...
docker-compose up -d

REM 7. 等待服务启动
echo 7. 等待服务启动和证书申请...
echo    这可能需要1-3分钟，请耐心等待...
timeout /t 30 /nobreak >nul

REM 8. 检查服务状态
echo 8. 检查服务状态...
docker-compose ps

REM 9. 显示结果
echo.
echo 🎉 域名更改完成！
echo ==================
echo 🌐 新访问地址: https://%NEW_DOMAIN%
echo 🔧 PeerJS 服务: https://%NEW_DOMAIN%/peerjs
echo 🌍 STUN 服务器: stun:%NEW_DOMAIN%:3478
echo 🔒 TURN 服务器: turn:%NEW_DOMAIN%:3478
echo.
echo 📋 后续操作：
echo 1. 测试应用功能是否正常
echo 2. 更新客户端配置中的服务器地址
echo 3. 如有问题，可使用备份恢复: %BACKUP_DIR%\
echo.
echo 🔧 故障排除：
echo - 查看日志: docker-compose logs -f
echo - 测试连接: test-connectivity.sh %NEW_DOMAIN%
echo - 检查 DNS: nslookup %NEW_DOMAIN%
echo.
echo ✨ 域名更改流程完成！
pause