#!/bin/bash

# MUVOV 一键部署脚本

set -e

echo "🚀 MUVOV 部署脚本"
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

# 运行前置条件检查
echo "🔍 运行前置条件检查..."
if [ -f ./check-prerequisites.sh ]; then
    chmod +x ./check-prerequisites.sh
    if ! ./check-prerequisites.sh; then
        echo "❌ 前置条件检查失败，请解决问题后重试"
        exit 1
    fi
else
    echo "⚠️  前置条件检查脚本未找到，继续部署..."
    
    # 基本检查
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if [ -z "$DOCKER_COMPOSE_CMD" ]; then
        echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    else
        echo "✅ 检测到 Docker Compose: $DOCKER_COMPOSE_CMD"
    fi
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

# IPv6 模式选择
echo "🌐 IPv6 配置选择..."
echo "请选择网络模式："
echo "1) IPv4 + IPv6 双栈 (推荐用于全球化部署)"
echo "2) 仅 IPv4 (推荐用于简单部署)"
echo "3) 让我分析需求"
echo ""
read -p "请选择 (1-3, 默认为2): " IPV6_CHOICE

case ${IPV6_CHOICE:-2} in
    1)
        COMPOSE_FILE="docker-compose.yml"
        echo "   ✅ 选择 IPv4 + IPv6 双栈模式"
        ;;
    2)
        COMPOSE_FILE="docker-compose-ipv4-only.yml"
        echo "   ✅ 选择仅 IPv4 模式"
        ;;
    3)
        echo "🔍 运行需求分析..."
        if [ -f ./analyze-ipv6-need.sh ]; then
            chmod +x ./analyze-ipv6-need.sh
            ./analyze-ipv6-need.sh
            echo ""
            read -p "分析完成，请选择模式 (1=双栈, 2=IPv4): " IPV6_CHOICE
            case ${IPV6_CHOICE:-2} in
                1)
                    COMPOSE_FILE="docker-compose.yml"
                    echo "   ✅ 选择 IPv4 + IPv6 双栈模式"
                    ;;
                *)
                    COMPOSE_FILE="docker-compose-ipv4-only.yml"
                    echo "   ✅ 选择仅 IPv4 模式"
                    ;;
            esac
        else
            echo "⚠️  分析脚本未找到，使用默认 IPv4 模式"
            COMPOSE_FILE="docker-compose-ipv4-only.yml"
        fi
        ;;
    *)
        COMPOSE_FILE="docker-compose-ipv4-only.yml"
        echo "   ✅ 使用默认仅 IPv4 模式"
        ;;
esac

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

# 方法1: 尝试本地构建
echo "   🏗️  尝试本地构建..."
cd ..

if command -v npm &> /dev/null && command -v node &> /dev/null; then
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
        echo "   ⚠️  本地构建失败，尝试 Docker 构建..."
        LOCAL_BUILD_SUCCESS=false
    else
        echo "   ✅ 本地构建成功"
        LOCAL_BUILD_SUCCESS=true
    fi
else
    echo "   ⚠️  Node.js/npm 不可用，使用 Docker 构建..."
    LOCAL_BUILD_SUCCESS=false
fi

# 方法2: 如果本地构建失败，使用 Docker 构建
if [ "$LOCAL_BUILD_SUCCESS" = false ]; then
    echo "   🐳 使用 Docker 构建..."
    cd docker
    
    # 使用专用的构建 Dockerfile
    docker build -f Dockerfile.build -t muvov-builder ..
    
    # 运行构建容器
    docker run --rm -v "$(pwd)/../dist:/app/dist" muvov-builder
    
    # 检查构建结果
    if [ ! -d "../dist" ]; then
        echo "   ❌ Docker 构建失败"
        exit 1
    else
        echo "   ✅ Docker 构建成功"
    fi
    cd ..
fi

cd docker

# 启动服务
echo "🚀 启动服务..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE ps

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
echo "  查看日志: $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE logs -f"
echo "  停止服务: $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE down"
echo "  重启服务: $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE restart"
echo "  切换模式: ./switch-ipv6-mode.sh"
echo ""
echo "⚠️  注意事项:"
echo "  1. 确保域名 DNS 已正确解析到此服务器"
echo "  2. 确保防火墙已开放端口 80, 443, 3478, 5349"
echo "  3. TURN 服务器端口范围 49152-65535 需要开放"
echo ""
echo "🎉 享受安全的 P2P 通信吧！"