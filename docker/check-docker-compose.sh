#!/bin/bash

# Docker Compose 兼容性检查脚本

echo "🐳 Docker Compose 兼容性检查"
echo "============================"

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
    echo ""
    echo "🔧 解决方案："
    echo ""
    echo "方案1: 安装独立的 docker-compose"
    echo "  Ubuntu/Debian: sudo apt-get install docker-compose"
    echo "  CentOS/RHEL:   sudo yum install docker-compose"
    echo "  macOS:         brew install docker-compose"
    echo "  Windows:       通过 Docker Desktop 安装"
    echo ""
    echo "方案2: 使用新版 Docker (推荐)"
    echo "  新版 Docker 内置了 'docker compose' 命令"
    echo "  更新到 Docker 20.10+ 版本"
    echo ""
    echo "方案3: 手动安装 docker-compose"
    echo "  curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "  chmod +x /usr/local/bin/docker-compose"
    exit 1
else
    echo "✅ Docker Compose 可用: $DOCKER_COMPOSE_CMD"
    
    # 获取版本信息
    if [ "$DOCKER_COMPOSE_CMD" = "docker-compose" ]; then
        VERSION=$(docker-compose --version)
        echo "📋 版本信息: $VERSION"
    else
        VERSION=$(docker compose version)
        echo "📋 版本信息: $VERSION"
    fi
    
    # 测试基本功能
    echo ""
    echo "🧪 测试基本功能..."
    
    # 创建临时测试文件
    cat > test-compose.yml << 'EOF'
version: '3.8'
services:
  test:
    image: alpine:latest
    command: echo "Docker Compose test successful"
EOF
    
    # 测试配置验证
    if $DOCKER_COMPOSE_CMD -f test-compose.yml config >/dev/null 2>&1; then
        echo "   ✅ 配置文件解析正常"
    else
        echo "   ❌ 配置文件解析失败"
    fi
    
    # 清理测试文件
    rm -f test-compose.yml
    
    echo ""
    echo "🎉 Docker Compose 检查完成！"
    echo "可以正常使用 MUVOV 部署脚本"
fi