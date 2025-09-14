// System settings management
export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  path?: string;
  secure?: boolean;
  key?: string;      // Add key field (user configuration)
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
  
  // Default configuration
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

  // Load settings
  static loadSettings(): SystemSettings {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        // Validate settings format
        if (settings.version && settings.peerServers && settings.stunServers) {
          return settings;
        }
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
    
    // Return default settings
    const defaultSettings = this.getDefaultSettings();
    this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  // Save settings
  static saveSettings(settings: SystemSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  // Get enabled PeerJS server
  static getEnabledPeerServer(): ServerConfig | null {
    const settings = this.loadSettings();
    return settings.peerServers.find(server => server.enabled) || null;
  }

  // Get enabled STUN servers list
  static getEnabledSTUNServers(): STUNConfig[] {
    const settings = this.loadSettings();
    return settings.stunServers.filter(server => server.enabled);
  }

  // Generate PeerJS configuration
  static getPeerJSConfig(): any {
    const peerServer = this.getEnabledPeerServer();
    const stunServers = this.getEnabledSTUNServers();
    
    console.log('🔧 Generating PeerJS configuration...');
    console.log('📋 Enabled PeerJS server:', peerServer);
    console.log('📋 Enabled STUN servers:', stunServers);
    
    const config: any = {
      config: {
        iceServers: stunServers.length > 0 
          ? stunServers.map(server => ({ urls: server.url }))
          : [{ urls: 'stun:stun.cloudflare.com:3478' }] // Default STUN
      },
      debug: 2
    };

    // If there's a custom PeerJS server and it's enabled
    if (peerServer && peerServer.enabled) {
      console.log(`✅ Using custom server: ${peerServer.name} (${peerServer.host})`);
      
      // Only add server configuration for non-default servers
      if (peerServer.host !== '0.peerjs.com') {
        config.host = peerServer.host;
        config.port = peerServer.port;
        config.path = peerServer.path || '/';
        config.secure = peerServer.secure !== false;
        
        // Add key support
        if (peerServer.key && peerServer.key.trim()) {
          config.key = peerServer.key.trim();
          console.log(`🔑 Using server key: ${config.key}`);
        }
        
        console.log('⚙️ Custom server configuration:', {
          host: config.host,
          port: config.port,
          path: config.path,
          secure: config.secure,
          key: config.key
        });
      } else {
        console.log('✅ Using default PeerJS official server');
      }
    } else {
      console.log('⚠️ No enabled PeerJS server, using default configuration');
    }

    console.log('🎯 Final PeerJS configuration:', config);
    return config;
  }

  // Add PeerJS server
  static addPeerServer(server: Omit<ServerConfig, 'id'>): void {
    const settings = this.loadSettings();
    const newServer: ServerConfig = {
      ...server,
      id: `peer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    settings.peerServers.push(newServer);
    this.saveSettings(settings);
  }

  // Add STUN server
  static addSTUNServer(server: Omit<STUNConfig, 'id'>): void {
    const settings = this.loadSettings();
    const newServer: STUNConfig = {
      ...server,
      id: `stun_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    settings.stunServers.push(newServer);
    this.saveSettings(settings);
  }

  // Delete server
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

  // Update server
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