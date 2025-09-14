// 网络通信配置
export const NetworkConfig = {
  // 状态检查配置
  STATUS_CHECK: {
    // 在线好友心跳间隔（毫秒）
    HEARTBEAT_INTERVAL: 60000, // 1分钟（原来是30秒创建新连接）
    
    // 离线好友检查间隔（毫秒）
    OFFLINE_CHECK_INTERVAL: 120000, // 2分钟（原来是30秒）
    
    // 连接超时时间（毫秒）
    CONNECTION_TIMEOUT: 10000, // 10秒
    
    // 错开连接的延迟（毫秒）
    STAGGER_DELAY: 2000, // 2秒
    
    // 最大重试次数
    MAX_RETRIES: 3
  },

  // 消息配置
  MESSAGING: {
    // 消息去重时间窗口（毫秒）
    DEDUP_WINDOW: 1000, // 1秒
    
    // 最大消息缓存数量
    MAX_CACHED_MESSAGES: 100,
    
    // 消息重发间隔（毫秒）
    RETRY_INTERVAL: 3000 // 3秒
  },

  // 连接配置
  CONNECTION: {
    // 使用持久连接而不是频繁创建新连接
    USE_PERSISTENT_CONNECTIONS: true,
    
    // 连接池大小
    MAX_CONNECTIONS: 10,
    
    // 连接空闲超时（毫秒）
    IDLE_TIMEOUT: 300000, // 5分钟
    
    // 重连延迟（毫秒）
    RECONNECT_DELAY: 5000 // 5秒
  }
};

// 根据网络条件动态调整配置
export class AdaptiveNetworkConfig {
  private static connectionQuality: 'good' | 'poor' | 'offline' = 'good';
  
  static setConnectionQuality(quality: 'good' | 'poor' | 'offline') {
    this.connectionQuality = quality;
  }
  
  static getHeartbeatInterval(): number {
    switch (this.connectionQuality) {
      case 'good':
        return NetworkConfig.STATUS_CHECK.HEARTBEAT_INTERVAL;
      case 'poor':
        return NetworkConfig.STATUS_CHECK.HEARTBEAT_INTERVAL * 2; // 2分钟
      case 'offline':
        return NetworkConfig.STATUS_CHECK.HEARTBEAT_INTERVAL * 4; // 4分钟
      default:
        return NetworkConfig.STATUS_CHECK.HEARTBEAT_INTERVAL;
    }
  }
  
  static getOfflineCheckInterval(): number {
    switch (this.connectionQuality) {
      case 'good':
        return NetworkConfig.STATUS_CHECK.OFFLINE_CHECK_INTERVAL;
      case 'poor':
        return NetworkConfig.STATUS_CHECK.OFFLINE_CHECK_INTERVAL * 2; // 4分钟
      case 'offline':
        return NetworkConfig.STATUS_CHECK.OFFLINE_CHECK_INTERVAL * 4; // 8分钟
      default:
        return NetworkConfig.STATUS_CHECK.OFFLINE_CHECK_INTERVAL;
    }
  }
}

// 网络质量监测
export class NetworkQualityMonitor {
  private static failedConnections = 0;
  private static totalConnections = 0;
  
  static recordConnection(success: boolean) {
    this.totalConnections++;
    if (!success) {
      this.failedConnections++;
    }
    
    // 每10次连接评估一次网络质量
    if (this.totalConnections % 10 === 0) {
      const failureRate = this.failedConnections / this.totalConnections;
      
      if (failureRate > 0.5) {
        AdaptiveNetworkConfig.setConnectionQuality('poor');
        console.log('📶 Network quality: POOR (failure rate:', failureRate.toFixed(2), ')');
      } else if (failureRate > 0.8) {
        AdaptiveNetworkConfig.setConnectionQuality('offline');
        console.log('📶 Network quality: OFFLINE (failure rate:', failureRate.toFixed(2), ')');
      } else {
        AdaptiveNetworkConfig.setConnectionQuality('good');
        console.log('📶 Network quality: GOOD (failure rate:', failureRate.toFixed(2), ')');
      }
      
      // 重置计数器
      this.failedConnections = 0;
      this.totalConnections = 0;
    }
  }
}