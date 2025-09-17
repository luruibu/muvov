#!/bin/bash

# MUVOV 连接性测试脚本

if [ -z "$1" ]; then
    echo "用法: $0 <domain>"
    exit 1
fi

DOMAIN=$1

echo "🧪 MUVOV 连接性测试"
echo "==================="
echo "测试域名: $DOMAIN"
echo ""

# 测试 HTTPS 连接
echo "1. 🔒 HTTPS 连接测试:"
if curl -s -I https://$DOMAIN | grep -q "200 OK"; then
    echo "   ✅ HTTPS 连接正常"
    # 检查 SSL 证书
    echo "   📜 SSL 证书信息:"
    echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "   ⚠️  无法获取证书信息"
else
    echo "   ❌ HTTPS 连接失败"
fi

# 测试 PeerJS SSL
echo ""
echo "2. 🔗 PeerJS SSL 测试:"
if curl -s https://$DOMAIN/peerjs | grep -q "PeerJS"; then
    echo "   ✅ PeerJS SSL 连接正常"
else
    echo "   ❌ PeerJS SSL 连接失败"
fi

# 测试 STUN 服务器
echo ""
echo "3. 🌐 STUN 服务器测试:"
if nc -u -z -w3 $DOMAIN 3478 2>/dev/null; then
    echo "   ✅ STUN 服务器可达"
else
    echo "   ❌ STUN 服务器不可达"
fi

# 测试 TURNS 服务器
echo ""
echo "4. 🔐 TURNS 服务器测试:"
if nc -z -w3 $DOMAIN 5349 2>/dev/null; then
    echo "   ✅ TURNS 服务器可达"
else
    echo "   ❌ TURNS 服务器不可达"
fi

# IPv4 连接测试
echo ""
echo "5. 🌍 IPv4 连接测试:"
IPV4=$(dig +short A $DOMAIN | head -1)
if [ ! -z "$IPV4" ]; then
    echo "   IPv4 地址: $IPV4"
    if ping -c 1 -W 3 $IPV4 >/dev/null 2>&1; then
        echo "   ✅ IPv4 连接正常"
    else
        echo "   ❌ IPv4 连接失败"
    fi
else
    echo "   ⚠️  未找到 IPv4 地址"
fi

# IPv6 连接测试
echo ""
echo "6. 🌐 IPv6 连接测试:"
IPV6=$(dig +short AAAA $DOMAIN | head -1)
if [ ! -z "$IPV6" ]; then
    echo "   IPv6 地址: $IPV6"
    if ping6 -c 1 -W 3 $IPV6 >/dev/null 2>&1; then
        echo "   ✅ IPv6 连接正常"
    else
        echo "   ❌ IPv6 连接失败"
    fi
else
    echo "   ⚠️  未找到 IPv6 地址（建议添加 AAAA 记录）"
fi

# WebRTC 连接测试
echo ""
echo "7. 📡 WebRTC 连接测试:"
echo "   STUN URL: stun:$DOMAIN:3478"
echo "   TURN URL: turn:$DOMAIN:3478"
echo "   TURNS URL: turns:$DOMAIN:5349"

# 生成测试报告
echo ""
echo "📊 测试总结:"
echo "============"
echo "✅ = 正常, ❌ = 失败, ⚠️ = 警告"
echo ""
echo "建议检查项目:"
echo "1. 确保域名 DNS 解析正确"
echo "2. 确保防火墙端口已开放"
echo "3. 确保 SSL 证书有效"
echo "4. 考虑添加 IPv6 支持"
echo ""
echo "🔧 故障排除:"
echo "- 查看服务日志: docker-compose logs -f"
echo "- 检查服务状态: docker-compose ps"
echo "- 重启服务: docker-compose restart"