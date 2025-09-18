#!/bin/bash

# MUVOV 清理脚本

echo "🗑️ MUVOV 清理脚本"
echo "=================="

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

echo "🛑 停止所有MUVOV服务..."
$DOCKER_COMPOSE_CMD -f docker-compose.yml down 2>/dev/null || true
docker rm -f muvov-peerjs muvov-caddy muvov-coturn 2>/dev/null || true

echo "🧹 清理临时文件..."
rm -f turnserver-*.conf coturn-*.pem .env 2>/dev/null || true

if [ "$1" = "--all" ]; then
    echo "🗑️ 清理所有数据包括证书..."
    docker volume rm docker_caddy_data docker_caddy_config 2>/dev/null || true
    docker network rm docker_muvov-network 2>/dev/null || true
    docker image rm muvov-builder 2>/dev/null || true
    echo "✅ 完全清理完成"
else
    echo "💡 保留证书数据，如需完全清理请使用: ./cleanup.sh --all"
    echo "✅ 基础清理完成"
fi