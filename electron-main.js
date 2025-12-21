import { app, BrowserWindow } from 'electron';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let server;

function createWindow() {
  // 启动本地服务器
  const expressApp = express();
  const port = 3000;
  
  // 服务静态文件
  expressApp.use(express.static(path.join(__dirname, 'dist')));
  
  server = expressApp.listen(port, () => {
    console.log(`Local server running on http://localhost:${port}`);
    
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false // 允许本地文件访问
      },
      icon: path.join(__dirname, 'assets/icons/png/256x256.png') // 应用图标
    });

    // 加载应用
    mainWindow.loadURL(`http://localhost:${port}`);
    
    // 开发时打开开发者工具
    // mainWindow.webContents.openDevTools();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});