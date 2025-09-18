#!/bin/bash

# 测试构建配置脚本

DOMAIN=${1:-"test.example.com"}

echo "🧪 测试构建配置..."
echo "域名: $DOMAIN"

# 清理旧构建
rm -rf dist

# 测试构建
echo "📦 开始构建..."
DOMAIN="$DOMAIN" npm run build

if [ -f "dist/index.html" ]; then
    echo "✅ 构建成功"
    
    # 检查构建的JS文件中是否包含域名
    JS_FILE=$(find dist -name "*.js" | head -1)
    if [ -f "$JS_FILE" ]; then
        if grep -q "$DOMAIN" "$JS_FILE"; then
            echo "✅ 域名已注入到JS文件中"
        else
            echo "❌ 域名未找到在JS文件中"
            echo "🔍 搜索相关配置..."
            grep -n "DEPLOY_DOMAIN\|stun.*cloudflare\|0\.peerjs\.com" "$JS_FILE" || echo "未找到相关配置"
        fi
    fi
else
    echo "❌ 构建失败"
fi