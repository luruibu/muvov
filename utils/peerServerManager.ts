// PeerJS服务器管理器 - 处理服务器选择和健康检查
export interface PeerServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  path?: string;
  secure?: boolean;
  priority: number; // 优先级，数字越小优先级越高
  lastCheck?: number;
  isHealthy?: boolean;
  responseTime?: number;
}

export class PeerServerManager {
  private static servers: PeerServerConfig[] = [];
  private static initialized = false;

  private static healthCheckCache = new Map<string, {
    isHealthy: boolean;
    responseTime: number;
    lastCheck: number;
  }>();

  // 初始化服务器列表（从系统设置加载）
  private static async initializeServers(): Promise<void> {
    if (this.initialized) return;

    try {
      // 动态导入SettingsManager
      const { SettingsManager } = await import('./settings');
      const settings = SettingsManager.loadSettings();
      
      console.log('📋 Loading servers from system settings...');
      
      // 转换系统设置中的服务器配置
      this.servers = settings.peerServers.map((server: any, index: number) => ({
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
        path: server.path || '/',
        secure: server.secure !== false,
        priority: index + 1 // 按顺序设置优先级
      }));

      // 如果没有配置任何服务器，使用默认服务器
      if (this.servers.length === 0) {
        console.log('⚠️ No servers configured, using default PeerJS server');
        this.servers = [{
          id: 'default',
          name: 'PeerJS Official',
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          priority: 1
        }];
      }

      console.log(`✅ Loaded ${this.servers.length} server(s) from settings:`, 
        this.servers.map(s => `${s.name} (${s.host})`));

      this.initialized = true;

    } catch (error) {
      console.error('❌ Failed to load servers from settings:', error);
      
      // 回退到默认配置
      this.servers = [{
        id: 'default',
        name: 'PeerJS Official',
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        priority: 1
      }];
      
      this.initialized = true;
    }
  }

  // 重新加载服务器配置
  static async reloadServers(): Promise<void> {
    console.log('🔄 Reloading server configuration...');
    this.initialized = false;
    this.servers = [];
    this.healthCheckCache.clear();
    await this.initializeServers();
  }

  // 检查单个服务器健康状态
  static async checkServerHealth(server: PeerServerConfig): Promise<{
    isHealthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`🏥 Checking health of ${server.name} (${server.host})`);
      
      // 1. HTTP连通性测试
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
      
      // 构建健康检查URL
      const protocol = server.secure ? 'https' : 'http';
      const healthUrl = `${protocol}://${server.host}:${server.port}${server.path || '/'}`;
      
      console.log(`  检查 HTTP 连通性: ${healthUrl}`);
      
