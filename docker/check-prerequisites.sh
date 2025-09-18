#!/bin/bash

# 部署前置条件检查脚本

echo "🔍 MUVOV 部署前置条件检查"
echo "========================="

ERRORS=0

# 检查 Node.js
echo "1. 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js 已安装: $NODE_VERSION"
    
    # 检查版本是否满足要求
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 16 ]; then
        echo "   ✅ Node.js 版本满足要求 (>= 16)"
    else
        echo "   ❌ Node.js 版本过低，需要 >= 16.x"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ❌ Node.js 未安装"
    echo "   请访问 https://nodejs.org 安装 Node.js"
    ERRORS=$((ERRORS + 1))
fi

# 检查 npm
echo ""
echo "2. 检查 npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "   ✅ npm 已安装: $NPM_VERSION"
else
    echo "   ❌ npm 未安装"
    ERRORS=$((ERRORS + 1))
fi

# 检查 Docker
echo ""
echo "3. 检查 Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "   ✅ Docker 已安装: $DOCKER_VERSION"
    
    # 检查 Docker 是否运行
    if docker info &> /dev/null; then
        echo "   ✅ Docker 服务正在运行"
    else
        echo "   ❌ Docker 服务未运行"
        echo "   请启动 Docker 服务"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ❌ Docker 未安装"
    echo "   请访问 https://docker.com 安装 Docker"
    ERRORS=$((ERRORS + 1))
fi

# 检查 Docker Compose
echo ""
echo "4. 检查 Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo "   ✅ Docker Compose 已安装: $COMPOSE_VERSION"
elif docker compose version &> /dev/null 2>&1; then
    COMPOSE_VERSION=$(docker compose version)
    echo "   ✅ Docker Compose (内置) 已安装: $COMPOSE_VERSION"
else
    echo "   ❌ Docker Compose 未安装"
    echo "   请安装 Docker Compose 或使用较新版本的 Docker"
    echo "   新版 Docker 内置了 'docker compose' 命令"
    ERRORS=$((ERRORS + 1))
fi

# 检查项目文件
echo ""
echo "5. 检查项目文件..."
cd ..

if [ -f "package.json" ]; then
    echo "   ✅ package.json 存在"
else
    echo "   ❌ package.json 不存在"
    echo "   请确保在正确的项目目录中运行"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "src" ]; then
    echo "   ✅ src 目录存在"
else
    echo "   ⚠️  src 目录不存在，请检查项目结构"
fi

# 检查依赖安装
echo ""
echo "6. 检查项目依赖..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules 存在"
    
    # 检查关键依赖
    if [ -d "node_modules/vite" ]; then
        echo "   ✅ Vite 已安装"
    else
        echo "   ❌ Vite 未安装"
        echo "   请运行: npm install"
        ERRORS=$((ERRORS + 1))
    fi
    
    if [ -d "node_modules/react" ]; then
        echo "   ✅ React 已安装"
    else
        echo "   ❌ React 未安装"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ⚠️  node_modules 不存在"
    echo "   将在部署时自动安装依赖"
fi

# 检查网络工具
echo ""
echo "7. 检查网络工具..."
if command -v curl &> /dev/null; then
    echo "   ✅ curl 已安装"
else
    echo "   ⚠️  curl 未安装，建议安装用于测试"
fi

if command -v netstat &> /dev/null; then
    echo "   ✅ netstat 已安装"
else
    echo "   ⚠️  netstat 未安装，建议安装用于端口检查"
fi

# 基础网络连通性测试
echo ""
echo "8. 基础网络连通性测试..."
if command -v ping &> /dev/null; then
    if ping -c 1 -W 3 bing.com >/dev/null 2>&1; then
        echo "   ✅ 网络连通正常"
    else
        echo "   ❌ 网络连通异常，请检查网络配置"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ⚠️  ping 命令不可用，跳过网络测试"
fi

# 检查权限
echo ""
echo "9. 检查权限..."
if [ -w "." ]; then
    echo "   ✅ 当前目录可写"
else
    echo "   ❌ 当前目录不可写"
    ERRORS=$((ERRORS + 1))
fi

# 检查磁盘空间
echo ""
echo "10. 检查磁盘空间..."
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -gt 1048576 ]; then  # 1GB in KB
    echo "   ✅ 磁盘空间充足 ($(($AVAILABLE_SPACE / 1024 / 1024))GB 可用)"
else
    echo "   ⚠️  磁盘空间不足，建议至少有 1GB 可用空间"
fi

cd docker

# 总结
echo ""
echo "📊 检查结果总结"
echo "================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ 所有前置条件检查通过！"
    echo "🚀 可以开始部署 MUVOV"
    echo ""
    echo "下一步："
    echo "  ./deploy.sh your-domain.com"
else
    echo "❌ 发现 $ERRORS 个问题需要解决"
    echo "🔧 请解决上述问题后再次运行检查"
    echo ""
    echo "常见解决方案："
    echo "  安装 Node.js: https://nodejs.org"
    echo "  安装 Docker: https://docker.com"
    echo "  安装依赖: npm install"
    exit 1
fi