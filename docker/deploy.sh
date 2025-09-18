#!/bin/bash

# MUVOV One-Click Deployment Script

set -e

echo "🚀 MUVOV Deployment Script"
echo "=========================="
echo "📝 Usage: ./deploy-en.sh <domain> [--clean]"
echo "   --clean: Clean all data including certificates"
echo ""

# Detect Docker Compose command
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

# Prerequisites check
echo "🔍 Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed, please install Docker first"
    exit 1
fi

if [ -z "$DOCKER_COMPOSE_CMD" ]; then
    echo "❌ Docker Compose is not installed, please install Docker Compose first"
    exit 1
else
    echo "✅ Docker Compose detected: $DOCKER_COMPOSE_CMD"
fi

# Get domain
if [ -z "$1" ]; then
    echo "Please enter your domain:"
    read -r DOMAIN
else
    DOMAIN=$1
fi

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain cannot be empty"
    exit 1
fi

echo "🌐 Using domain: $DOMAIN"

# Create .env file
echo "📝 Creating configuration file..."
cat > .env << EOF
DOMAIN=$DOMAIN
COTURN_SECRET=muvov-secret-key-$(date +%s)
PEERJS_KEY=muvov
PEERJS_PATH=/
TURN_MIN_PORT=49152
TURN_MAX_PORT=65535
EOF

# Use IPv4 mode deployment
echo "🌐 Using IPv4 network mode deployment..."
COMPOSE_FILE="docker-compose.yml"
echo "   ✅ Configured for IPv4 mode (suitable for most deployment scenarios)"

# Check port usage
echo "🔍 Checking port usage..."
PORTS=(80 443 3478 5349)
for port in "${PORTS[@]}"; do
    if ss -tuln | grep -q ":$port "; then
        echo "⚠️  Warning: Port $port is already in use"
    fi
done

# Build MUVOV application
echo "🔨 Building MUVOV application..."

# Method 1: Try local build
echo "   🏗️  Trying local build..."
cd ..

if command -v npm &> /dev/null && command -v node &> /dev/null; then
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo "   📦 Installing dependencies..."
        npm install
    else
        echo "   ✅ Dependencies already exist"
    fi

    # Build application
    echo "   🏗️  Building application..."
    DOMAIN="$DOMAIN" npm run build
    
    # Configure server after build
    echo "   🔧 Configuring server addresses to application..."
    if [ -f "docker/inject-server-config.sh" ]; then
        chmod +x docker/inject-server-config.sh
        cd docker
        ./inject-server-config.sh "$DOMAIN"
        cd ..
        echo "   ✅ Server addresses configured to application"
    elif [ -f "docker/configure-servers.cjs" ]; then
        node docker/configure-servers.cjs "$DOMAIN"
        echo "   ✅ Server addresses configured to application"
    else
        echo "   ⚠️  Configuration script not found, skipping configuration"
    fi

    # Check build results
    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
        echo "   ⚠️  Local build failed, trying Docker build..."
        LOCAL_BUILD_SUCCESS=false
    else
        echo "   ✅ Local build successful"
        # Check key files
        CSS_COUNT=$(find dist -name "*.css" | wc -l)
        JS_COUNT=$(find dist -name "*.js" | wc -l)
        echo "   📊 Build artifacts: $CSS_COUNT CSS files, $JS_COUNT JS files"
        LOCAL_BUILD_SUCCESS=true
    fi
else
    echo "   ⚠️  Node.js/npm not available, using Docker build..."
    LOCAL_BUILD_SUCCESS=false
fi

# Method 2: If local build fails, use Docker build
if [ "$LOCAL_BUILD_SUCCESS" = false ]; then
    echo "   🐳 Using Docker build..."
    cd docker
    
    # Use dedicated build Dockerfile
    docker build -f Dockerfile.build --build-arg DOMAIN="$DOMAIN" -t muvov-builder ..
    
    # Run build container
    docker run --rm -v "$(pwd)/../dist:/app/dist" -e DOMAIN="$DOMAIN" muvov-builder
    
    # Configure server after Docker build
    echo "   🔧 Configuring server addresses to application..."
    if [ -f "inject-server-config.sh" ]; then
        chmod +x inject-server-config.sh
        ./inject-server-config.sh "$DOMAIN"
        echo "   ✅ Server addresses configured to application"
    elif [ -f "configure-servers.cjs" ]; then
        node configure-servers.cjs "$DOMAIN"
        echo "   ✅ Server addresses configured to application"
    else
        echo "   ⚠️  Configuration script not found, skipping configuration"
    fi
    
    # Check build results
    if [ ! -d "../dist" ] || [ ! -f "../dist/index.html" ]; then
        echo "   ❌ Docker build failed"
        exit 1
    else
        echo "   ✅ Docker build successful"
        # Check key files
        CSS_COUNT=$(find ../dist -name "*.css" | wc -l)
        JS_COUNT=$(find ../dist -name "*.js" | wc -l)
        echo "   📊 Build artifacts: $CSS_COUNT CSS files, $JS_COUNT JS files"
    fi
    cd ..
