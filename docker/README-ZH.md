# MUVOV Docker 部署指南

## 快速开始

```bash
./deploy.sh your-domain.com
```

## 前置条件

### 系统要求
- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+, Debian 10+)
- **内存**: 最低 1GB RAM (推荐 2GB+)
- **存储**: 最低 5GB 可用空间
- **网络**: 公网 IP 地址和域名

### 必需软件
- **Docker**: 版本 20.10+
- **Docker Compose**: 版本 2.0+ (或 docker-compose 1.29+)
- **域名**: 指向服务器的有效域名

### 端口要求
以下端口必须可用:
- **80**: HTTP (用于 SSL 证书生成)
- **443**: HTTPS (主要 Web 服务)
- **3478**: STUN 服务器 (UDP/TCP)
- **5349**: STUNS 服务器 (UDP/TCP, TLS)
- **49152-49300**: TURN 中继端口 (UDP)

## 安装步骤

### 1. 安装 Docker 和 Docker Compose

#### Ubuntu/Debian:
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt install docker-compose-plugin

# 将用户添加到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

#### CentOS/RHEL:
```bash
# 更新系统
sudo yum update -y

# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将用户添加到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 配置域名

确保您的域名指向服务器的公网 IP (V4 or V6 or V4&V6):
```bash
# 检查 DNS 解析
nslookup your-domain.com
dig your-domain.com A
dig your-domain.com AAAA
```

### 3. 下载并部署 MUVOV

```bash
# 克隆仓库
git clone https://github.com/luruibu/muvov.git
cd muvov/docker

# 使部署脚本可执行
chmod +x deploy.sh

# 使用您的域名部署
./deploy.sh your-domain.com
```

### 4. 验证部署

部署完成后，验证服务是否正在运行:
```bash
# 检查容器状态
docker ps

# 检查日志
docker logs muvov-caddy
docker logs muvov-peerjs
docker logs muvov-coturn
```

## 配置选项

### 环境变量

部署会创建一个包含以下设置的 `.env` 文件:

```bash
DOMAIN=your-domain.com
COTURN_SECRET=muvov-secret-key-1234567890
PEERJS_KEY=muvov
PEERJS_PATH=/
TURN_MIN_PORT=49152
TURN_MAX_PORT=65535
```

### 自定义配置

要自定义设置，请在部署前编辑 `.env` 文件:

```bash
# 编辑配置
nano .env

# 使用新设置重新部署
./deploy.sh your-domain.com
```

## 服务架构

### 组件

1. **Caddy 代理**
   - 处理 HTTPS 终止
   - 自动 SSL 证书生成 (Let's Encrypt)
   - Web 应用和 PeerJS 的反向代理

2. **PeerJS 服务器**
   - WebRTC 信令服务器
   - 对等连接管理
   - 可在以下地址访问: `https://your-domain.com/peerjs`

3. **CoTURN 服务器**
   - 用于 NAT 穿越的 STUN/TURN 服务器
   - 支持 UDP 和 TCP
   - 安全连接的 TLS 加密

4. **MUVOV Web 应用**
   - 基于 React 的 P2P 聊天应用
   - 通过 Caddy 提供静态文件服务
   - 可在以下地址访问: `https://your-domain.com`

### 网络流程

```
互联网 → Caddy (443) → {
    / → MUVOV Web 应用
    /peerjs → PeerJS 服务器
}

P2P 连接 → CoTURN (3478/5349) → 直接 P2P 或中继
```

## 管理命令

### 查看服务状态
```bash
# 检查所有容器
docker ps

# 检查特定服务
docker ps --filter name=muvov-caddy
```

### 查看日志
```bash
# 所有服务
docker-compose logs

# 特定服务
docker logs muvov-caddy
docker logs muvov-peerjs
docker logs muvov-coturn
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker restart muvov-caddy
```

### 停止服务
```bash
# 停止所有服务
docker-compose down

# 停止并删除所有内容
docker-compose down -v
```

### 更新部署
```bash
# 拉取最新代码
git pull

# 重新构建和部署
./deploy.sh your-domain.com
```

