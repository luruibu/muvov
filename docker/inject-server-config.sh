#!/bin/bash

# 简化的服务器配置注入脚本

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "❌ 请提供域名参数"
    echo "用法: ./inject-server-config.sh <domain>"
    exit 1
fi

echo "🔧 注入服务器配置到应用..."

# 检查构建文件是否存在
DIST_PATH="../dist"
if [ ! -d "$DIST_PATH" ]; then
    DIST_PATH="./dist"
fi

if [ ! -f "$DIST_PATH/index.html" ]; then
    echo "❌ 未找到构建文件 index.html"
    exit 1
fi

# 检查是否已经注入过配置
if grep -q "自动配置的服务器地址" "$DIST_PATH/index.html"; then
    echo "⚠️ 配置已存在，跳过注入"
    exit 0
fi

# 创建配置脚本内容
cat > /tmp/server-config.js << EOF
// 自动配置的服务器地址
(function() {
  console.log('🚀 自动配置服务器地址...');
  
  // 配置STUN服务器
  const stunServers = [
    {
      id: 'deployed_coturn',
      name: '部署的CoTURN服务器',
      url: 'stun:${DOMAIN}:3478',
      enabled: true
    },
    {
      id: 'deployed_coturn_tls',
      name: '部署的CoTURN服务器(TLS)',
      url: 'stuns:${DOMAIN}:5349',
      enabled: true
    }
  ];
  
  // 配置PeerJS服务器
  const peerServer = {
    id: 'deployed_peerjs',
    name: '部署的PeerJS服务器',
    host: '${DOMAIN}',
    port: 443,
    path: '/',
    secure: true,
    key: 'muvov',
    enabled: true
  };
  
  // 更新localStorage中的设置
  try {
    const settingsKey = 'meshchat_system_settings';
    let settings = {};
    
    // 尝试加载现有设置
    try {
      const stored = localStorage.getItem(settingsKey);
      if (stored) {
        settings = JSON.parse(stored);
      }
    } catch (e) {
      console.log('创建新的设置配置');
    }
    
    // 确保设置结构存在
    if (!settings.peerServers) settings.peerServers = [];
    if (!settings.stunServers) settings.stunServers = [];
    if (!settings.version) settings.version = '1.0';
    
    // 禁用所有现有服务器
    settings.peerServers.forEach(server => server.enabled = false);
    settings.stunServers.forEach(server => server.enabled = false);
    
    // 添加部署的服务器（如果不存在）
    const existingPeer = settings.peerServers.find(s => s.id === 'deployed_peerjs');
    if (!existingPeer) {
      settings.peerServers.unshift(peerServer);
    } else {
      Object.assign(existingPeer, peerServer);
    }
    
    // 添加STUN服务器
    stunServers.forEach(stunServer => {
      const existing = settings.stunServers.find(s => s.id === stunServer.id);
      if (!existing) {
        settings.stunServers.unshift(stunServer);
      } else {
        Object.assign(existing, stunServer);
      }
    });
    
    // 保存设置
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    
    console.log('✅ 服务器配置已更新');
    console.log('📋 PeerJS服务器:', peerServer);
    console.log('📋 STUN服务器:', stunServers);
    
    // 显示配置成功提示
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      setTimeout(() => {
        const notification = document.createElement('div');
        notification.style.cssText = \`
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          max-width: 300px;
        \`;
        notification.innerHTML = '✅ 服务器配置已自动更新<br>🌐 域名: ${DOMAIN}';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 5000);
      }, 1000);
    }
    
  } catch (error) {
    console.error('❌ 配置服务器地址失败:', error);
  }
})();
EOF

# 将配置脚本注入到index.html中
echo "📝 注入配置脚本到 index.html..."

# 创建临时文件
TEMP_FILE=$(mktemp)

# 在</head>标签前注入配置脚本
awk '
/<\/head>/ {
    print "  <script>"
    while ((getline line < "/tmp/server-config.js") > 0) {
        print "    " line
    }
    close("/tmp/server-config.js")
    print "  </script>"
}
{print}
' "$DIST_PATH/index.html" > "$TEMP_FILE"

# 替换原文件
mv "$TEMP_FILE" "$DIST_PATH/index.html"

# 清理临时文件
rm -f /tmp/server-config.js

echo "✅ 服务器配置已成功注入到应用中"
echo "   PeerJS: https://${DOMAIN}/peerjs"
echo "   STUN: stun:${DOMAIN}:3478"
echo "   STUNS: stuns:${DOMAIN}:5349"