fi

cd docker

# Clean old data
echo "🧹 Cleaning old data..."

# Stop and remove containers
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE down 2>/dev/null || true
docker rm -f muvov-peerjs muvov-caddy muvov-coturn 2>/dev/null || true

# Clean temporary files
rm -f turnserver-*.conf coturn-*.pem 2>/dev/null || true

# Ask whether to clean persistent data
if [ "$2" = "--clean" ]; then
    echo "🗑️ Cleaning persistent data..."
    docker volume rm docker_caddy_data docker_caddy_config 2>/dev/null || true
    echo "✅ Persistent data cleaned"
else
    echo "💡 Keeping Caddy certificate data, use: ./deploy-en.sh domain --clean for complete cleanup"
fi

# Recreate .env file (ensure after cleanup)
echo "📝 Recreating configuration file..."
cat > .env << EOF
DOMAIN=$DOMAIN
COTURN_SECRET=muvov-secret-key-$(date +%s)
PEERJS_KEY=muvov
PEERJS_PATH=/
TURN_MIN_PORT=49152
TURN_MAX_PORT=65535
EOF

# Validate configuration file
echo "🔍 Validating configuration file..."
if ! $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE config >/dev/null 2>&1; then
    echo "❌ Docker Compose configuration file has errors:"
    $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE config
    exit 1
fi

# Start services step by step (avoid simultaneous startup issues)
echo "🚀 Starting services..."

# 1. Start PeerJS first (simplest)
echo "   1️⃣ Starting PeerJS server..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up -d peerjs-server
sleep 3

# 2. Start Caddy (needs time to apply for certificates)
echo "   2️⃣ Starting Caddy proxy..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up -d caddy
sleep 5

# 2.1 Verify Caddy startup status
echo "   🔍 Verifying Caddy startup status..."
for i in {1..6}; do
    if docker ps --filter name=muvov-caddy --filter status=running | grep -q muvov-caddy; then
        echo "      ✅ Caddy started successfully"
        break
    elif [ $i -eq 6 ]; then
        echo "      ❌ Caddy startup failed, checking logs..."
        docker logs muvov-caddy --tail=10
        echo "      🔧 Trying to restart Caddy..."
        docker restart muvov-caddy
        sleep 3
    else
        echo "      ⏳ Waiting for Caddy startup... ($i/6)"
        sleep 2
    fi
done

# 3. Start CoTURN server (use simplified configuration to ensure successful startup)
echo "   3️⃣ Starting CoTURN server..."

# Generate simplified CoTURN configuration (ensure successful startup)
cat > turnserver-deploy.conf << EOF
# CoTURN deployment configuration - simplified startup
listening-port=3478
listening-ip=0.0.0.0

realm=${DOMAIN}
server-name=${DOMAIN}

user=muvov:muvov123
user=guest:guest123

fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=muvov-secret-key

min-port=49152
max-port=49300
verbose
# Fix log permission issue - use /tmp directory
log-file=/tmp/turnserver.log
syslog

no-multicast-peers
no-cli
no-tls
no-dtls

allowed-peer-ip=10.0.0.0-10.255.255.255
allowed-peer-ip=192.168.0.0-192.168.255.255
allowed-peer-ip=172.16.0.0-172.31.255.255

denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=224.0.0.0-255.255.255.255
EOF

# Start CoTURN container
echo "      Starting CoTURN container..."
docker run -d \
    --name muvov-coturn \
    --network docker_muvov-network \
    -p 3478:3478 \
    -p 3478:3478/udp \
    -p 49152-49300:49152-49300/udp \
    -v "$(pwd)/turnserver-deploy.conf:/etc/coturn/turnserver.conf" \
    -e DOMAIN=${DOMAIN} \
    --restart unless-stopped \
    --entrypoint="" \
    coturn/coturn:latest \
    turnserver -c /etc/coturn/turnserver.conf

# Wait for CoTURN startup
echo "      Waiting for CoTURN startup..."
for i in {1..8}; do
    if docker ps --filter name=muvov-coturn --filter status=running | grep -q muvov-coturn; then
        echo "      ✅ CoTURN started successfully"
        break
    elif [ $i -eq 8 ]; then
        echo "      ❌ CoTURN startup failed, checking logs..."
        docker logs muvov-coturn --tail=10
        exit 1
    else
        echo "      ⏳ Waiting for CoTURN startup... ($i/8)"
        sleep 2
    fi
done

# 4. Auto upgrade CoTURN to TLS (if certificate is available)
echo "   4️⃣ Checking and auto-enabling TLS..."
sleep 5  # Give Caddy some time to generate certificates

