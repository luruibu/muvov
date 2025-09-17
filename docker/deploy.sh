#!/bin/bash

# MUVOV 一键部署脚本

set -e

echo "🚀 MUVOV 部署脚本"
echo "=================="

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 获取域名
if [ -z "$1" ]; then
    echo "请输入您的域名："
    read -r DOMAIN
else
    DOMAIN=$1
fi

if [ -z "$DOMAIN" ]; then
    echo "❌ 域名不能为空"
    exit 1
fi

echo "🌐 使用域名: $DOMAIN"

# 创建 .env 文件
echo "📝 创建配置文件..."
cat > .env << EOF
DOMAIN=$DOMAIN
COTURN_SECRET=muvov-secret-key-$(date +%s)
PEERJS_KEY=muvov
PEERJS_PATH=/peerjs
TURN_MIN_PORT=49152
TURN_MAX_PORT=65535
EOF

# 检查 IPv6 支持
echo "🔍 检查 IPv6 支持..."
if [ -f ./check-ipv6.sh ]; then
    chmod +x ./check-ipv6.sh
    ./check-ipv6.sh $DOMAIN
else
    echo "⚠️  IPv6 检查脚本未找到"
fi

# 检查端口占用
echo "🔍 检查端口占用..."
PORTS=(80 443 3478 5349)
for port in "${PORTS[@]}"; do
    if netstat -tuln | grep -q ":$port "; then
        echo "⚠️  警告: 端口 $port 已被占用"
    fi
done

# 构建 MUVOV 应用
echo "🔨 构建 MUVOV 应用..."
cd ..
npm run build
cd docker

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

# 显示访问信息
echo ""
echo "✅ 部署完成！"
echo "=================="
echo "🌐 访问地址: https://$DOMAIN"
echo "🔧 PeerJS 服务: https://$DOMAIN/peerjs"
echo "🌍 STUN 服务器: stun:$DOMAIN:3478"
echo "🔒 TURN 服务器: turn:$DOMAIN:3478"
echo ""
echo "📋 管理命令:"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo ""
echo "⚠️  注意事项:"
echo "  1. 确保域名 DNS 已正确解析到此服务器"
echo "  2. 确保防火墙已开放端口 80, 443, 3478, 5349"
echo "  3. TURN 服务器端口范围 49152-65535 需要开放"
echo ""
echo "🎉 享受安全的 P2P 通信吧！"