// 系统设置管理
export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  path?: string;
  secure?: boolean;
  key?: string;      // 添加 key 字段（用户配置）
  enabled: boolean;
}

export interface STUNConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface SystemSettings {
  peerServers: ServerConfig[];
  stunServers: STUNConfig[];
  version: string;
}

export class SettingsManager {
  private static readonly SETTINGS_KEY = 'meshchat_system_settings';
  
  // 默认配置
  static getDefaultSettings(): SystemSettings {
    return {
      peerServers: [
        {
          id: 'default',
          name: 'PeerJS Official',
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          enabled: true
        }
      ],
      stunServers: [
        {
          id: 'cloudflare',
          name: 'Cloudflare STUN',
          url: 'stun:stun.cloudflare.com:3478',
          enabled: true
        },
        {
          id: 'google1',
          name: 'Google STUN 1',
          url: 'stun:stun.l.google.com:19302',
          enabled: false
        },
        {
          id: 'google2',
          name: 'Google STUN 2',
          url: 'stun:stun1.l.google.com:19302',
          enabled: false
        }
      ],
      version: '1.0'
    };
  }

  // 加载设置
  static loadSettings(): SystemSettings {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        // 验证设置格式
        if (settings.version && settings.peerServers && settings.stunServers) {
          return settings;
        }
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
    
    // 返回默认设置
    const defaultSettings = this.getDefaultSettings();
    this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  // 保存设置
  static saveSettings(settings: SystemSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  // 获取启用的PeerJS服务器
  static getEnabledPeerServer(): ServerConfig | null {
    const settings = this.loadSettings();
    return settings.peerServers.find(server => server.enabled) || null;
  }

  // 获取启用的STUN服务器列表
  static getEnabledSTUNServers(): STUNConfig[] {
    const settings = this.loadSettings();
    return settings.stunServers.filter(server => server.enabled);
  }

  // 生成PeerJS配置
  static getPeerJSConfig(): any {
    const peerServer = this.getEnabledPeerServer();
    const stunServers = this.getEnabledSTUNServers();
    
    console.log('🔧 生成PeerJS配置...');
    console.log('📋 启用的PeerJS服务器:', peerServer);
    console.log('📋 启用的STUN服务器:', stunServers);
    
    const config: any = {
      config: {
        iceServers: stunServers.length > 0 
          ? stunServers.map(server => ({ urls: server.url }))
          : [{ urls: 'stun:stun.cloudflare.com:3478' }] // 默认STUN
      },
      debug: 2
    };

    // 如果有自定义PeerJS服务器且已启用
    if (peerServer && peerServer.enabled) {
      console.log(`✅ 使用自定义服务器: ${peerServer.name} (${peerServer.host})`);
      
      // 只有非默认服务器才添加服务器配置
      if (peerServer.host !== '0.peerjs.com') {
        config.host = peerServer.host;
        config.port = peerServer.port;
        config.path = peerServer.path || '/';
        config.secure = peerServer.secure !== false;
        
        // 添加 key 支持
        if (peerServer.key && peerServer.key.trim()) {
          config.key = peerServer.key.trim();
          console.log(`🔑 使用服务器密钥: ${config.key}`);
        }
        
        console.log('⚙️ 自定义服务器配置:', {
          host: config.host,
          port: config.port,
          path: config.path,
          secure: config.secure,
          key: config.key
        });
      } else {
        console.log('✅ 使用默认PeerJS官方服务器');
      }
    } else {
      console.log('⚠️ 没有启用的PeerJS服务器，使用默认配置');
    }

    console.log('🎯 最终PeerJS配置:', config);
    return config;
  }

  // 添加PeerJS服务器
  static addPeerServer(server: Omit<ServerConfig, 'id'>): void {
    const settings = this.loadSettings();
    const newServer: ServerConfig = {
      ...server,
      id: `peer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    settings.peerServers.push(newServer);
    this.saveSettings(settings);
  }

  // 添加STUN服务器
  static addSTUNServer(server: Omit<STUNConfig, 'id'>): void {
    const settings = this.loadSettings();
    const newServer: STUNConfig = {
      ...server,
      id: `stun_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    settings.stunServers.push(newServer);
    this.saveSettings(settings);
  }

  // 删除服务器
  static removePeerServer(id: string): void {
    const settings = this.loadSettings();
    settings.peerServers = settings.peerServers.filter(server => server.id !== id);
    this.saveSettings(settings);
  }

  static removeSTUNServer(id: string): void {
    const settings = this.loadSettings();
    settings.stunServers = settings.stunServers.filter(server => server.id !== id);
    this.saveSettings(settings);
  }

  // 更新服务器
  static updatePeerServer(id: string, updates: Partial<ServerConfig>): void {
    const settings = this.loadSettings();
    const index = settings.peerServers.findIndex(server => server.id === id);
    if (index !== -1) {
      settings.peerServers[index] = { ...settings.peerServers[index], ...updates };
      this.saveSettings(settings);
    }
  }

  static updateSTUNServer(id: string, updates: Partial<STUNConfig>): void {
    const settings = this.loadSettings();
    const index = settings.stunServers.findIndex(server => server.id === id);
    if (index !== -1) {
      settings.stunServers[index] = { ...settings.stunServers[index], ...updates };
      this.saveSettings(settings);
    }
  }
}