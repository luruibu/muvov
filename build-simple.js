const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始简化构建流程...');

// 1. 构建 Web 应用
console.log('📦 构建 Web 应用...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Web 应用构建完成');
} catch (error) {
  console.error('❌ Web 应用构建失败');
  process.exit(1);
}

// 2. 创建简化的 Electron 应用目录
const electronDir = 'electron-simple';
const appDir = path.join(electronDir, 'app');

console.log('📁 创建 Electron 应用目录...');

// 清理并创建目录
if (fs.existsSync(electronDir)) {
  fs.rmSync(electronDir, { recursive: true, force: true });
}
fs.mkdirSync(electronDir, { recursive: true });
fs.mkdirSync(appDir, { recursive: true });

// 3. 复制必要文件
console.log('📋 复制应用文件...');

// 复制 dist 目录
execSync(`xcopy dist ${path.join(appDir, 'dist')} /E /I /Y`, { stdio: 'inherit' });

// 复制 electron-main.js
fs.copyFileSync('electron-main.js', path.join(appDir, 'electron-main.js'));

// 创建简化的 package.json
const simplePackage = {
  "name": "muvov-electron",
  "version": "1.0.0",
  "main": "electron-main.js",
  "type": "module",
  "dependencies": {
    "express": "^5.2.1"
  }
};

fs.writeFileSync(
  path.join(appDir, 'package.json'), 
  JSON.stringify(simplePackage, null, 2)
);

// 4. 安装依赖
console.log('📦 安装应用依赖...');
try {
  execSync('npm install', { 
    cwd: appDir, 
    stdio: 'inherit' 
  });
  console.log('✅ 依赖安装完成');
} catch (error) {
  console.error('❌ 依赖安装失败');
  process.exit(1);
}

// 5. 创建启动脚本
const startScript = `@echo off
echo 🚀 启动 MUVOV Chat...
cd /d "%~dp0app"
npx electron electron-main.js
pause`;

fs.writeFileSync(path.join(electronDir, 'start.bat'), startScript);

console.log('✅ 简化构建完成！');
console.log(`📁 应用位置: ${electronDir}/`);
console.log(`🚀 启动方式: 双击 ${electronDir}/start.bat`);
console.log('📦 整个文件夹可以直接分发给用户');