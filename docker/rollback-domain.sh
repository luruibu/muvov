#!/bin/bash

# MUVOV 域名回滚脚本

set -e

echo "🔙 MUVOV 域名回滚工具"
echo "===================="

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

# 查找备份目录
BACKUP_DIRS=$(ls -d backup-* 2>/dev/null | sort -r)

if [ -z "$BACKUP_DIRS" ]; then
    echo "❌ 未找到备份目录"
    echo "请手动恢复配置或重新部署"
    exit 1
fi

echo "📁 找到以下备份："
select BACKUP_DIR in $BACKUP_DIRS "取消"; do
    case $BACKUP_DIR in
        "取消")
            echo "❌ 操作已取消"
            exit 0
            ;;
        backup-*)
            break
            ;;
        *)
            echo "请选择有效的备份目录"
            ;;
    esac
done

if [ ! -f "$BACKUP_DIR/.env" ]; then
    echo "❌ 备份目录中未找到 .env 文件"
    exit 1
fi

# 显示备份信息
BACKUP_DOMAIN=$(grep "^DOMAIN=" "$BACKUP_DIR/.env" | cut -d'=' -f2)
CURRENT_DOMAIN=$(grep "^DOMAIN=" .env 2>/dev/null | cut -d'=' -f2 || echo "未知")

echo ""
echo "📋 回滚信息："
echo "当前域名: $CURRENT_DOMAIN"
echo "回滚到域名: $BACKUP_DOMAIN"
echo "备份时间: $BACKUP_DIR"
echo ""

# 确认回滚
read -p "确认回滚到此配置？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

echo ""
echo "🔄 开始回滚..."

# 1. 停止服务
echo "1. 停止当前服务..."
$DOCKER_COMPOSE_CMD down

# 2. 备份当前配置
echo "2. 备份当前配置..."
CURRENT_BACKUP="backup-before-rollback-$(date +%Y%m%d-%H%M%S)"
mkdir -p $CURRENT_BACKUP
cp .env $CURRENT_BACKUP/ 2>/dev/null || echo "   当前 .env 不存在"
echo "   当前配置已备份到: $CURRENT_BACKUP/"

# 3. 恢复配置
echo "3. 恢复配置文件..."
cp "$BACKUP_DIR/.env" .env
echo "   ✅ 配置已恢复"

# 4. 重新构建应用
echo "4. 重新构建应用..."
cd ..

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
    echo "   ❌ 构建失败，未找到 dist 目录"
    exit 1
else
    echo "   ✅ 构建成功"
fi

cd docker

# 5. 启动服务
echo "5. 启动服务..."
$DOCKER_COMPOSE_CMD up -d

# 6. 等待服务启动
echo "6. 等待服务启动..."
sleep 15

# 7. 检查服务状态
echo "7. 检查服务状态..."
$DOCKER_COMPOSE_CMD ps

# 8. 测试连接
echo "8. 测试连接..."
if curl -s -k -I https://$BACKUP_DOMAIN | grep -q "200 OK"; then
    echo "   ✅ HTTPS 连接成功"
else
    echo "   ⚠️  HTTPS 连接可能还在启动中"
fi

echo ""
echo "🎉 域名回滚完成！"
echo "=================="
echo "🌐 访问地址: https://$BACKUP_DOMAIN"
echo "🔧 PeerJS 服务: https://$BACKUP_DOMAIN/peerjs"
echo ""
echo "📋 后续操作："
echo "1. 测试应用功能是否正常"
echo "2. 确认 DNS 解析正确"
echo "3. 如需再次更改，使用: ./change-domain.sh"
echo ""
echo "✨ 回滚完成！"