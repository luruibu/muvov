# Electron 打包错误修复

## 🐛 问题描述

错误信息：`Cannot find package 'express'`

## 🔍 原因分析

Express 被放在 `devDependencies` 中，但 Electron 应用运行时需要它。Electron Builder 默认只打包 `dependencies` 中的模块。

## ✅ 修复方案

### 1. 移动 Express 到 dependencies

已将 `express` 从 `devDependencies` 移动到 `dependencies`。

### 2. 简化 files 配置

移除了手动指定 `node_modules/express/**/*`，让 Electron Builder 自动处理所有 dependencies。

### 3. 重新构建

```bash
# 重新安装依赖（确保 Express 在正确位置）
npm install

# 重新构建
npm run build:electron-unsigned
```

## 📋 验证步骤

1. 检查 package.json 中 express 在 dependencies
2. 运行 `npm install` 确保依赖正确安装
3. 运行构建命令
4. 测试安装后的应用

## 🚀 重新构建命令

```bash
# 无签名构建
npm run build:electron-unsigned

# 或使用批处理文件
build-electron-unsigned.bat
```

## ⚠️ 注意事项

Electron 应用需要的所有运行时依赖都必须放在 `dependencies` 中，而不是 `devDependencies`。

### 当前运行时依赖：
- express - Web 服务器
- peerjs - P2P 连接
- qrcode - 二维码生成
- qr-scanner - 二维码扫描
- react - UI 框架
- react-dom - React DOM 渲染

这些都已正确配置在 `dependencies` 中。