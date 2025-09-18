#!/bin/bash

# PeerJS 服务器测试脚本

echo "🧪 测试 PeerJS 服务器配置"
echo "========================="

# 测试 PeerJS 安装和启动
echo "1. 测试 PeerJS 安装..."
docker run --rm node:18-alpine sh -c "npm install -g peerjs && peerjs --help" | head -10

echo ""
echo "2. 测试 PeerJS 服务器启动..."
echo "   启动测试服务器（5秒后自动停止）..."

# 启动测试容器
CONTAINER_ID=$(docker run -d -p 19000:9000 node:18-alpine sh -c "npm install -g peerjs && peerjs --port 9000 --key test --path /peerjs")

echo "   容器 ID: $CONTAINER_ID"

# 等待启动
sleep 5

# 测试连接
echo "3. 测试服务连接..."
if curl -s http://localhost:19000/peerjs | grep -q "PeerJS"; then
    echo "   ✅ PeerJS 服务器启动成功"
else
    echo "   ❌ PeerJS 服务器启动失败"
    echo "   查看容器日志:"
    docker logs $CONTAINER_ID
fi

# 清理
echo "4. 清理测试容器..."
docker stop $CONTAINER_ID >/dev/null 2>&1
docker rm $CONTAINER_ID >/dev/null 2>&1

echo ""
echo "✨ PeerJS 测试完成"