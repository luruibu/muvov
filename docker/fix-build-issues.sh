#!/bin/bash

# 构建问题修复脚本

echo "🔧 MUVOV 构建问题修复工具"
echo "========================"

cd ..

echo "1. 清理现有构建..."
rm -rf dist node_modules package-lock.json

echo "2. 重新安装依赖..."
npm install

echo "3. 验证关键依赖..."
if [ -d "node_modules/vite" ]; then
    echo "   ✅ Vite 已安装"
else
    echo "   ❌ Vite 安装失败"
    exit 1
fi

if [ -d "node_modules/react" ]; then
    echo "   ✅ React 已安装"
else
    echo "   ❌ React 安装失败"
    exit 1
fi

echo "4. 尝试构建..."
npm run build

if [ -d "dist" ]; then
    echo "   ✅ 构建成功"
    echo "   📁 构建文件位置: $(pwd)/dist"
    ls -la dist/
else
    echo "   ❌ 构建失败"
    echo "   请检查构建日志中的错误信息"
    exit 1
fi

cd docker

echo ""
echo "🎉 构建问题修复完成！"
echo "现在可以运行部署脚本了："
echo "  ./deploy.sh your-domain.com"