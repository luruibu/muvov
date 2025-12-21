# MUVOV Electron 桌面应用使用指南

## ✅ 第一种方案测试成功！

Electron 集成已经完成并测试通过。你现在有一个完整的桌面应用版本。

## 🚀 快速启动

### 方法1：使用批处理脚本（推荐）
```bash
# 双击运行或在命令行执行
.\start-electron.bat
```

### 方法2：使用 npm 脚本
```bash
# 开发模式（不构建，直接运行）
npm run electron-dev

# 完整模式（先构建再运行）
npm run electron
```

### 方法3：手动启动
```bash
# 1. 构建 Web 应用
npm run build

# 2. 启动 Electron
npx electron electron-main.js
```

## 🎯 功能特性

✅ **完整的桌面应用体验**
- 独立的应用窗口（1200x800）
- 内置 Express 服务器（端口 3000）
- 自动启动和管理本地服务器
- 优雅的关闭处理

✅ **WebRTC 完全支持**
- 摄像头/麦克风权限正常工作
- P2P 连接功能完整
- 所有 Web 功能在桌面环境中可用

✅ **用户友好**
- 一键启动
- 自动构建检查
- 清晰的状态提示

## 📁 文件结构

```
muvov/
├── electron-main.js          # Electron 主进程文件
├── start-electron.bat        # Windows 启动脚本
├── dist/                     # 构建后的 Web 应用
├── package.json              # 包含 Electron 配置
└── ELECTRON-USAGE.md         # 本使用说明
```

## 🔧 自定义配置

### 修改窗口大小
编辑 `electron-main.js` 中的 `BrowserWindow` 配置：
```javascript
mainWindow = new BrowserWindow({
  width: 1400,    // 修改宽度
  height: 900,    // 修改高度
  // ...
});
```

### 修改服务器端口
编辑 `electron-main.js` 中的端口配置：
```javascript
const port = 3001; // 修改端口
```

### 添加应用图标
1. 将图标文件放在 `assets/` 目录
2. 在 `electron-main.js` 中取消注释图标配置

## 🚀 分发应用

虽然网络问题导致 electron-builder 打包失败，但你可以：

### 方法1：直接分发源码
将整个项目文件夹打包，用户只需：
1. 安装 Node.js
2. 双击 `start-electron.bat`

### 方法2：使用便携版 Node.js
1. 下载 Node.js 便携版
2. 将 Node.js 和项目打包在一起
3. 修改批处理脚本使用便携版 Node.js

### 方法3：在线环境打包
在网络环境良好的机器上使用 `npm run build:electron` 进行打包

## 🎉 总结

第一种 Electron 方案测试完全成功！
- ✅ 应用正常启动
- ✅ 服务器自动运行
- ✅ WebRTC 功能完整
- ✅ 用户体验良好

用户可以通过简单的双击操作启动完整的桌面版 MUVOV 聊天应用。