const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3000;

// 服务静态文件
app.use(express.static(path.join(__dirname, 'dist')));

// 处理 SPA 路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(port, () => {
  console.log(`🚀 MUVOV Chat Server running on http://localhost:${port}`);
  console.log('📱 Opening browser...');
  
  // 自动打开浏览器
  const url = `http://localhost:${port}`;
  const start = process.platform === 'darwin' ? 'open' : 
                process.platform === 'win32' ? 'start' : 'xdg-open';
  
  exec(`${start} ${url}`, (error) => {
    if (error) {
      console.log('❌ Could not open browser automatically');
      console.log(`🌐 Please open ${url} manually`);
    }
  });
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});