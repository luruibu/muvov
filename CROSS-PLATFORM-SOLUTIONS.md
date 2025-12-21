# 🌍 跨平台构建解决方案

## ❌ 问题确认

在 Windows 上直接构建 Linux/macOS 版本确实存在限制：

### Windows 上的限制
- ✅ **Windows**: 完全支持
- ⚠️ **Linux**: 需要特殊权限或工具
- ❌ **macOS**: 需要 macOS 环境

## 🔧 解决方案

### 方案1: 使用 GitHub Actions (推荐)

创建自动化构建流程，在云端构建所有平台：

```yaml
# .github/workflows/build.yml
name: Build All Platforms
on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: windows-latest
            platform: win
          - os: macos-latest  
            platform: mac
          - os: ubuntu-latest
            platform: linux
    
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - run: npm install
    - run: npm run build:${{ matrix.platform }}
    
    - uses: actions/upload-artifact@v4
      with:
        name: ${{ matrix.platform }}-build
        path: electron-dist/
```

### 方案2: Docker 构建 (Linux)

使用 Docker 在 Windows 上构建 Linux 版本：

```dockerfile
# Dockerfile.linux
FROM node:18-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libx11-dev \
    libxkbfile-dev \
    libsecret-dev

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build:linux

CMD ["cp", "-r", "electron-dist", "/output/"]
```

使用方式：
```bash
docker build -f Dockerfile.linux -t muvov-linux .
docker run -v %cd%/output:/output muvov-linux
```

### 方案3: WSL2 构建 (Linux)

在 Windows 的 WSL2 中构建 Linux 版本：

```bash
# 在 WSL2 Ubuntu 中
sudo apt update
sudo apt install nodejs npm
npm install
npm run build:linux
```

### 方案4: 虚拟机构建

使用 VirtualBox 或 VMware 运行 Linux/macOS 虚拟机进行构建。

### 方案5: 云服务构建

使用云服务如：
- **GitHub Codespaces**
- **GitLab CI/CD**  
- **Azure DevOps**
- **CircleCI**

## 🚀 推荐实施方案

### 立即可用：GitHub Actions

1. 创建 `.github/workflows/` 目录
2. 添加构建配置文件
3. 推送到 GitHub
4. 自动构建所有平台

### 本地开发：专注 Windows

在开发阶段：
- 主要在 Windows 上开发和测试
- 使用 `npm run build:win` 构建 Windows 版本
- 定期使用 GitHub Actions 构建其他平台

## 📋 当前可用的构建

### ✅ 在 Windows 上可以构建：
```bash
# Windows 版本（完全支持）
npm run build:win
build-electron-unsigned.bat
```

### ⚠️ 需要其他环境：
- **Linux**: 使用 GitHub Actions 或 Docker
- **macOS**: 使用 GitHub Actions 或 macOS 机器

## 🎯 建议的工作流程

1. **开发阶段**: 专注 Windows 版本
   ```bash
   npm run build:win
   ```

2. **测试阶段**: 使用 GitHub Actions 构建所有平台

3. **发布阶段**: 从 GitHub Actions 下载所有平台的构建产物

这样既保证了开发效率，又能提供完整的跨平台支持！