### 清理部署
```bash
# 完全清理 (删除证书)
./deploy.sh your-domain.com --clean
```

## 故障排除

### 常见问题

#### 1. 端口已被占用
```bash
# 检查什么在使用端口
sudo ss -tuln | grep :443

# 停止冲突的服务
sudo systemctl stop apache2  # 或 nginx
```

#### 2. SSL 证书问题
```bash
# 检查 Caddy 日志
docker logs muvov-caddy

# 验证域名 DNS
nslookup your-domain.com

# 重启 Caddy
docker restart muvov-caddy
```

#### 3. CoTURN 连接问题
```bash
# 检查 CoTURN 日志
docker logs muvov-coturn

# 测试 STUN 服务器
stun your-domain.com:3478
```

#### 4. 构建失败
```bash
# 检查 Node.js 版本
node --version  # 应该是 16+

# 清理 npm 缓存
npm cache clean --force

# 重新构建
rm -rf node_modules dist
npm install
npm run build
```

### 日志分析

#### Caddy 日志
```bash
# 实时日志
docker logs -f muvov-caddy

# 查找证书问题
docker logs muvov-caddy 2>&1 | grep -i certificate
```

#### PeerJS 日志
```bash
# 检查连接问题
docker logs muvov-peerjs 2>&1 | grep -i error
```

#### CoTURN 日志
```bash
# 检查 TURN 中继问题
docker logs muvov-coturn 2>&1 | grep -i "allocation\|relay"
```

## 安全考虑

### 防火墙配置

配置防火墙以允许所需端口:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3478
sudo ufw allow 5349
sudo ufw allow 49152:49300/udp

# iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 3478 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3478 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 5349 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5349 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 49152:49300 -j ACCEPT
```

### SSL/TLS 安全

- 证书由 Let's Encrypt 自动生成
- 强制使用 TLS 1.2+
- 启用 HSTS 头
- 支持完美前向保密

### CoTURN 安全

- TURN 中继需要身份验证
- 配置了 IP 限制
- 生成安全的随机密钥
- 证书可用时启用 TLS 加密

## 性能优化

### 资源限制

在 `docker-compose.yml` 中设置适当的资源限制:

```yaml
services:
  caddy:
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
```

### 监控

监控资源使用情况:
```bash
# 容器资源使用情况
docker stats

# 系统资源使用情况
htop
df -h
```

## 备份和恢复

### 备份重要数据

```bash
# 备份证书和配置
tar -czf muvov-backup-$(date +%Y%m%d).tar.gz \
    .env \
    docker-compose.yml \
    /var/lib/docker/volumes/docker_caddy_data \
    /var/lib/docker/volumes/docker_caddy_config
```

### 从备份恢复

```bash
# 停止服务
docker-compose down

# 恢复卷
docker volume create docker_caddy_data
docker volume create docker_caddy_config

# 提取备份
tar -xzf muvov-backup-YYYYMMDD.tar.gz

# 重启服务
./deploy.sh your-domain.com
```

## 高级配置

### 自定义域名配置

对于多个域名或子域名，编辑 Caddyfile:

```bash
# 编辑 Caddyfile
nano Caddyfile

# 添加额外域名
chat.example.com, muvov.example.com {
    # ... 配置
}
```

### 负载均衡

对于高可用性，使用多个 PeerJS 服务器:

```yaml
services:
  peerjs-server-1:
    # ... 配置
  peerjs-server-2:
    # ... 配置
```

### 自定义 CoTURN 配置

对于高级 TURN 服务器配置:

```bash
# 创建自定义 turnserver.conf
nano turnserver-custom.conf

# 在 docker-compose.yml 中挂载
volumes:
  - ./turnserver-custom.conf:/etc/coturn/turnserver.conf
```

## 支持和社区

- **GitHub Issues**: [https://github.com/luruibu/muvov/issues](https://github.com/luruibu/muvov/issues)
- **文档**: [https://github.com/luruibu/muvov](https://github.com/luruibu/muvov)
- **Docker Hub**: [https://hub.docker.com/r/muvov/muvov](https://hub.docker.com/r/muvov/muvov)

## 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](../LICENSE) 文件。