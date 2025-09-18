#!/bin/bash

# MUVOV 一键部署脚本

set -e

echo "🚀 MUVOV 部署脚本"
echo "=================="
echo "📝 用法: ./deploy.sh <domain> [--clean]"
echo "   --clean: 清理所有数据包括证书"
echo ""

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

# 前置条件检查
echo "🔍 检查前置条件..."
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
PEERJS_PATH=/
TURN_MIN_PORT=49152
TURN_MAX_PORT=65535
EOF

# 使用 IPv4 模式部署
echo "🌐 使用 IPv4 网络模式部署..."
COMPOSE_FILE="docker-compose.yml"
echo "   ✅ 配置为 IPv4 模式（适用于大多数部署场景）"

# 检查端口占用
echo "🔍 检查端口占用..."
PORTS=(80 443 3478 5349)
for port in "${PORTS[@]}"; do
    if ss -tuln | grep -q ":$port "; then
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
    DOMAIN="$DOMAIN" npm run build
    
    # 构建完成后配置服务器
    echo "   🔧 配置服务器地址到应用..."
    if [ -f "docker/inject-server-config.sh" ]; then
        chmod +x docker/inject-server-config.sh
        cd docker
        ./inject-server-config.sh "$DOMAIN"
        cd ..
        echo "   ✅ 服务器地址已配置到应用中"
    elif [ -f "docker/configure-servers.cjs" ]; then
        node docker/configure-servers.cjs "$DOMAIN"
        echo "   ✅ 服务器地址已配置到应用中"
    else
        echo "   ⚠️  配置脚本未找到，跳过配置"
    fi

    # 检查构建结果
    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
        echo "   ⚠️  本地构建失败，尝试 Docker 构建..."
        LOCAL_BUILD_SUCCESS=false
    else
        echo "   ✅ 本地构建成功"
        # 检查关键文件
        CSS_COUNT=$(find dist -name "*.css" | wc -l)
        JS_COUNT=$(find dist -name "*.js" | wc -l)
        echo "   📊 构建产物: CSS文件 $CSS_COUNT 个, JS文件 $JS_COUNT 个"
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
    docker build -f Dockerfile.build --build-arg DOMAIN="$DOMAIN" -t muvov-builder ..
    
    # 运行构建容器
    docker run --rm -v "$(pwd)/../dist:/app/dist" -e DOMAIN="$DOMAIN" muvov-builder
    
    # Docker构建完成后配置服务器
    echo "   🔧 配置服务器地址到应用..."
    if [ -f "inject-server-config.sh" ]; then
        chmod +x inject-server-config.sh
        ./inject-server-config.sh "$DOMAIN"
        echo "   ✅ 服务器地址已配置到应用中"
    elif [ -f "configure-servers.cjs" ]; then
        node configure-servers.cjs "$DOMAIN"
        echo "   ✅ 服务器地址已配置到应用中"
    else
        echo "   ⚠️  配置脚本未找到，跳过配置"
    fi
    
    # 检查构建结果
    if [ ! -d "../dist" ] || [ ! -f "../dist/index.html" ]; then
        echo "   ❌ Docker 构建失败"
        exit 1
    else
        echo "   ✅ Docker 构建成功"
        # 检查关键文件
        CSS_COUNT=$(find ../dist -name "*.css" | wc -l)
        JS_COUNT=$(find ../dist -name "*.js" | wc -l)
        echo "   📊 构建产物: CSS文件 $CSS_COUNT 个, JS文件 $JS_COUNT 个"
    fi
    cd ..
fi

cd docker

# 清理旧数据
echo "🧹 清理旧数据..."

# 停止并删除容器
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE down 2>/dev/null || true
docker rm -f muvov-peerjs muvov-caddy muvov-coturn 2>/dev/null || true

# 清理临时文件
rm -f turnserver-*.conf coturn-*.pem 2>/dev/null || true

# 询问是否清理持久数据
if [ "$2" = "--clean" ]; then
    echo "🗑️ 清理持久数据..."
    docker volume rm docker_caddy_data docker_caddy_config 2>/dev/null || true
    echo "✅ 持久数据已清理"
else
    echo "💡 保留Caddy证书数据，如需完全清理请使用: ./deploy.sh domain --clean"
fi