if docker exec muvov-caddy find /data/caddy/certificates -name "*${DOMAIN}*.crt" 2>/dev/null | grep -q "$DOMAIN"; then
    echo "      ✅ Domain certificate found, auto-upgrading to TLS..."
    
    # Get certificate path
    CERT_PATH=$(docker exec muvov-caddy find /data/caddy/certificates -name "*${DOMAIN}*.crt" 2>/dev/null | head -1)
    KEY_PATH="${CERT_PATH%.crt}.key"
    
    echo "      📋 Certificate path: $CERT_PATH"
    
    # Copy certificates to local directory
    echo "      📋 Copying certificate files..."
    docker exec muvov-caddy cat "$CERT_PATH" > ./coturn-cert.pem 2>/dev/null
    docker exec muvov-caddy cat "$KEY_PATH" > ./coturn-key.pem 2>/dev/null
    
    if [ -s ./coturn-cert.pem ] && [ -s ./coturn-key.pem ]; then
        echo "      ✅ Certificate files copied successfully"
        
        # Generate TLS configuration
        cat > turnserver-tls-auto.conf << EOF
# CoTURN TLS configuration - auto-generated
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0

realm=${DOMAIN}
server-name=${DOMAIN}

user=muvov:muvov123
user=guest:guest123

# TLS certificates
cert=/etc/coturn/cert.pem
pkey=/etc/coturn/key.pem

fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=muvov-secret-key

min-port=49152
max-port=49300
verbose
# Fix log permission issue - use /tmp directory
log-file=/tmp/turnserver.log
syslog

no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1

allowed-peer-ip=10.0.0.0-10.255.255.255
allowed-peer-ip=192.168.0.0-192.168.255.255
allowed-peer-ip=172.16.0.0-172.31.255.255

denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=224.0.0.0-255.255.255.255
EOF
        
        # Stop current CoTURN container
        echo "      🛑 Stopping current CoTURN container..."
        docker rm -f muvov-coturn 2>/dev/null || true
        
        # Start CoTURN with TLS
        echo "      🚀 Starting CoTURN with TLS..."
        docker run -d \
            --name muvov-coturn \
            --network docker_muvov-network \
            -p 3478:3478 \
            -p 3478:3478/udp \
            -p 5349:5349 \
            -p 5349:5349/udp \
            -p 49152-49300:49152-49300/udp \
            -v "$(pwd)/turnserver-tls-auto.conf:/etc/coturn/turnserver.conf" \
            -v "$(pwd)/coturn-cert.pem:/etc/coturn/cert.pem" \
            -v "$(pwd)/coturn-key.pem:/etc/coturn/key.pem" \
            -e DOMAIN=${DOMAIN} \
            --restart unless-stopped \
            --entrypoint="" \
            coturn/coturn:latest \
            turnserver -c /etc/coturn/turnserver.conf
        
        # Wait for TLS CoTURN startup
        echo "      ⏳ Waiting for TLS CoTURN startup..."
        for i in {1..6}; do
            if docker ps --filter name=muvov-coturn --filter status=running | grep -q muvov-coturn; then
                echo "      ✅ TLS CoTURN started successfully"
                break
            elif [ $i -eq 6 ]; then
                echo "      ⚠️ TLS CoTURN startup failed, keeping non-TLS version"
                docker logs muvov-coturn --tail=5
            else
                echo "      ⏳ Waiting for TLS CoTURN... ($i/6)"
                sleep 2
            fi
        done
    else
        echo "      ⚠️ Certificate file copy failed, keeping non-TLS CoTURN"
    fi
else
    echo "      ℹ️ No domain certificate found yet, keeping non-TLS CoTURN"
    echo "      💡 Certificates will be generated automatically, you can restart later for TLS"
fi

# Final status check
echo ""
echo "🎉 Deployment completed!"
echo "========================"
echo "🌐 Your MUVOV instance is available at: https://$DOMAIN"
echo ""
echo "📋 Service Status:"
echo "   • Web Application: https://$DOMAIN"
echo "   • PeerJS Server: https://$DOMAIN/peerjs"
echo "   • STUN Server: stun:$DOMAIN:3478"
if docker ps --filter name=muvov-coturn | grep -q 5349; then
    echo "   • STUNS Server: stuns:$DOMAIN:5349 (TLS enabled)"
else
    echo "   • STUNS Server: stuns:$DOMAIN:5349 (will be available after certificate generation)"
fi
echo ""
echo "🔧 Management Commands:"
echo "   • View logs: docker logs muvov-caddy"
echo "   • Restart services: $DOCKER_COMPOSE_CMD restart"
echo "   • Stop services: $DOCKER_COMPOSE_CMD down"
echo "   • Clean deployment: ./deploy-en.sh $DOMAIN --clean"
echo ""
echo "💡 Note: If this is the first deployment, SSL certificates are being generated."
echo "   The site may show a security warning for a few minutes until certificates are ready."