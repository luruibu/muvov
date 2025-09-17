#!/bin/bash

# IPv6 支持检查脚本

echo "🔍 检查 IPv6 支持状态"
echo "====================="

# 检查系统 IPv6 支持
echo "1. 系统 IPv6 支持:"
if [ -f /proc/net/if_inet6 ]; then
    echo "   ✅ 系统支持 IPv6"
else
    echo "   ❌ 系统不支持 IPv6"
    exit 1
fi

# 检查 Docker IPv6 支持
echo "2. Docker IPv6 支持:"
if docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.IPv6}}" | grep -q "true"; then
    echo "   ✅ Docker 支持 IPv6"
else
    echo "   ⚠️  Docker IPv6 可能未启用"
    echo "   请在 /etc/docker/daemon.json 中添加:"
    echo '   {"ipv6": true, "fixed-cidr-v6": "2001:db8:1::/64"}'
fi

# 检查域名 AAAA 记录
if [ ! -z "$1" ]; then
    DOMAIN=$1
    echo "3. 域名 IPv6 解析 ($DOMAIN):"
    if nslookup -type=AAAA $DOMAIN >/dev/null 2>&1; then
        echo "   ✅ 域名有 AAAA 记录"
        nslookup -type=AAAA $DOMAIN | grep "AAAA"
    else
        echo "   ⚠️  域名没有 AAAA 记录"
        echo "   建议添加 IPv6 DNS 记录"
    fi
else
    echo "3. 域名 IPv6 解析: 跳过（未提供域名）"
fi

# 检查端口监听
echo "4. 服务端口监听:"
if netstat -tuln 2>/dev/null | grep -q "::"; then
    echo "   ✅ 发现 IPv6 监听端口"
    netstat -tuln 2>/dev/null | grep "::" | head -5
else
    echo "   ⚠️  未发现 IPv6 监听端口"
fi

# 检查防火墙
echo "5. 防火墙配置建议:"
echo "   确保以下 IPv6 端口已开放:"
echo "   - 80/tcp, 443/tcp (HTTP/HTTPS)"
echo "   - 3478/tcp, 3478/udp (STUN)"
echo "   - 5349/tcp, 5349/udp (TURNS)"
echo "   - 49152-65535/udp (TURN 中继)"

echo ""
echo "📋 IPv6 配置建议:"
echo "=================="
echo "1. 确保服务器有 IPv6 地址"
echo "2. 配置域名 AAAA 记录指向 IPv6 地址"
echo "3. 开放必要的 IPv6 防火墙端口"
echo "4. 测试 IPv6 连通性: ping6 google.com"
echo ""
echo "🔧 Docker IPv6 启用方法:"
echo "编辑 /etc/docker/daemon.json:"
echo '{'
echo '  "ipv6": true,'
echo '  "fixed-cidr-v6": "2001:db8:1::/64",'
echo '  "experimental": true,'
echo '  "ip6tables": true'
echo '}'
echo "然后重启 Docker: sudo systemctl restart docker"