# 重新创建.env文件（确保在清理后）
echo "📝 重新创建配置文件..."
cat > .env << EOF
DOMAIN=$DOMAIN
COTURN_SECRET=muvov-secret-key-$(date +%s)
PEERJS_KEY=muvov
PEERJS_PATH=/
TURN_MIN_PORT=49152
TURN_MAX_PORT=65535
EOF

# 验证配置文件
echo "🔍 验证配置文件..."
if ! $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE config >/dev/null 2>&1; then
    echo "❌ Docker Compose 配置文件有错误:"
    $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE config
    exit 1
fi

# 分步启动服务（避免同时启动导致的问题）
echo "🚀 启动服务..."

# 1. 先启动 PeerJS（最简单）
echo "   1️⃣ 启动 PeerJS 服务器..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up -d peerjs-server
sleep 3

# 2. 启动 Caddy（需要时间申请证书）
echo "   2️⃣ 启动 Caddy 代理..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up -d caddy
sleep 5

# 2.1 验证 Caddy 启动状态
echo "   🔍 验证 Caddy 启动状态..."
for i in {1..6}; do
    if docker ps --filter name=muvov-caddy --filter status=running | grep -q muvov-caddy; then
        echo "      ✅ Caddy 启动成功"
        break
    elif [ $i -eq 6 ]; then
        echo "      ❌ Caddy 启动失败，查看日志..."
        docker logs muvov-caddy --tail=10
        echo "      🔧 尝试重启 Caddy..."
        docker restart muvov-caddy
        sleep 3
    else
        echo "      ⏳ 等待 Caddy 启动... ($i/6)"
        sleep 2
    fi
done

# 3. 启动 CoTURN 服务器（使用简化配置确保成功启动）
echo "   3️⃣ 启动 CoTURN 服务器..."

# 生成简化的 CoTURN 配置（确保启动成功）
cat > turnserver-deploy.conf << EOF
# CoTURN 部署配置 - 简化启动
listening-port=3478
listening-ip=0.0.0.0

realm=${DOMAIN}
server-name=${DOMAIN}

user=muvov:muvov123
user=guest:guest123

fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=muvov-secret-key

min-port=49152
max-port=49300
verbose
# 修复日志权限问题 - 使用 /tmp 目录
log-file=/tmp/turnserver.log
syslog

no-multicast-peers
no-cli
no-tls
no-dtls

allowed-peer-ip=10.0.0.0-10.255.255.255
allowed-peer-ip=192.168.0.0-192.168.255.255
allowed-peer-ip=172.16.0.0-172.31.255.255

denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=224.0.0.0-255.255.255.255
EOF

# 启动 CoTURN 容器
echo "      启动 CoTURN 容器..."
docker run -d \
    --name muvov-coturn \
    --network docker_muvov-network \
    -p 3478:3478 \
    -p 3478:3478/udp \
    -p 49152-49300:49152-49300/udp \
    -v "$(pwd)/turnserver-deploy.conf:/etc/coturn/turnserver.conf" \
    -e DOMAIN=${DOMAIN} \
    --restart unless-stopped \
    --entrypoint="" \
    coturn/coturn:latest \
    turnserver -c /etc/coturn/turnserver.conf

# 等待 CoTURN 启动
echo "      等待 CoTURN 启动..."
for i in {1..8}; do
    if docker ps --filter name=muvov-coturn --filter status=running | grep -q muvov-coturn; then
        echo "      ✅ CoTURN 启动成功"
        break
    elif [ $i -eq 8 ]; then
        echo "      ❌ CoTURN 启动失败，查看日志..."
        docker logs muvov-coturn --tail=10
        exit 1
    else
        echo "      ⏳ 等待 CoTURN 启动... ($i/8)"
        sleep 2
    fi
done

# 4. 自动升级 CoTURN 到 TLS（如果证书可用）
echo "   4️⃣ 检查并自动启用 TLS..."
sleep 5  # 给 Caddy 一些时间生成证书

