#!/bin/bash

# IPv6 需求分析脚本

echo "🔍 IPv6 需求分析"
echo "================"

# 检查主机 IPv6 状态
echo "1. 主机 IPv6 状态:"
if [ -f /proc/net/if_inet6 ]; then
    echo "   ✅ 主机支持 IPv6"
    
    # 检查 IPv6 地址
    IPV6_ADDRS=$(ip -6 addr show | grep "inet6" | grep -v "::1" | grep -v "fe80" | wc -l)
    if [ $IPV6_ADDRS -gt 0 ]; then
        echo "   ✅ 主机有公网 IPv6 地址"
        ip -6 addr show | grep "inet6" | grep -v "::1" | grep -v "fe80" | head -3
    else
        echo "   ⚠️  主机只有本地 IPv6 地址"
    fi
else
    echo "   ❌ 主机不支持 IPv6"
    echo "   建议：无需配置容器 IPv6"
    exit 0
fi

# 检查 IPv6 连通性
echo ""
echo "2. IPv6 连通性测试:"
if ping6 -c 1 -W 3 bing.com >/dev/null 2>&1; then
    echo "   ✅ IPv6 外网连通正常"
else
    echo "   ❌ IPv6 外网连通失败"
    echo "   建议：暂时无需配置容器 IPv6"
fi

# 检查用户访问模式
echo ""
echo "3. 用户访问模式分析:"
echo "   请考虑以下问题："
echo "   - 你的用户主要来自哪些地区？"
echo "   - 用户网络环境是否支持 IPv6？"
echo "   - 是否有纯 IPv6 环境的用户？"

# 检查 WebRTC 需求
echo ""
echo "4. WebRTC IPv6 需求:"
echo "   WebRTC P2P 连接的 IPv6 考虑："
echo "   ✅ 优势："
echo "      - 更好的 NAT 穿透能力"
echo "      - 减少 TURN 服务器负载"
echo "      - 支持纯 IPv6 网络环境"
echo "      - 未来网络发展趋势"
echo "   ⚠️  考虑："
echo "      - 增加配置复杂度"
echo "      - 需要更多防火墙规则"
echo "      - 调试难度增加"

# 检查当前 Docker 配置
echo ""
echo "5. 当前 Docker IPv6 状态:"
if docker network ls --format "table {{.Name}}\t{{.IPv6}}" | grep -q "true"; then
    echo "   ✅ Docker 已启用 IPv6"
else
    echo "   ❌ Docker 未启用 IPv6"
fi

# 性能影响分析
echo ""
echo "6. 性能影响分析:"
echo "   容器 IPv6 vs 主机端口映射："
echo ""
echo "   📊 主机端口映射模式 (当前默认):"
echo "      - IPv6 客户端 → 主机 IPv6:443 → Docker 映射 → 容器 IPv4:80"
echo "      - 优势: 配置简单，兼容性好"
echo "      - 劣势: 额外的网络转换开销"
echo ""
echo "   📊 容器 IPv6 模式:"
echo "      - IPv6 客户端 → 主机 IPv6:443 → 容器 IPv6:80"
echo "      - 优势: 端到端连接，性能更好"
echo "      - 劣势: 配置复杂，需要更多网络知识"

# 建议决策
echo ""
echo "🎯 建议决策:"
echo "============"

# 获取用户类型
echo "请选择你的使用场景："
echo "1) 个人/小团队使用 (< 50 用户)"
echo "2) 中小企业使用 (50-500 用户)" 
echo "3) 大型部署 (> 500 用户)"
echo "4) 全球化服务"
echo "5) 我不确定"

read -p "请输入选择 (1-5): " SCENARIO

case $SCENARIO in
    1)
        echo ""
        echo "📋 个人/小团队建议:"
        echo "   🔧 建议: 暂时不启用容器 IPv6"
        echo "   📝 理由:"
        echo "      - 主机端口映射已足够"
        echo "      - 减少配置复杂度"
        echo "      - 便于故障排除"
        echo "   🚀 何时考虑启用:"
        echo "      - 用户反馈 IPv6 连接问题"
        echo "      - 需要更好的 P2P 性能"
        ;;
    2)
        echo ""
        echo "📋 中小企业建议:"
        echo "   🔧 建议: 可选择启用容器 IPv6"
        echo "   📝 理由:"
        echo "      - 用户群体可能包含 IPv6 用户"
        echo "      - WebRTC 性能提升明显"
        echo "      - 技术团队有能力维护"
        echo "   ⚠️  注意: 需要完善监控和故障处理"
        ;;
    3|4)
        echo ""
        echo "📋 大型/全球化部署建议:"
        echo "   🔧 建议: 强烈推荐启用容器 IPv6"
        echo "   📝 理由:"
        echo "      - 全球用户网络环境多样"
        echo "      - 性能优化至关重要"
        echo "      - 未来网络发展趋势"
        echo "      - 更好的 NAT 穿透能力"
        echo "   🎯 实施策略:"
        echo "      - 分阶段部署"
        echo "      - 完善监控体系"
        echo "      - 准备回滚方案"
        ;;
    5)
        echo ""
        echo "📋 不确定场景建议:"
        echo "   🔧 建议: 先使用默认配置（主机端口映射）"
        echo "   📝 理由:"
        echo "      - 降低初期部署风险"
        echo "      - 观察用户使用模式"
        echo "      - 积累运维经验"
        echo "   📈 后续评估:"
        echo "      - 监控 IPv6 用户比例"
        echo "      - 收集性能反馈"
        echo "      - 评估技术团队能力"
        ;;
esac

# 实施建议
echo ""
echo "🛠️  实施建议:"
echo "============="
echo "如果决定启用容器 IPv6:"
echo "1. 备份当前配置"
echo "2. 在测试环境先验证"
echo "3. 配置完整的监控"
echo "4. 准备回滚方案"
echo "5. 分批次部署"
echo ""
echo "如果暂不启用容器 IPv6:"
echo "1. 保持当前配置"
echo "2. 监控用户反馈"
echo "3. 定期重新评估"
echo "4. 关注网络发展趋势"

# 配置切换提示
echo ""
echo "🔄 配置切换:"
echo "============"
echo "启用容器 IPv6: 使用 docker-compose.yml (已配置)"
echo "禁用容器 IPv6: 使用 docker-compose-ipv4-only.yml"
echo ""
echo "切换命令:"
echo "  启用: docker-compose up -d"
echo "  禁用: docker-compose -f docker-compose-ipv4-only.yml up -d"