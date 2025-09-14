// PeerJS Server Manager - Handles server selection and health checks
export interface PeerServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  path?: string;
  secure?: boolean;
  priority: number; // Priority, lower number means higher priority
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

  // Initialize server list (load from system settings)
  private static async initializeServers(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamically import SettingsManager
      const { SettingsManager } = await import('./settings');
      const settings = SettingsManager.loadSettings();
      
      console.log('📋 Loading servers from system settings...');
      
      // Convert server configuration from system settings
      this.servers = settings.peerServers.map((server: any, index: number) => ({
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
        path: server.path || '/',
        secure: server.secure !== false,
        priority: index + 1 // Set priority in order
      }));

      // If no servers configured, use default server
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
      
      // Fallback to default configuration
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

  // Reload server configuration
  static async reloadServers(): Promise<void> {
    console.log('🔄 Reloading server configuration...');
    this.initialized = false;
    this.servers = [];
    this.healthCheckCache.clear();
    await this.initializeServers();
  }

  // Check individual server health status
  static async checkServerHealth(server: PeerServerConfig): Promise<{
    isHealthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`🏥 Checking health of ${server.name} (${server.host})`);
      
      // Use simplified server availability test
      const wsHealthy = await this.testWebSocketConnection(server);
      
      const responseTime = Date.now() - startTime;
      const isHealthy = wsHealthy;
      
      // Cache results
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
      
      // Cache failure results
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

  // Simplified server availability check
  private static testWebSocketConnection(server: PeerServerConfig): Promise<boolean> {
    return new Promise((resolve) => {
      // For default PeerJS server, return true directly to avoid 403 errors
      if (server.host === '0.peerjs.com') {
        console.log(`  Skipping default PeerJS server test, assuming available`);
        resolve(true);
        return;
      }
      
      // For custom servers, perform simple reachability test
      try {
        const testUrl = `${server.secure ? 'https' : 'http'}://${server.host}:${server.port}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        fetch(testUrl, {
          method: 'GET',
          signal: controller.signal,
          mode: 'no-cors'
        }).then(() => {
          clearTimeout(timeoutId);
          resolve(true);
        }).catch(() => {
          clearTimeout(timeoutId);
          resolve(false);
        });
        
      } catch (error) {
        console.log(`  Server test exception:`, error);
        resolve(false);
      }
    });
  }

  // Check all servers health status
  static async checkAllServers(): Promise<Map<string, any>> {
    await this.initializeServers(); // Ensure server list is initialized
    
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

  // Get best server
  static async getBestServer(): Promise<PeerServerConfig | null> {
    // First check cache
    const cachedResults = await this.getCachedHealthyServers();
    if (cachedResults.length > 0) {
      console.log(`🎯 Using cached best server: ${cachedResults[0].name}`);
      return cachedResults[0];
    }
    
    // If no cache or cache expired, perform health check
    console.log('🔍 No cached results, checking server health...');
    const results = await this.checkAllServers();
    
    // Find healthy server with shortest response time
    const healthyServers = Array.from(results.values())
      .filter(server => server.isHealthy)
      .sort((a, b) => {
        // First sort by priority, then by response time
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

  // Get cached healthy servers
  private static async getCachedHealthyServers(): Promise<PeerServerConfig[]> {
    await this.initializeServers(); // Ensure server list is initialized
    
    const now = Date.now();
    const cacheTimeout = 60000; // 1 minute cache
    
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

  // Generate PeerJS configuration
  static async getOptimalPeerConfig(): Promise<any> {
    // Use SettingsManager configuration directly to ensure user settings take effect
    const { SettingsManager } = await import('./settings');
    const userConfig = SettingsManager.getPeerJSConfig();
    
    console.log('🎯 Using user-configured PeerJS settings:', userConfig);
    
    // If user configured custom server, return directly
    if (userConfig.host && userConfig.host !== '0.peerjs.com') {
      console.log(`✅ Applying user custom server: ${userConfig.host}:${userConfig.port}`);
      return userConfig;
    }
    
    // Otherwise perform server health check
    const bestServer = await this.getBestServer();
    
    if (!bestServer) {
      console.warn('⚠️ No healthy servers, using default configuration');
      return userConfig; // Return user configuration (may be default server)
    }
    
    // Use best server found by health check
    const config: any = {
      config: userConfig.config || {
        iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }]
      },
      debug: userConfig.debug || 2
    };
    
    // If not default server, add server configuration
    if (bestServer.host !== '0.peerjs.com') {
      config.host = bestServer.host;
      config.port = bestServer.port;
      config.path = bestServer.path || '/';
      config.secure = bestServer.secure !== false;
      
      // Preserve user-configured key
      if (userConfig.key) {
        config.key = userConfig.key;
      }
    }
    
    console.log('⚙️ Final generated PeerJS configuration:', config);
    return config;
  }

  // Add custom server
  static addServer(server: Omit<PeerServerConfig, 'id'>): void {
    const newServer: PeerServerConfig = {
      ...server,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    this.servers.push(newServer);
    console.log(`➕ Added custom server: ${newServer.name}`);
  }

  // Remove server
  static removeServer(serverId: string): void {
    const index = this.servers.findIndex(s => s.id === serverId);
    if (index !== -1) {
      const removed = this.servers.splice(index, 1)[0];
      this.healthCheckCache.delete(serverId);
      console.log(`➖ Removed server: ${removed.name}`);
    }
  }

  // Get server status report
  static async getServerReport(): Promise<{
    servers: PeerServerConfig[];
    healthStatus: Map<string, any>;
    recommendation: string;
  }> {
    await this.initializeServers(); // Ensure server list is initialized
    
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
      recommendation = '⚠️ No healthy servers, recommend checking network connection or adding backup servers';
    } else if (healthyCount === 1) {
      recommendation = '💡 Recommend adding more backup servers to improve reliability';
    } else {
      recommendation = '✅ Server configuration is good';
    }
    
    return {
      servers: this.servers,
      healthStatus,
      recommendation
    };
  }

  // Clear cache
  static clearCache(): void {
    this.healthCheckCache.clear();
    console.log('🗑️ Server health cache cleared');
  }
}

// Debug functions available in console
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