if docker exec muvov-caddy find /data/caddy/certificates -name "*${DOMAIN}*.crt" 2>/dev/null | grep -q "$DOMAIN"; then
    echo "      ✅ 发现域名证书，自动升级到 TLS..."
    
    # 获取证书路径
    CERT_PATH=$(docker exec muvov-caddy find /data/caddy/certificates -name "*${DOMAIN}*.crt" 2>/dev/null | head -1)
    KEY_PATH="${CERT_PATH%.crt}.key"
    
    echo "      📋 证书路径: $CERT_PATH"
    
    # 复制证书到本地目录
    echo "      📋 复制证书文件..."
    docker exec muvov-caddy cat "$CERT_PATH" > ./coturn-cert.pem 2>/dev/null
    docker exec muvov-caddy cat "$KEY_PATH" > ./coturn-key.pem 2>/dev/null
    
    if [ -s ./coturn-cert.pem ] && [ -s ./coturn-key.pem ]; then
        echo "      ✅ 证书文件复制成功"
        
        # 生成 TLS 配置
        cat > turnserver-tls-auto.conf << EOF
# CoTURN TLS 配置 - 自动生成
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0

realm=${DOMAIN}
server-name=${DOMAIN}

user=muvov:muvov123
user=guest:guest123

# TLS 证书
cert=/etc/coturn/cert.pem
pkey=/etc/coturn/key.pem

fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=muvov-secret-key

min-port=49152
max-port=49300
verbose
# 修复日志权限问题 - 使用 /tmp 目录
log-file=/tmp/turnserver.log
syslog

no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1

allowed-peer-ip=10.0.0.0-10.255.255.255
allowed-peer-ip=192.168.0.0-192.168.255.255
allowed-peer-ip=172.16.0.0-172.31.255.255

denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=224.0.0.0-255.255.255.255
EOF
        
        # 停止当前 CoTURN 容器
        echo "      🛑 停止当前 CoTURN 容器..."
        docker rm -f muvov-coturn 2>/dev/null || true
        
        # 启动带 TLS 的 CoTURN
        echo "      🚀 启动带 TLS 的 CoTURN..."
        docker run -d \
            --name muvov-coturn \
            --network docker_muvov-network \
            -p 3478:3478 \
            -p 3478:3478/udp \
            -p 5349:5349 \
            -p 5349:5349/udp \
            -p 49152-49300:49152-49300/udp \
            -v "$(pwd)/turnserver-tls-auto.conf:/etc/coturn/turnserver.conf" \
            -v "$(pwd)/coturn-cert.pem:/etc/coturn/cert.pem:ro" \
            -v "$(pwd)/coturn-key.pem:/etc/coturn/key.pem:ro" \
            -e DOMAIN=${DOMAIN} \
            --restart unless-stopped \
            --entrypoint="" \
            coturn/coturn:latest \
            turnserver -c /etc/coturn/turnserver.conf
        
        # 等待启动并验证
        echo "      ⏳ 等待 TLS CoTURN 启动..."
        sleep 5
        
        if docker ps --filter name=muvov-coturn --filter status=running | grep -q muvov-coturn; then
            echo "      ✅ TLS CoTURN 启动成功！"
            COTURN_CONFIG="TLS-ENABLED"
        else
            echo "      ❌ TLS CoTURN 启动失败，回退到无 TLS 配置"
            docker logs muvov-coturn --tail=5 2>/dev/null
            
            # 回退到无 TLS 配置
            docker rm -f muvov-coturn 2>/dev/null || true
            docker run -d \
                --name muvov-coturn \
                --network docker_muvov-network \
                -p 3478:3478 \
                -p 3478:3478/udp \
                -p 49152-49300:49152-49300/udp \
                -v "$(pwd)/turnserver-deploy.conf:/etc/coturn/turnserver.conf" \
                -e DOMAIN=${DOMAIN} \
                --restart unless-stopped \
                --entrypoint="" \
                coturn/coturn:latest \
                turnserver -c /etc/coturn/turnserver.conf
            
            COTURN_CONFIG="TLS-FAILED"
        fi
    else
        echo "      ❌ 证书文件复制失败"
        COTURN_CONFIG="CERT-COPY-FAILED"
    fi
else
    echo "      ⏳ 证书还在生成中，当前使用 STUN/TURN (无 TLS)"
    COTURN_CONFIG="NO-TLS"
fi

# 等待服务启动
echo "⏳ 等待所有服务启动完成..."
sleep 5

# 检查服务状态
echo "📊 检查服务状态..."
CONTAINERS=("muvov-caddy" "muvov-peerjs" "muvov-coturn")
ALL_RUNNING=true

for container in "${CONTAINERS[@]}"; do
    if docker ps --filter name=$container --filter status=running | grep -q $container; then
        echo "   ✅ $container 运行正常"
    else
        echo "   ❌ $container 未运行"
        ALL_RUNNING=false
    fi
