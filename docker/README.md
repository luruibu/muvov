# MUVOV Docker Deployment Guide

## Quick Start

```bash
./deploy.sh your-domain.com
```

## Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+, CentOS 7+, Debian 10+)
- **Memory**: Minimum 1GB RAM (2GB+ recommended)
- **Storage**: Minimum 5GB free space
- **Network**: Public IP address and domain name

### Required Software
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+ (or docker-compose 1.29+)
- **Domain**: A valid domain name pointing to your server

### Port Requirements
The following ports must be available:
- **80**: HTTP (for SSL certificate generation)
- **443**: HTTPS (main web service)
- **3478**: STUN server (UDP/TCP)
- **5349**: STUNS server (UDP/TCP, TLS)
- **49152-49300**: TURN relay ports (UDP)

## Installation Steps

### 1. Install Docker and Docker Compose

#### Ubuntu/Debian:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### CentOS/RHEL:
```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Configure Domain Name

Ensure your domain points to your server's public IP (IP V4 or V6 or V4&V6):
```bash
# Check DNS resolution
nslookup your-domain.com
dig your-domain.com A
dig your-domain.com AAAA
```

### 3. Download and Deploy MUVOV

```bash
# Clone repository
git clone https://github.com/luruibu/muvov.git
cd muvov/docker

# Make deployment script executable
chmod +x deploy-en.sh

# Deploy with your domain
./deploy-en.sh your-domain.com
```

### 4. Verify Deployment

After deployment completes, verify services are running:
```bash
# Check container status
docker ps

# Check logs
docker logs muvov-caddy
docker logs muvov-peerjs
docker logs muvov-coturn
```

## Configuration Options

### Environment Variables

The deployment creates a `.env` file with these settings:

```bash
DOMAIN=your-domain.com
COTURN_SECRET=muvov-secret-key-1234567890
PEERJS_KEY=muvov
PEERJS_PATH=/
TURN_MIN_PORT=49152
TURN_MAX_PORT=65535
```

### Custom Configuration

To customize settings, edit the `.env` file before deployment:

```bash
# Edit configuration
nano .env

# Redeploy with new settings
./deploy-en.sh your-domain.com
```

## Service Architecture

### Components

1. **Caddy Proxy**
   - Handles HTTPS termination
   - Automatic SSL certificate generation (Let's Encrypt)
   - Reverse proxy for web application and PeerJS

2. **PeerJS Server**
   - WebRTC signaling server
   - Peer connection management
   - Available at: `https://your-domain.com/peerjs`

3. **CoTURN Server**
   - STUN/TURN server for NAT traversal
   - Supports both UDP and TCP
   - TLS encryption for secure connections

4. **MUVOV Web Application**
   - React-based P2P chat application
   - Served as static files through Caddy
   - Available at: `https://your-domain.com`

### Network Flow

```
Internet → Caddy (443) → {
    / → MUVOV Web App
    /peerjs → PeerJS Server
}

P2P Connections → CoTURN (3478/5349) → Direct P2P or Relay
```

## Management Commands

### View Service Status
```bash
# Check all containers
docker ps

# Check specific service
docker ps --filter name=muvov-caddy
```

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker logs muvov-caddy
docker logs muvov-peerjs
docker logs muvov-coturn
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker restart muvov-caddy
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove everything
docker-compose down -v
```

### Update Deployment
```bash
# Pull latest code
git pull

# Rebuild and redeploy
./deploy-en.sh your-domain.com
```

### Clean Deployment
```bash
# Complete cleanup (removes certificates)
./deploy-en.sh your-domain.com --clean
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
sudo ss -tuln | grep :443

# Stop conflicting service
sudo systemctl stop apache2  # or nginx
```

#### 2. SSL Certificate Issues
```bash
# Check Caddy logs
docker logs muvov-caddy

# Verify domain DNS
nslookup your-domain.com

# Restart Caddy
docker restart muvov-caddy
```

#### 3. CoTURN Connection Issues
```bash
# Check CoTURN logs
docker logs muvov-coturn

# Test STUN server
stun your-domain.com:3478
```

#### 4. Build Failures
```bash
# Check Node.js version
node --version  # Should be 16+

# Clear npm cache
npm cache clean --force

# Rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Log Analysis

#### Caddy Logs
```bash
# Real-time logs
docker logs -f muvov-caddy

# Look for certificate issues
docker logs muvov-caddy 2>&1 | grep -i certificate
```

#### PeerJS Logs
```bash
# Check connection issues
docker logs muvov-peerjs 2>&1 | grep -i error
```

#### CoTURN Logs
```bash
# Check TURN relay issues
docker logs muvov-coturn 2>&1 | grep -i "allocation\|relay"
```

## Security Considerations

### Firewall Configuration

Configure your firewall to allow required ports:

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

### SSL/TLS Security

- Certificates are automatically generated by Let's Encrypt
- TLS 1.2+ is enforced
- HSTS headers are enabled
- Perfect Forward Secrecy is supported

### CoTURN Security

- Authentication is required for TURN relay
- IP restrictions are configured
- Secure random secrets are generated
- TLS encryption is enabled when certificates are available

## Performance Optimization

### Resource Limits

Set appropriate resource limits in `docker-compose.yml`:

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

### Monitoring

Monitor resource usage:
```bash
# Container resource usage
docker stats

# System resource usage
htop
df -h
```

## Backup and Recovery

### Backup Important Data

```bash
# Backup certificates and configuration
tar -czf muvov-backup-$(date +%Y%m%d).tar.gz \
    .env \
    docker-compose.yml \
    /var/lib/docker/volumes/docker_caddy_data \
    /var/lib/docker/volumes/docker_caddy_config
```

### Restore from Backup

```bash
# Stop services
docker-compose down

# Restore volumes
docker volume create docker_caddy_data
docker volume create docker_caddy_config

# Extract backup
tar -xzf muvov-backup-YYYYMMDD.tar.gz

# Restart services
./deploy-en.sh your-domain.com
```

## Advanced Configuration

### Custom Domain Configuration

For multiple domains or subdomains, edit the Caddyfile:

```bash
# Edit Caddyfile
nano Caddyfile

# Add additional domains
chat.example.com, muvov.example.com {
    # ... configuration
}
```

### Load Balancing

For high availability, use multiple PeerJS servers:

```yaml
services:
  peerjs-server-1:
    # ... configuration
  peerjs-server-2:
    # ... configuration
```

### Custom CoTURN Configuration

For advanced TURN server configuration:

```bash
# Create custom turnserver.conf
nano turnserver-custom.conf

# Mount in docker-compose.yml
volumes:
  - ./turnserver-custom.conf:/etc/coturn/turnserver.conf
```

## Support and Community

- **GitHub Issues**: [https://github.com/luruibu/muvov/issues](https://github.com/luruibu/muvov/issues)
- **Documentation**: [https://github.com/luruibu/muvov](https://github.com/luruibu/muvov)
- **Docker Hub**: [https://hub.docker.com/r/muvov/muvov](https://hub.docker.com/r/muvov/muvov)

## License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.