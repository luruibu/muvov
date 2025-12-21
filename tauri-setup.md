# Tauri 集成方案

Tauri 是一个更轻量的桌面应用框架，使用 Rust 后端 + Web 前端。

## 安装步骤

1. 安装 Rust：https://rustup.rs/
2. 安装 Tauri CLI：
   ```bash
   npm install -g @tauri-apps/cli
   ```

3. 初始化 Tauri：
   ```bash
   npm install @tauri-apps/api
   tauri init
   ```

4. 配置 tauri.conf.json：
   ```json
   {
     "build": {
       "distDir": "../dist",
       "devPath": "http://localhost:5173"
     },
     "tauri": {
       "bundle": {
         "identifier": "com.muvov.chat"
       }
     }
   }
   ```

5. 构建：
   ```bash
   npm run build
   tauri build
   ```

优势：
- 更小的包体积
- 更好的性能
- 原生系统集成