done

if [ "$ALL_RUNNING" = false ]; then
    echo ""
    echo "⚠️  部分服务未正常启动，查看日志："
    for container in "${CONTAINERS[@]}"; do
        if ! docker ps --filter name=$container --filter status=running | grep -q $container; then
            echo "   📋 $container 日志："
            docker logs $container --tail=5 2>/dev/null || echo "      容器不存在或无日志"
        fi
    done
    echo ""
    echo "🔧 可以尝试重新运行部署脚本修复问题"
fi


# 简单的连接测试
echo ""
echo "🔍 快速连接测试..."

# 检查 PeerJS 容器内部服务
if docker exec muvov-peerjs wget -qO- http://localhost:9000/peerjs 2>/dev/null | grep -q "name"; then
    echo "   ✅ PeerJS 内部服务正常"
else
    echo "   ⚠️  PeerJS 内部服务可能还在启动中"
fi

# 检查 Caddy 到 PeerJS 的连接
if docker exec muvov-caddy wget -qO- http://peerjs-server:9000/peerjs 2>/dev/null | grep -q "name"; then
    echo "   ✅ Caddy 到 PeerJS 连接正常"
else
    echo "   ⚠️  Caddy 到 PeerJS 连接可能还在建立中"
fi

# 检查 MIME 类型配置
echo "   🔍 检查 MIME 类型配置..."
if docker exec muvov-caddy wget -qS --spider http://localhost/ 2>&1 | grep -i "content-type" | grep -q "text/html"; then
    echo "   ✅ HTML MIME 类型正常"
else
    echo "   ⚠️  HTML MIME 类型可能有问题"
fi

# 检查静态资源 MIME 类型（如果存在）
if docker exec muvov-caddy find /srv/muvov -name "*.css" -o -name "*.js" | head -1 | grep -q .; then
    echo "   🔍 检查静态资源 MIME 类型..."
    # 这里只是提醒，实际的 MIME 类型会在浏览器访问时验证
    echo "   💡 静态资源 MIME 类型将在浏览器访问时验证"
else
    echo "   ⚠️  未找到静态资源文件，请确保应用已正确构建"
fi

# 显示访问信息
echo ""
if [ "$ALL_RUNNING" = true ]; then
    echo "✅ 部署成功！"
    echo "=================="
    echo "🌐 访问地址: https://$DOMAIN"
    echo "🔧 PeerJS 服务: https://$DOMAIN/peerjs"
    echo ""
    echo "📡 WebRTC 服务器:"
    echo "   🌍 STUN: stun:$DOMAIN:3478"
    echo "   🔒 TURN: turn:$DOMAIN:3478"
    
    # 显示 TURNS 状态
    case "$COTURN_CONFIG" in
        "TLS-ENABLED")
            echo "   🔐 TURNS: turns:$DOMAIN:5349 (TLS 已启用)"
            ;;
        "TLS-FAILED")
            echo "   ⚠️  TURNS: TLS 启动失败，使用无 TLS 模式"
            echo "   💡 手动启用: ./start-coturn-with-tls.sh $DOMAIN"
            ;;
        "CERT-COPY-FAILED")
            echo "   ⚠️  TURNS: 证书复制失败，使用无 TLS 模式"
            ;;
        "NO-TLS")
            echo "   ⏳ TURNS: 证书生成后将自动启用"
            ;;
        *)
            echo "   🔒 TURN: turn:$DOMAIN:3478 (无 TLS)"
            ;;
    esac
else
    echo "⚠️  部署完成但部分服务有问题"
    echo "=================="
    echo "🌐 访问地址: https://$DOMAIN (可能无法正常访问)"
    echo ""
    echo "🔧 请检查服务状态并重新部署"
fi
echo ""
echo "📋 常用命令:"
echo "   查看日志: docker logs muvov-caddy"
echo "   重新部署: ./deploy.sh $DOMAIN"
echo "   清理数据: ./cleanup.sh"
echo ""
echo "⚠️  重要提醒:"
echo "   1. 确保域名 DNS 解析正确"
echo "   2. 开放端口: 80, 443, 3478, 49152-49300"
echo "   3. 应用已自动配置使用部署的服务器"
echo ""
echo "🎉 MUVOV 部署完成！"