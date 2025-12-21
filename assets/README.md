# 应用图标文件

将应用图标文件放在这个目录中：

## 所需图标格式

### Windows
- `icon.ico` - Windows 图标文件
- 推荐尺寸：256x256, 128x128, 64x64, 48x48, 32x32, 16x16

### macOS
- `icon.icns` - macOS 图标文件
- 包含多种尺寸：1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16

### Linux
- `icon.png` - PNG 图标文件
- 推荐尺寸：512x512 或 256x256

## 图标生成工具

### 在线工具
- [IconGenerator](https://icongenerator.net/) - 生成所有格式
- [CloudConvert](https://cloudconvert.com/) - 格式转换

### 命令行工具
```bash
# 安装 electron-icon-builder
npm install -g electron-icon-builder

# 从 PNG 生成所有格式
electron-icon-builder --input=icon.png --output=assets/
```

## 临时解决方案

如果暂时没有图标，可以：
1. 注释掉 package.json 中的 icon 配置
2. 或使用默认的 Electron 图标

## 图标设计建议

- 使用简洁的设计
- 确保在小尺寸下清晰可见
- 使用 MUVOV 的品牌色彩
- 避免过多细节