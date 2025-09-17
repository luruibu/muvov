# MUVOV Docker 部署

这个文件夹包含了 MUVOV 的完整 Docker 部署方案。

## 📁 文件结构

```
docker/
├── docker-compose.yml          # 开发/测试环境配置
├── docker-compose.prod.yml     # 生产环境配置
├── Dockerfile                  # MUVOV 应用构建配置
├── Caddyfile                   # Caddy 反向代理配置
├── turnserver.conf             # CoTURN STUN/TURN 服务器配置
├── nginx.conf                  # Nginx 配置
├── fluent-bit.conf            # 日志收集配置
├── .env.example               # 环境变量模板
├── deploy.sh                  # Linux/Mac 部署脚本
├── deploy.bat                 # Windows 部署脚本
├── change-domain.sh           # 域名更改脚本
├── change-domain.bat          # Windows 域名更改脚本
├── rollback-domain.sh         # 域名回滚脚本
├── switch-ipv6-mode.sh        # IPv6 模式切换脚本
├── check-prerequisites.sh     # 前置条件检查
├── check-ipv6.sh             # IPv6 支持检查
├── test-connectivity.sh       # 连通性测试
├── analyze-ipv6-need.sh      # IPv6 需求分析
├── fix-build-issues.sh       # 构建问题修复
└── README.md                  # 本文件
```

## 🚀 快速开始

### 1. 进入 Docker 目录
```bash
cd docker
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，设置您的域名
```

### 3. 一键部署

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh your-domain.com
```

**Windows:**
```bash
deploy.bat your-domain.com
```

## 🏗️ 服务组件

- **Caddy**: 自动 HTTPS + 反向代理
- **PeerJS Server**: WebRTC 信令服务
- **CoTURN**: STUN/TURN 服务器
- **MUVOV**: P2P 聊天应用

## 🔧 管理命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 生产环境部署
docker-compose -f docker-compose.prod.yml up -d
```

## 🔄 域名更改

### 更改域名
```bash
# Linux/Mac
chmod +x change-domain.sh
./change-domain.sh new-domain.com

# Windows
change-domain.bat new-domain.com
```

### 回滚域名
```bash
# 如果更改后出现问题，可以回滚到之前的配置
chmod +x rollback-domain.sh
./rollback-domain.sh
```

### 域名更改流程
1. **停止服务** - 安全停止所有容器
2. **备份配置** - 自动备份当前配置
3. **更新配置** - 修改域名设置
4. **清理证书** - 可选择清理旧证书缓存
5. **重新构建** - 重新构建应用
6. **启动服务** - 启动所有服务
7. **申请证书** - 自动申请新域名证书
8. **测试连接** - 验证新域名可用性

## 📊 访问地址

- **主应用**: `https://your-domain.com`
- **PeerJS API**: `https://your-domain.com/peerjs`
- **STUN 服务**: `stun:your-domain.com:3478`
- **TURN 服务**: `turn:your-domain.com:3478`

## 🔒 安全配置

确保以下端口已开放（IPv4 和 IPv6）：
- `80, 443` - HTTP/HTTPS
- `3478, 5349` - STUN/TURN
- `49152-65535/udp` - TURN 中继端口

## 🌐 IPv6 支持

提供两种网络模式：

### 模式选择
- **IPv4 + IPv6 双栈**: 完整 IPv6 支持，适合全球化部署
- **仅 IPv4 模式**: 简化配置，IPv6 通过主机端口映射

### 配置检查和切换
```bash
# 分析 IPv6 需求
./analyze-ipv6-need.sh

# 切换网络模式
./switch-ipv6-mode.sh

# 检查 IPv6 支持
./check-ipv6.sh your-domain.com

# 测试连接性
./test-connectivity.sh your-domain.com
```

### 何时需要容器 IPv6？
- ✅ **需要**: 全球化部署、大量用户、性能要求高
- ⚠️ **可选**: 中等规模部署、有技术团队维护
- ❌ **不需要**: 个人使用、小团队、简单部署

## �  网络测试

所有网络连通性测试统一使用 `bing.com`：
- 支持 IPv4 和 IPv6
- 全球可用性好
- 响应稳定可靠

## 📚 详细文档

- **[域名管理指南](DOMAIN-MANAGEMENT.md)** - 完整的域名更改和管理文档

## 🔐 SSL 支持

- **PeerJS Server**: 通过 Caddy 反向代理提供 SSL
- **WebSocket**: 完整支持 WSS (WebSocket Secure)
- **TURN/STUN**: 支持 DTLS 和 TLS 加密
- **自动证书**: Let's Encrypt 自动申请和续期

## 🐛 故障排除

### 常见问题

#### 1. "vite: not found" 错误
```bash
# 问题：构建时找不到 vite 命令
# 解决：运行修复脚本
./fix-build-issues.sh

# 或手动修复
cd ..
npm install
npm run build
cd docker
```

#### 2. 部署前检查
```bash
# 运行前置条件检查
./check-prerequisites.sh
```

#### 3. 权限问题
```bash
# 给脚本添加执行权限
chmod +x *.sh
```

#### 4. Docker 权限问题
```bash
# 将用户添加到 docker 组 (Linux)
sudo usermod -aG docker $USER
# 重新登录或运行
newgrp docker
```

详细部署文档请参考项目根目录的 `README-DOCKER.md`。