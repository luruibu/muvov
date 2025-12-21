# MUVOV 独立打包方案

本文档介绍如何将 MUVOV 打包成集成 webserver 的独立应用。

## 方案对比

| 方案 | 优势 | 劣势 | 包大小 | 适用场景 |
|------|------|------|--------|----------|
| Electron | 功能完整，跨平台 | 包体积大 | ~150MB | 桌面应用 |
| Node.js + pkg | 轻量，命令行友好 | 需要终端 | ~50MB | 服务器部署 |
| Tauri | 体积小，性能好 | 需要 Rust | ~20MB | 现代桌面应用 |
| 批处理脚本 | 最简单 | 需要 Node.js 环境 | ~1MB | 开发/测试 |

## 快速开始

### 方案1：Electron 桌面应用（推荐）

```bash
# 1. 安装依赖
npm install electron electron-builder express --save-dev

# 2. 构建应用
npm run build

# 3. 复制 Electron 配置
cp electron-package.json package.json
npm install

# 4. 开发模式测试
npm run electron

# 5. 打包发布
npm run dist
```

生成的可执行文件在 `electron-dist/` 目录中。

### 方案2：Node.js 服务器

```bash
# 1. 安装依赖
npm install express pkg --save-dev

# 2. 构建 Web 应用
npm run build

# 3. 复制服务器配置
cp server-package.json package.json
npm install

# 4. 测试服务器
npm start

# 5. 打包可执行文件
npm run build-win  # Windows
npm run build-mac  # macOS
npm run build-linux # Linux
```

生成的可执行文件在 `server-dist/` 目录中。

### 方案3：简单批处理（Windows）

```bash
# 1. 构建应用
npm run build

# 2. 直接运行批处理文件
run-muvov.bat
```

### 方案4：使用 serve 命令

```bash
# 一键启动（推荐用于开发/演示）
npm run serve
```

## 使用建议

- **开发/演示**：使用 `npm run serve` 或 `run-muvov.bat`
- **分发给用户**：使用 Electron 方案，提供完整的桌面体验
- **服务器部署**：使用 Node.js + pkg 方案
- **追求性能**：使用 Tauri 方案（需要额外配置）

## 注意事项

1. **WebRTC 权限**：所有方案都能正确处理摄像头/麦克风权限
2. **HTTPS 要求**：本地服务器使用 HTTP，但 WebRTC 在 localhost 下可以正常工作
3. **防火墙**：可能需要允许应用访问网络
4. **端口占用**：默认使用 3000 端口，可在代码中修改

## 自定义配置

可以修改以下文件来自定义应用：

- `electron-main.js` - Electron 主进程配置
- `server.js` - Node.js 服务器配置
- `electron-package.json` - Electron 构建配置
- `server-package.json` - 服务器打包配置