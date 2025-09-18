#!/usr/bin/env node

// 自动配置STUN和PeerJS服务器地址到应用中
const fs = require('fs');
const path = require('path');

function configureServers(domain) {
  console.log('🔧 配置服务器地址到应用...');
  
  const distPath = path.join(__dirname, '..', 'dist');
  const configScript = `
// 自动配置的服务器地址
(function() {
  console.log('🚀 自动配置服务器地址...');
  
  // 配置STUN服务器
  const stunServers = [
    {
      id: 'deployed_coturn',
      name: '部署的CoTURN服务器',
      url: 'stun:${domain}:3478',
      enabled: true
    },
    {
      id: 'deployed_coturn_tls',
      name: '部署的CoTURN服务器(TLS)',
      url: 'stuns:${domain}:5349',
      enabled: true
    }
  ];
  
  // 配置PeerJS服务器
  const peerServer = {
    id: 'deployed_peerjs',
    name: '部署的PeerJS服务器',
    host: '${domain}',
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
        notification.innerHTML = '✅ 服务器配置已自动更新<br>🌐 域名: ${domain}';
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
`;

  // 将配置脚本注入到index.html中
  const indexPath = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('❌ 未找到构建文件 index.html');
    return false;
  }
  
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // 检查是否已经注入过配置
  if (indexContent.includes('自动配置的服务器地址')) {
    console.log('⚠️ 配置脚本已存在，跳过注入');
    return true;
  }
  
  // 在</head>标签前注入配置脚本
  const scriptTag = `  <script>${configScript}</script>\n</head>`;
  indexContent = indexContent.replace('</head>', scriptTag);
  
  fs.writeFileSync(indexPath, indexContent);
  
  console.log('✅ 服务器配置脚本已注入到应用中');
  console.log(`   PeerJS: https://${domain}/peerjs`);
  console.log(`   STUN: stun:${domain}:3478`);
  console.log(`   STUNS: stuns:${domain}:5349`);
  
  return true;
}

// 命令行调用
if (require.main === module) {
  const domain = process.argv[2];
  
  if (!domain) {
    console.error('❌ 请提供域名参数');
    console.log('用法: node configure-servers.cjs <domain>');
    process.exit(1);
  }
  
  const success = configureServers(domain);
  process.exit(success ? 0 : 1);
}

module.exports = { configureServers };