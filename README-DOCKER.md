# MUVOV Docker 部署指南

这个 Docker Compose 配置提供了完整的 MUVOV 部署方案，包含所有必要的组件。

> 📁 所有 Docker 相关文件都位于 `docker/` 文件夹中

## 🏗️ 架构组件

- **Caddy**: 反向代理 + 自动 HTTPS 证书
- **PeerJS Server**: WebRTC 信令服务器
- **CoTURN**: STUN/TURN 服务器用于 NAT 穿透
- **MUVOV**: 主应用程序

## 🚀 快速部署

### 1. 准备工作

确保您的服务器已安装：
- Docker
- Docker Compose
- 域名已解析到服务器 IP

### 2. 克隆项目

```bash
git clone https://github.com/luruibu/muvov.git
cd muvov
```

### 3. 进入 Docker 目录

```bash
cd docker
```

### 4. 配置域名

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，设置您的域名：
```bash
DOMAIN=your-domain.com
```

### 5. 部署服务

#### Linux/Mac 用户：
```bash
chmod +x deploy.sh
./deploy.sh your-domain.com
```

#### Windows 用户：
```bash
deploy.bat your-domain.com
```

或手动部署：
```bash
# 1. 复制 .env.example 为 .env
# 2. 设置 DOMAIN=your-domain.com
# 3. 构建应用
cd ..
npm run build
cd docker
# 4. 启动服务
docker-compose up -d
```

### 5. 验证部署

访问 `https://your-domain.com` 查看应用是否正常运行。

## 🔧 配置说明

### 端口配置

| 服务 | 端口 | 协议 | 说明 |
|------|------|------|------|
| Caddy | 80, 443 | HTTP/HTTPS | Web 服务和自动 HTTPS |
| CoTURN | 3478, 5349 | UDP/TCP | STUN/TURN 服务 |
| CoTURN | 49152-65535 | UDP | TURN 中继端口范围 |

### 证书管理

Caddy 会自动：
- 申请 Let's Encrypt 证书
- 自动续期证书
- 将证书共享给 CoTURN 使用

### 环境变量

```bash
# 必需配置
DOMAIN=your-domain.com          # 您的域名

# 可选配置
COTURN_SECRET=muvov-secret-key  # TURN 服务器密钥
PEERJS_KEY=muvov               # PeerJS 服务器密钥
PEERJS_PATH=/peerjs            # PeerJS 服务路径
```

## 🛠️ 管理命令

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f caddy
docker-compose logs -f coturn
docker-compose logs -f peerjs-server
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart caddy
```

### 停止服务
```bash
docker-compose down
```

### 更新应用
```bash
# 拉取最新代码
git pull

# 重新构建和部署
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🔒 安全配置

### 防火墙设置

确保以下端口已开放：
```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3478/tcp
sudo firewall-cmd --permanent --add-port=3478/udp
sudo firewall-cmd --permanent --add-port=5349/tcp
sudo firewall-cmd --permanent --add-port=5349/udp
sudo firewall-cmd --permanent --add-port=49152-65535/udp
sudo firewall-cmd --reload
```

### TURN 服务器认证

默认 TURN 用户：
- 用户名: `muvov` / 密码: `muvov123`
- 用户名: `guest` / 密码: `guest123`

生产环境建议修改 `turnserver.conf` 中的用户凭据。

## 🐛 故障排除

### 常见问题

1. **证书申请失败**
   - 检查域名 DNS 解析是否正确
   - 确保端口 80 和 443 未被占用
   - 查看 Caddy 日志：`docker-compose logs caddy`

2. **TURN 服务器连接失败**
   - 检查防火墙设置
   - 确保 UDP 端口范围 49152-65535 已开放
   - 查看 CoTURN 日志：`docker-compose logs coturn`

3. **PeerJS 连接问题**
   - 检查浏览器控制台错误
   - 验证 `/peerjs` 路径是否可访问
   - 查看 PeerJS 日志：`docker-compose logs peerjs-server`

### 日志位置

- Caddy 日志: 容器内 `/var/log/caddy/`
- CoTURN 日志: 容器内 `/var/log/turnserver.log`
- PeerJS 日志: 通过 `docker-compose logs` 查看

## 📊 监控和维护

### 健康检查

创建简单的健康检查脚本：
```bash
#!/bin/bash
# health-check.sh

echo "检查 MUVOV 服务状态..."

# 检查 Web 服务
if curl -f -s https://your-domain.com > /dev/null; then
    echo "✅ Web 服务正常"
else
    echo "❌ Web 服务异常"
fi

# 检查 PeerJS 服务
if curl -f -s https://your-domain.com/peerjs > /dev/null; then
    echo "✅ PeerJS 服务正常"
else
    echo "❌ PeerJS 服务异常"
fi

# 检查 TURN 服务
if nc -u -z -w3 your-domain.com 3478; then
    echo "✅ TURN 服务正常"
else
    echo "❌ TURN 服务异常"
fi
```

### 备份配置

重要文件备份：
```bash
# 备份配置文件
tar -czf muvov-config-$(date +%Y%m%d).tar.gz \
    .env \
    docker-compose.yml \
    Caddyfile \
    turnserver.conf
```

## 🔄 更新和升级

### 应用更新
```bash
git pull
docker-compose build --no-cache muvov-builder
docker-compose up -d
```

### 组件更新
```bash
# 更新所有镜像
docker-compose pull
docker-compose up -d
```

## 💡 性能优化

### 资源限制

在 `docker-compose.yml` 中添加资源限制：
```yaml
services:
  coturn:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### 网络优化

根据用户规模调整 CoTURN 配置：
- 小规模（<100 用户）：默认配置
- 中规模（100-1000 用户）：增加端口范围
- 大规模（>1000 用户）：考虑多实例部署

---

🎉 现在您拥有了一个完全自主的、安全的 P2P 通信系统！