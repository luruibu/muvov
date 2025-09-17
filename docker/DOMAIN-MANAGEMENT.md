# MUVOV 域名管理指南

本指南详细说明如何在 MUVOV 部署后更改域名、管理证书和处理相关问题。

## 🔄 域名更改场景

### 常见需求
- 从测试域名切换到生产域名
- 更换域名提供商
- 域名到期后更换新域名
- 从子域名切换到主域名

## 📋 更改前准备工作

### 1. DNS 配置
确保新域名已正确配置 DNS 记录：

```bash
# 检查 A 记录（IPv4）
nslookup new-domain.com

# 检查 AAAA 记录（IPv6，可选）
nslookup -type=AAAA new-domain.com

# 检查 DNS 传播
dig +trace new-domain.com
```

### 2. 防火墙配置
确保服务器防火墙已开放必要端口：

```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp

# CentOS/RHEL
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3478/tcp
sudo firewall-cmd --permanent --add-port=3478/udp
sudo firewall-cmd --permanent --add-port=5349/tcp
sudo firewall-cmd --permanent --add-port=5349/udp
sudo firewall-cmd --permanent --add-port=49152-65535/udp
sudo firewall-cmd --reload
```

### 3. 备份当前配置
```bash
# 手动备份
cp .env .env.backup.$(date +%Y%m%d)
docker-compose config > docker-compose.backup.yml
```

## 🚀 域名更改步骤

### 方法一：使用自动化脚本（推荐）

```bash
# Linux/Mac
chmod +x change-domain.sh
./change-domain.sh new-domain.com

# Windows
change-domain.bat new-domain.com
```

### 方法二：手动更改

```bash
# 1. 停止服务
docker-compose down

# 2. 备份配置
cp .env .env.backup.$(date +%Y%m%d)

# 3. 更新域名
sed -i 's/DOMAIN=.*/DOMAIN=new-domain.com/' .env

# 4. 清理证书缓存（可选）
docker volume rm docker_caddy_data

# 5. 重新构建应用
cd ..
npm run build
cd docker

# 6. 启动服务
docker-compose up -d
```

## 🔐 证书管理

### 证书申请过程
1. **自动申请**: Caddy 自动向 Let's Encrypt 申请证书
2. **验证域名**: 通过 HTTP-01 或 TLS-ALPN-01 验证
3. **安装证书**: 自动安装并配置证书
4. **自动续期**: 证书到期前自动续期

### 证书存储位置
```bash
# 查看证书卷
docker volume ls | grep caddy

# 检查证书文件
docker run --rm -v docker_caddy_data:/data alpine ls -la /data/caddy/certificates/
```

### 强制重新申请证书
```bash
# 删除证书缓存
docker-compose down
docker volume rm docker_caddy_data
docker-compose up -d
```

### 证书问题排查
```bash
# 查看 Caddy 日志
docker-compose logs -f caddy

# 检查证书状态
echo | openssl s_client -servername new-domain.com -connect new-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# 测试 HTTPS 连接
curl -I https://new-domain.com
```

## 🔙 回滚操作

### 自动回滚
```bash
# 使用回滚脚本
chmod +x rollback-domain.sh
./rollback-domain.sh
```

### 手动回滚
```bash
# 1. 停止服务
docker-compose down

# 2. 恢复配置
cp .env.backup.YYYYMMDD .env

# 3. 启动服务
docker-compose up -d
```

## 🧪 测试和验证

### 连接测试
```bash
# 使用测试脚本
./test-connectivity.sh new-domain.com

# 手动测试
curl -I https://new-domain.com
curl -s https://new-domain.com/peerjs | grep PeerJS
```

### WebRTC 测试
```bash
# STUN 服务器测试
nc -u -z -w3 new-domain.com 3478

# TURN 服务器测试
nc -z -w3 new-domain.com 5349
```

### 浏览器测试
1. 访问 `https://new-domain.com`
2. 检查 SSL 证书是否有效
3. 测试 P2P 连接功能
4. 检查音视频通话功能

## ⚠️ 常见问题和解决方案

### 1. DNS 解析问题
```bash
# 问题：域名无法解析
# 解决：检查 DNS 配置和传播时间
dig new-domain.com
nslookup new-domain.com 8.8.8.8
```

### 2. 证书申请失败
```bash
# 问题：Let's Encrypt 证书申请失败
# 解决：检查域名解析和端口开放
docker-compose logs caddy | grep -i error
curl -I http://new-domain.com/.well-known/acme-challenge/test
```

### 3. 服务无法访问
```bash
# 问题：HTTPS 无法访问
# 解决：检查防火墙和服务状态
docker-compose ps
netstat -tuln | grep -E ':(80|443|3478|5349)'
```

### 4. WebRTC 连接失败
```bash
# 问题：P2P 连接失败
# 解决：检查 STUN/TURN 服务器
docker-compose logs coturn
nc -u -z -w3 new-domain.com 3478
```

## 📊 监控和维护

### 日志监控
```bash
# 实时查看所有日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f caddy
docker-compose logs -f coturn
docker-compose logs -f peerjs-server
```

### 性能监控
```bash
# 查看资源使用
docker stats

# 查看服务状态
docker-compose ps
```

### 定期维护
```bash
# 清理未使用的镜像
docker image prune -f

# 清理未使用的卷
docker volume prune -f

# 更新镜像
docker-compose pull
docker-compose up -d
```

## 🔧 高级配置

### 多域名支持
如需支持多个域名，可修改 Caddyfile：

```caddyfile
domain1.com, domain2.com {
    # 配置内容
}
```

### 自定义证书
如需使用自定义证书，可修改 Caddyfile：

```caddyfile
domain.com {
    tls /path/to/cert.pem /path/to/key.pem
    # 其他配置
}
```

### 证书通知
配置证书到期通知：

```bash
# 创建监控脚本
cat > check-cert.sh << 'EOF'
#!/bin/bash
DOMAIN="your-domain.com"
DAYS=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -checkend $((30*24*3600)))
if [ $? -ne 0 ]; then
    echo "证书将在30天内到期！"
    # 发送通知邮件或其他操作
fi
EOF

# 添加到 crontab
echo "0 0 * * * /path/to/check-cert.sh" | crontab -
```

---

## 📞 技术支持

如遇到问题，请：
1. 查看相关日志文件
2. 运行连接测试脚本
3. 检查 GitHub Issues
4. 提交详细的问题报告

记住：域名更改是一个涉及 DNS、SSL 证书和网络配置的复杂过程，请确保在操作前做好充分准备和备份。