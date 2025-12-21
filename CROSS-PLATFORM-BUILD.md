# 🌍 MUVOV 跨平台构建指南

## 📋 支持的平台

### Windows
- ✅ **NSIS 安装程序** (.exe) - 完整安装体验
- ✅ **便携版** (win-unpacked/) - 免安装运行

### macOS
- ✅ **DMG 安装程序** (.dmg) - 标准 Mac 安装方式
- ✅ **ZIP 压缩包** (.zip) - 便携版本
- ✅ **双架构支持** - Intel (x64) + Apple Silicon (ARM64)

### Linux
- ✅ **AppImage** (.AppImage) - 通用便携应用
- ✅ **DEB 包** (.deb) - Debian/Ubuntu 系统
- ✅ **RPM 包** (.rpm) - RedHat/CentOS/Fedora 系统

## 🚀 构建命令

### 单平台构建
```bash
# Windows 版本
npm run build:win

# macOS 版本  
npm run build:mac

# Linux 版本
npm run build:linux
```

### 全平台构建
```bash
# 构建所有平台
npm run build:all
```

### 批处理脚本
```bash
# 全平台构建
build-all-platforms.bat

# 单平台构建
build-electron-unsigned.bat  # Windows
build-mac.bat                # macOS
build-linux.bat              # Linux
```

## 📦 构建产物

构建完成后，所有文件都在 `electron-dist/` 目录中：

```
electron-dist/
├── 🪟 Windows
│   ├── MUVOV Chat Setup 1.0.0.exe     # 安装程序
│   └── win-unpacked/                   # 便携版
│       └── MUVOV Chat.exe
├── 🍎 macOS
│   ├── MUVOV Chat-1.0.0.dmg           # Intel 安装程序
│   ├── MUVOV Chat-1.0.0-arm64.dmg     # Apple Silicon 安装程序
│   ├── MUVOV Chat-1.0.0-mac.zip       # Intel 压缩包
│   └── MUVOV Chat-1.0.0-arm64-mac.zip # Apple Silicon 压缩包
└── 🐧 Linux
    ├── MUVOV Chat-1.0.0.AppImage       # 通用便携应用
    ├── muvov_1.0.0_amd64.deb           # Debian/Ubuntu 包
    └── muvov-1.0.0.x86_64.rpm          # RedHat/CentOS 包
```

## ⚠️ 构建要求

### 在 Windows 上构建
- ✅ **Windows**: 完全支持
- ❌ **Linux**: 需要特殊权限或工具（推荐使用 GitHub Actions）
- ❌ **macOS**: 需要 macOS 环境（推荐使用 GitHub Actions）

### 在 macOS 上构建
- ✅ **所有平台**: 完全支持

### 在 Linux 上构建
- ✅ **Linux**: 完全支持
- ✅ **Windows**: 需要 Wine (可选)
- ⚠️ **macOS**: 需要额外配置

## 🔧 跨平台构建限制

### Windows → macOS
在 Windows 上构建 macOS 应用需要：
1. 安装额外工具
2. 或使用 GitHub Actions / CI/CD

### 解决方案：使用 GitHub Actions
创建 `.github/workflows/build.yml`：

```yaml
name: Build All Platforms
on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - run: npm install
    - run: npm run build:electron-unsigned
    
    - uses: actions/upload-artifact@v3
      with:
        name: ${{ matrix.os }}-build
        path: electron-dist/
```

## 📋 分发建议

### Windows 用户
- 推荐：`MUVOV Chat Setup.exe` (安装程序)
- 备选：`win-unpacked/` (便携版)

### macOS 用户
- **Intel Mac**: `MUVOV Chat-x64.dmg`
- **Apple Silicon**: `MUVOV Chat-arm64.dmg`
- **通用**: ZIP 压缩包

### Linux 用户
- **通用**: `MUVOV Chat.AppImage` (推荐)
- **Debian/Ubuntu**: `.deb` 包
- **RedHat/CentOS**: `.rpm` 包

## 🎯 使用方式

1. **立即测试单平台**：
   ```bash
   npm run build:win
   ```

2. **构建所有平台**：
   ```bash
   build-all-platforms.bat
   ```

3. **分发给用户**：
   将对应平台的文件发送给用户即可

所有平台的应用都包含完整的 WebRTC 功能，无需额外配置！🎉