      const response = await fetch(healthUrl, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // 避免CORS问题
      });
      
      clearTimeout(timeoutId);
      
      // 2. WebSocket连通性测试
      const wsHealthy = await this.testWebSocketConnection(server);
      
      const responseTime = Date.now() - startTime;
      const isHealthy = wsHealthy;
      
      // 缓存结果
      this.healthCheckCache.set(server.id, {
        isHealthy,
        responseTime,
        lastCheck: Date.now()
      });
      
      console.log(`${isHealthy ? '✅' : '❌'} ${server.name}: ${responseTime}ms`);
      
      return { isHealthy, responseTime };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.log(`❌ ${server.name} failed: ${errorMessage} (${responseTime}ms)`);
      
      // 缓存失败结果
      this.healthCheckCache.set(server.id, {
        isHealthy: false,
        responseTime,
        lastCheck: Date.now()
      });
      
      return { 
        isHealthy: false, 
        responseTime,
        error: errorMessage 
      };
    }
  }

  // 测试WebSocket连接
  private static testWebSocketConnection(server: PeerServerConfig): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = `${server.secure ? 'wss' : 'ws'}://${server.host}:${server.port}${server.path || '/'}peerjs`;
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        
        ws.onclose = () => {
          clearTimeout(timeout);
        };
        
      } catch (error) {
        resolve(false);
      }
    });
  }

  // 检查所有服务器健康状态
  static async checkAllServers(): Promise<Map<string, any>> {
    await this.initializeServers(); // 确保服务器列表已初始化
    
    console.log('🏥 Checking all PeerJS servers...');
    
    const results = new Map();
    const promises = this.servers.map(async (server) => {
      const result = await this.checkServerHealth(server);
      results.set(server.id, { ...server, ...result });
      return result;
    });
    
    await Promise.all(promises);
    
    console.log('🏥 Server health check completed');
    return results;
  }

  // 获取最佳服务器
  static async getBestServer(): Promise<PeerServerConfig | null> {
    // 首先检查缓存
    const cachedResults = await this.getCachedHealthyServers();
    if (cachedResults.length > 0) {
      console.log(`🎯 Using cached best server: ${cachedResults[0].name}`);
      return cachedResults[0];
    }
    
    // 如果没有缓存或缓存过期，进行健康检查
    console.log('🔍 No cached results, checking server health...');
    const results = await this.checkAllServers();
    
    // 找到健康且响应时间最短的服务器
    const healthyServers = Array.from(results.values())
      .filter(server => server.isHealthy)
      .sort((a, b) => {
        // 首先按优先级排序，然后按响应时间排序
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.responseTime - b.responseTime;
      });
    
    if (healthyServers.length === 0) {
      console.warn('⚠️ No healthy PeerJS servers found!');
      return null;
    }
    
    const bestServer = healthyServers[0];
    console.log(`🎯 Best server selected: ${bestServer.name} (${bestServer.responseTime}ms)`);
    
    return bestServer;
  }

  // 获取缓存的健康服务器
  private static async getCachedHealthyServers(): Promise<PeerServerConfig[]> {
    await this.initializeServers(); // 确保服务器列表已初始化
    
    const now = Date.now();
    const cacheTimeout = 60000; // 1分钟缓存
    
    return this.servers
      .map(server => {
        const cached = this.healthCheckCache.get(server.id);
        if (!cached || now - cached.lastCheck > cacheTimeout) {
          return null;
        }
        return {
          ...server,
          isHealthy: cached.isHealthy,
          responseTime: cached.responseTime,
          lastCheck: cached.lastCheck
        };
      })
      .filter(server => server && server.isHealthy)
      .sort((a, b) => {
        if (a!.priority !== b!.priority) {
          return a!.priority - b!.priority;
        }
        return a!.responseTime! - b!.responseTime!;
      }) as PeerServerConfig[];
  }

  // 生成PeerJS配置
  static async getOptimalPeerConfig(): Promise<any> {
    // 直接使用SettingsManager的配置，确保用户设置生效
    const { SettingsManager } = await import('./settings');
    const userConfig = SettingsManager.getPeerJSConfig();
    
    console.log('🎯 使用用户配置的PeerJS设置:', userConfig);
    
    // 如果用户配置了自定义服务器，直接返回
    if (userConfig.host && userConfig.host !== '0.peerjs.com') {
      console.log(`✅ 应用用户自定义服务器: ${userConfig.host}:${userConfig.port}`);
      return userConfig;
    }
    
    // 否则进行服务器健康检查
    const bestServer = await this.getBestServer();
    
    if (!bestServer) {
      console.warn('⚠️ 没有健康的服务器，使用默认配置');
      return userConfig; // 返回用户配置（可能是默认服务器）
    }
    
    // 使用健康检查找到的最佳服务器
    const config: any = {
      config: userConfig.config || {
        iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }]
      },
      debug: userConfig.debug || 2
    };
    
    // 如果不是默认服务器，添加服务器配置
    if (bestServer.host !== '0.peerjs.com') {
      config.host = bestServer.host;
      config.port = bestServer.port;
      config.path = bestServer.path || '/';
      config.secure = bestServer.secure !== false;
      
      // 保留用户配置的key
      if (userConfig.key) {
        config.key = userConfig.key;
      }
    }
    
    console.log('⚙️ 最终生成的PeerJS配置:', config);
    return config;
  }

  // 添加自定义服务器
  static addServer(server: Omit<PeerServerConfig, 'id'>): void {
    const newServer: PeerServerConfig = {
      ...server,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    this.servers.push(newServer);
    console.log(`➕ Added custom server: ${newServer.name}`);
  }

  // 移除服务器
  static removeServer(serverId: string): void {
    const index = this.servers.findIndex(s => s.id === serverId);
    if (index !== -1) {
      const removed = this.servers.splice(index, 1)[0];
      this.healthCheckCache.delete(serverId);
      console.log(`➖ Removed server: ${removed.name}`);
    }
  }

  // 获取服务器状态报告
  static async getServerReport(): Promise<{
    servers: PeerServerConfig[];
    healthStatus: Map<string, any>;
    recommendation: string;
  }> {
    await this.initializeServers(); // 确保服务器列表已初始化
    
    const healthStatus = new Map();
    
    this.servers.forEach(server => {
      const cached = this.healthCheckCache.get(server.id);
      healthStatus.set(server.id, {
        ...server,
        ...cached,
        cacheAge: cached ? Date.now() - cached.lastCheck : null
      });
    });
    
    const healthyCount = Array.from(healthStatus.values())
      .filter(s => s.isHealthy).length;
    
    let recommendation = '';
    if (healthyCount === 0) {
      recommendation = '⚠️ 没有健康的服务器，建议检查网络连接或添加备用服务器';
    } else if (healthyCount === 1) {
      recommendation = '💡 建议添加更多备用服务器以提高可靠性';
    } else {
      recommendation = '✅ 服务器配置良好';
    }
    
    return {
      servers: this.servers,
      healthStatus,
      recommendation
    };
  }

  // 清除缓存
  static clearCache(): void {
    this.healthCheckCache.clear();
    console.log('🗑️ Server health cache cleared');
  }
}

// 在控制台中可用的调试函数
(window as any).checkPeerServers = async () => {
  const results = await PeerServerManager.checkAllServers();
  console.log('🏥 Server Health Results:');
  results.forEach((result, id) => {
    console.log(`${result.isHealthy ? '✅' : '❌'} ${result.name}: ${result.responseTime}ms`);
  });
  return results;
};

(window as any).getPeerServerReport = async () => {
  const report = await PeerServerManager.getServerReport();
  console.log('📊 PeerJS Server Report:', report);
  return report;
};

(window as any).getBestPeerServer = async () => {
  const server = await PeerServerManager.getBestServer();
  console.log('🎯 Best PeerJS Server:', server);
  return server;
};