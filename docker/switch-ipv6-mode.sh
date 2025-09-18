#!/bin/bash

# IPv6 模式切换脚本

set -e

echo "🔄 IPv6 模式切换工具"
echo "==================="

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

# 检查当前模式
CURRENT_MODE="unknown"
if docker network inspect docker_muvov-network 2>/dev/null | grep -q '"EnableIPv6": true'; then
    CURRENT_MODE="ipv6"
elif docker network inspect docker_muvov-network 2>/dev/null | grep -q '"EnableIPv6": false'; then
    CURRENT_MODE="ipv4"
fi

echo "当前模式: $CURRENT_MODE"
echo ""

# 显示选项
echo "请选择目标模式："
echo "1) IPv4 + IPv6 双栈模式 (推荐用于全球化部署)"
echo "2) 仅 IPv4 模式 (推荐用于简单部署)"
echo "3) 分析我的需求 (运行需求分析)"
echo "4) 取消"

read -p "请输入选择 (1-4): " CHOICE

case $CHOICE in
    1)
        TARGET_MODE="ipv6"
        COMPOSE_FILE="docker-compose.yml"
        echo "🌐 切换到 IPv4 + IPv6 双栈模式"
        ;;
    2)
        TARGET_MODE="ipv4"
        COMPOSE_FILE="docker-compose-ipv4-only.yml"
        echo "🌍 切换到仅 IPv4 模式"
        ;;
    3)
        echo "🔍 运行需求分析..."
        if [ -f ./analyze-ipv6-need.sh ]; then
            chmod +x ./analyze-ipv6-need.sh
            ./analyze-ipv6-need.sh
        else
            echo "❌ 需求分析脚本未找到"
        fi
        exit 0
        ;;
    4)
        echo "❌ 操作已取消"
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

# 检查是否需要切换
if [ "$CURRENT_MODE" = "$TARGET_MODE" ]; then
    echo "✅ 当前已是目标模式，无需切换"
    exit 0
fi

echo ""
echo "⚠️  注意事项："
echo "1. 切换过程中服务会短暂中断"
echo "2. 网络配置会重新创建"
echo "3. 建议在维护窗口期间操作"
echo ""

read -p "确认切换？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

echo ""
echo "🔧 开始切换..."

# 1. 停止服务
echo "1. 停止当前服务..."
$DOCKER_COMPOSE_CMD down

# 2. 备份当前配置
echo "2. 备份网络配置..."
BACKUP_DIR="network-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
docker network ls > $BACKUP_DIR/networks-before.txt
echo "   网络配置已备份到: $BACKUP_DIR/"

# 3. 清理网络（如果存在）
echo "3. 清理现有网络..."
docker network rm docker_muvov-network 2>/dev/null || echo "   网络不存在或已清理"

# 4. 启动新配置
echo "4. 启动新配置..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up -d

# 5. 等待服务启动
echo "5. 等待服务启动..."
sleep 15

# 6. 验证网络配置
echo "6. 验证网络配置..."
if [ "$TARGET_MODE" = "ipv6" ]; then
    if docker network inspect docker_muvov-network | grep -q '"EnableIPv6": true'; then
        echo "   ✅ IPv6 已启用"
    else
        echo "   ❌ IPv6 启用失败"
    fi
else
    if docker network inspect docker_muvov-network | grep -q '"EnableIPv6": false'; then
        echo "   ✅ 仅 IPv4 模式已启用"
    else
        echo "   ❌ IPv4 模式配置失败"
    fi
fi

# 7. 检查服务状态
echo "7. 检查服务状态..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE ps

# 8. 网络测试
echo "8. 网络连通性测试..."
if [ ! -z "$DOMAIN" ] || [ -f .env ]; then
    DOMAIN=${DOMAIN:-$(grep "^DOMAIN=" .env 2>/dev/null | cut -d'=' -f2)}
    if [ ! -z "$DOMAIN" ]; then
        echo "   测试域名: $DOMAIN"
        
        # HTTP 测试
        if curl -s -I http://$DOMAIN | grep -q "301\|302"; then
            echo "   ✅ HTTP 重定向正常"
        else
            echo "   ⚠️  HTTP 访问异常"
        fi
        
        # HTTPS 测试
        sleep 5
        if curl -s -k -I https://$DOMAIN | grep -q "200"; then
            echo "   ✅ HTTPS 访问正常"
        else
            echo "   ⚠️  HTTPS 可能还在启动中"
        fi
    fi
fi

# 9. 显示结果
echo ""
echo "🎉 模式切换完成！"
echo "=================="
echo "新模式: $TARGET_MODE"
echo "配置文件: $COMPOSE_FILE"
echo ""

if [ "$TARGET_MODE" = "ipv6" ]; then
    echo "📋 IPv6 双栈模式特点："
    echo "   ✅ 支持 IPv4 和 IPv6 客户端"
    echo "   ✅ 更好的 WebRTC P2P 性能"
    echo "   ✅ 未来网络兼容性"
    echo "   ⚠️  配置相对复杂"
else
    echo "📋 IPv4 模式特点："
    echo "   ✅ 配置简单可靠"
    echo "   ✅ 兼容性好"
    echo "   ✅ 故障排除容易"
    echo "   ⚠️  IPv6 客户端通过主机转发"
fi

echo ""
echo "🔧 管理命令："
echo "   查看日志: $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE logs -f"
echo "   重启服务: $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE restart"
echo "   停止服务: $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE down"
echo ""
echo "✨ 切换完成！"