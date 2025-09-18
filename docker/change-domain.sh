#!/bin/bash

# MUVOV 域名更改脚本

set -e

echo "🔄 MUVOV 域名更改工具"
echo "===================="

# 检测 Docker Compose 命令
detect_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null 2>&1; then
        echo "docker compose"
    else
        echo ""
    fi
}

DOCKER_COMPOSE_CMD=$(detect_docker_compose)

if [ -z "$DOCKER_COMPOSE_CMD" ]; then
    echo "❌ Docker Compose 未找到"
    exit 1
fi

# 获取当前域名
CURRENT_DOMAIN=""
if [ -f .env ]; then
    CURRENT_DOMAIN=$(grep "^DOMAIN=" .env | cut -d'=' -f2)
    echo "当前域名: $CURRENT_DOMAIN"
else
    echo "⚠️  未找到 .env 文件"
fi

# 获取新域名
if [ -z "$1" ]; then
    echo "请输入新域名："
    read -r NEW_DOMAIN
else
    NEW_DOMAIN=$1
fi

if [ -z "$NEW_DOMAIN" ]; then
    echo "❌ 新域名不能为空"
    exit 1
fi

echo "🌐 新域名: $NEW_DOMAIN"

# 确认操作
echo ""
echo "⚠️  注意事项："
echo "1. 确保新域名 DNS 已解析到此服务器"
echo "2. 更改域名会重新申请 SSL 证书"
echo "3. 服务会短暂中断（约1-2分钟）"
echo "4. 旧域名的证书将被保留但不再使用"
echo ""
read -p "确认更改域名？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

echo ""
echo "🔧 开始更改域名..."

# 1. 停止服务
echo "1. 停止当前服务..."
$DOCKER_COMPOSE_CMD down

# 2. 备份当前配置
echo "2. 备份当前配置..."
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
cp .env $BACKUP_DIR/ 2>/dev/null || echo "   .env 文件不存在，跳过备份"
echo "   配置已备份到: $BACKUP_DIR/"

# 3. 更新 .env 文件
echo "3. 更新配置文件..."
if [ -f .env ]; then
    # 更新现有 .env 文件
    sed -i.bak "s/^DOMAIN=.*/DOMAIN=$NEW_DOMAIN/" .env
    echo "   已更新 .env 文件"
else
    # 创建新的 .env 文件
    cp .env.example .env
    sed -i "s/^DOMAIN=.*/DOMAIN=$NEW_DOMAIN/" .env
    echo "   已创建新的 .env 文件"
fi

# 4. 清理旧证书缓存（可选）
echo "4. 清理证书缓存..."
read -p "是否清理旧域名的证书缓存？这将强制重新申请证书 (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker volume rm docker_caddy_data 2>/dev/null || echo "   证书卷不存在或已清理"
    echo "   ✅ 证书缓存已清理"
else
    echo "   ⏭️  保留现有证书缓存"
fi

# 5. 重新构建应用（如果需要）
echo "5. 重新构建应用..."
cd ..

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "   📦 安装依赖..."
    npm install
else
    echo "   ✅ 依赖已存在"
fi

# 构建应用
echo "   🏗️  构建应用..."
npm run build

# 检查构建结果
if [ ! -d "dist" ]; then
    echo "   ❌ 构建失败，未找到 dist 目录"
    exit 1
else
    echo "   ✅ 构建成功"
fi

cd docker

# 6. 启动服务
echo "6. 启动服务..."
$DOCKER_COMPOSE_CMD up -d

# 7. 等待服务启动
echo "7. 等待服务启动和证书申请..."
echo "   这可能需要1-3分钟，请耐心等待..."

# 监控证书申请进度
for i in {1..60}; do
    if $DOCKER_COMPOSE_CMD logs caddy 2>/dev/null | grep -q "certificate obtained successfully" || \
       $DOCKER_COMPOSE_CMD logs caddy 2>/dev/null | grep -q "serving initial HTTP challenge"; then
        echo "   ✅ 证书申请进行中..."
        break
    fi
    sleep 5
    echo -n "."
done
echo ""

# 8. 检查服务状态
echo "8. 检查服务状态..."
sleep 10
$DOCKER_COMPOSE_CMD ps

# 9. 测试新域名
echo "9. 测试新域名连接..."
echo "   正在测试 HTTPS 连接..."

# 等待 HTTPS 可用
for i in {1..30}; do
    if curl -s -k -I https://$NEW_DOMAIN | grep -q "200 OK"; then
        echo "   ✅ HTTPS 连接成功"
        break
    fi
    sleep 10
    echo "   ⏳ 等待 HTTPS 可用... ($i/30)"
done

# 测试 PeerJS
if curl -s -k https://$NEW_DOMAIN/peerjs | grep -q "PeerJS" 2>/dev/null; then
    echo "   ✅ PeerJS 服务正常"
else
    echo "   ⚠️  PeerJS 服务可能还在启动中"
fi

# 10. 显示结果
echo ""
echo "🎉 域名更改完成！"
echo "=================="
echo "🌐 新访问地址: https://$NEW_DOMAIN"
echo "🔧 PeerJS 服务: https://$NEW_DOMAIN/peerjs"
echo "🌍 STUN 服务器: stun:$NEW_DOMAIN:3478"
echo "🔒 TURN 服务器: turn:$NEW_DOMAIN:3478"
echo ""
echo "📋 后续操作："
echo "1. 测试应用功能是否正常"
echo "2. 更新客户端配置中的服务器地址"
echo "3. 如有问题，可使用备份恢复: $BACKUP_DIR/"
echo ""
echo "🔧 故障排除："
echo "- 查看日志: $DOCKER_COMPOSE_CMD logs -f"
echo "- 测试连接: ./test-connectivity.sh $NEW_DOMAIN"
echo "- 检查 DNS: nslookup $NEW_DOMAIN"
echo ""

# 11. 运行连接测试（如果脚本存在）
if [ -f ./test-connectivity.sh ]; then
    echo "🧪 运行连接测试..."
    chmod +x ./test-connectivity.sh
    ./test-connectivity.sh $NEW_DOMAIN
fi

echo "✨ 域名更改流程完成！"