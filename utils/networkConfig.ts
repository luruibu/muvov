// Network communication configuration
export const NetworkConfig = {
  // Status check configuration
  STATUS_CHECK: {
    // Online friends heartbeat interval (milliseconds)
    HEARTBEAT_INTERVAL: 60000, // 1 minute (was 30 seconds creating new connections)
    
    // Offline friends check interval (milliseconds)
    OFFLINE_CHECK_INTERVAL: 120000, // 2 minutes (was 30 seconds)
    
    // Connection timeout (milliseconds)
    CONNECTION_TIMEOUT: 10000, // 10 seconds
    
    // Stagger delay for connections (milliseconds)
    STAGGER_DELAY: 2000, // 2 seconds
    
    // Maximum retry count
    MAX_RETRIES: 3
  },

  // Message configuration
  MESSAGING: {
    // Message deduplication time window (milliseconds)
    DEDUP_WINDOW: 1000, // 1 second
    
    // Maximum cached message count
    MAX_CACHED_MESSAGES: 100,
    
    // Message retry interval (milliseconds)
    RETRY_INTERVAL: 3000 // 3 seconds
  },

  // Connection configuration
  CONNECTION: {
    // Use persistent connections instead of frequently creating new ones
    USE_PERSISTENT_CONNECTIONS: true,
    
    // Connection pool size
    MAX_CONNECTIONS: 10,
    
    // Connection idle timeout (milliseconds)
    IDLE_TIMEOUT: 300000, // 5 minutes
    
    // Reconnection delay (milliseconds)
    RECONNECT_DELAY: 5000 // 5 seconds
  }
};

// Dynamically adjust configuration based on network conditions
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
        return NetworkConfig.STATUS_CHECK.HEARTBEAT_INTERVAL * 2; // 2 minutes
      case 'offline':
        return NetworkConfig.STATUS_CHECK.HEARTBEAT_INTERVAL * 4; // 4 minutes
      default:
        return NetworkConfig.STATUS_CHECK.HEARTBEAT_INTERVAL;
    }
  }
  
  static getOfflineCheckInterval(): number {
    switch (this.connectionQuality) {
      case 'good':
        return NetworkConfig.STATUS_CHECK.OFFLINE_CHECK_INTERVAL;
      case 'poor':
        return NetworkConfig.STATUS_CHECK.OFFLINE_CHECK_INTERVAL * 2; // 4 minutes
      case 'offline':
        return NetworkConfig.STATUS_CHECK.OFFLINE_CHECK_INTERVAL * 4; // 8 minutes
      default:
        return NetworkConfig.STATUS_CHECK.OFFLINE_CHECK_INTERVAL;
    }
  }
}

// Network quality monitoring
export class NetworkQualityMonitor {
  private static failedConnections = 0;
  private static totalConnections = 0;
  
  static recordConnection(success: boolean) {
    this.totalConnections++;
    if (!success) {
      this.failedConnections++;
    }
    
    // Evaluate network quality every 10 connections
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
      
      // Reset counters
      this.failedConnections = 0;
      this.totalConnections = 0;
    }
  }
}