import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const domain = process.env.DOMAIN || env.DOMAIN || '';
    
    console.log('🔧 Vite构建配置 - 域名:', domain);
    
    return {
      base: './',
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.DEPLOY_DOMAIN': JSON.stringify(domain),
        'process.env.PEERJS_HOST': JSON.stringify(domain),
        'process.env.STUN_SERVER': JSON.stringify(domain ? `stun:${domain}:3478` : '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
