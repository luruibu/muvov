// PeerJS connection manager - prevent duplicate connections
import Peer from 'peerjs';

export class PeerConnectionManager {
  private static currentPeer: Peer | null = null;
  private static isInitializing = false;
  private static initPromise: Promise<Peer> | null = null;
  private static connectionCount = 0;
  private static lastPeerId: string | null = null;

  // Get or create Peer connection (singleton pattern)
  static async getOrCreatePeer(peerId: string, config: any): Promise<Peer> {
    console.log(`🔍 Requesting peer connection for ID: ${peerId}`);
    
    // Check if there's already a healthy connection with the same ID
    if (this.currentPeer && 
        !this.currentPeer.destroyed && 
        this.currentPeer.id === peerId &&
        this.currentPeer.open) {
      console.log('✅ Reusing existing healthy peer connection');
      return this.currentPeer;
    }
    
    // If initializing connection with same ID, wait for completion
    if (this.isInitializing && this.initPromise && this.lastPeerId === peerId) {
      console.log('⏳ Waiting for existing initialization to complete');
      return this.initPromise;
    }
    
    // Only cleanup when ID is different or connection has real issues
    if (this.currentPeer && (this.currentPeer.destroyed || this.lastPeerId !== peerId)) {
      console.log('🧹 Cleaning up incompatible connection');
      await this.forceCleanup();
    }
    
    // Create new connection
    this.isInitializing = true;
    this.lastPeerId = peerId;
    this.connectionCount++;
    
    console.log(`🔌 Creating peer connection #${this.connectionCount} for ID: ${peerId}`);
    
    this.initPromise = this.createPeerConnection(peerId, config);
    
    try {
      this.currentPeer = await this.initPromise;
      console.log(`✅ Peer connection #${this.connectionCount} established successfully`);
      return this.currentPeer;
    } catch (error) {
      console.error(`❌ Peer connection #${this.connectionCount} failed:`, error);
      throw error;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  // Create Peer connection
  private static createPeerConnection(peerId: string, config: any): Promise<Peer> {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting peer creation with config:`, config);
      
      const peer = new Peer(peerId, config);
      let resolved = false;
      
      // Set timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.log('⏰ Peer connection timeout, destroying...');
          peer.destroy();
          reject(new Error('Peer connection timeout after 30 seconds'));
        }
      }, 30000);
      
      // Listen for connection success
      peer.on('open', (id) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log(`🎉 Peer opened with ID: ${id}`);
          resolve(peer);
        }
      });
      
      // Listen for connection errors
      peer.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.error('💥 Peer error:', error.type, error.message);
          
          // Special handling for ID occupation errors
          if (error.type === 'unavailable-id') {
            console.log('🔄 ID unavailable, will retry with cleanup');
          }
          
          reject(error);
        }
      });
      
      // Listen for disconnection
      peer.on('disconnected', () => {
        console.log('🔌 Peer disconnected');
      });
      
      // Listen for connection close
      peer.on('close', () => {
        console.log('🚪 Peer connection closed');
      });
    });
  }

  // Force cleanup all connections
  static async forceCleanup(): Promise<void> {
    console.log('🧹 Starting force cleanup...');
    
    // Cancel ongoing initialization
    if (this.isInitializing && this.initPromise) {
      console.log('⏹️ Cancelling ongoing initialization');
      this.isInitializing = false;
      this.initPromise = null;
    }
    
    // Destroy current connection
    if (this.currentPeer) {
      console.log('💀 Destroying current peer connection');
      
      try {
        if (!this.currentPeer.destroyed) {
          this.currentPeer.destroy();
        }
      } catch (error) {
        console.warn('⚠️ Error during peer destruction:', error);
      }
      
      this.currentPeer = null;
    }
    
    // Wait for cleanup to complete (reduced wait time)
    console.log('⏳ Waiting for cleanup to complete...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Force cleanup completed');
  }

  // Get current connection status
  static getConnectionStatus(): {
    hasPeer: boolean;
    isOpen: boolean;
    isDestroyed: boolean;
    peerId: string | null;
    isInitializing: boolean;
    connectionCount: number;
    socketState: string | null;
  } {
    const peer = this.currentPeer;
    
    return {
      hasPeer: !!peer,
      isOpen: peer?.open || false,
      isDestroyed: peer?.destroyed || false,
      peerId: peer?.id || null,
      isInitializing: this.isInitializing,
      connectionCount: this.connectionCount,
      socketState: peer?.socket ? this.getSocketStateString((peer.socket as any).readyState) : null
    };
  }

  // Get WebSocket status string
  private static getSocketStateString(readyState: number): string {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  // Check for duplicate connections
  static checkForDuplicateConnections(): {
    duplicateCount: number;
    connections: string[];
    recommendation: string;
  } {
    // Check WebSocket connections in performance entries
    const wsConnections = performance.getEntriesByType('resource')
      .filter((entry: any) => entry.name.includes('peerjs'))
      .map((entry: any) => entry.name);
    
    const duplicateCount = wsConnections.length;
    
    let recommendation = '';
    if (duplicateCount > 1) {
      recommendation = `⚠️ Detected ${duplicateCount} PeerJS connections, recommend refreshing page to clean duplicate connections`;
    } else if (duplicateCount === 1) {
      recommendation = '✅ Connection count is normal';
    } else {
      recommendation = '❓ No PeerJS connections detected';
    }
    
    return {
      duplicateCount,
      connections: wsConnections,
      recommendation
    };
  }

  // Reset manager state
  static reset(): void {
    console.log('🔄 Resetting PeerConnectionManager');
    
    this.forceCleanup();
    this.connectionCount = 0;
    this.lastPeerId = null;
  }

  // Get detailed diagnostic information
  static getDiagnosticInfo(): any {
    const status = this.getConnectionStatus();
    const duplicateCheck = this.checkForDuplicateConnections();
    
    return {
      ...status,
      ...duplicateCheck,
      lastPeerId: this.lastPeerId,
      timestamp: new Date().toISOString()
    };
  }
}

// Debug functions available in console
(window as any).peerConnectionStatus = () => {
  const status = PeerConnectionManager.getConnectionStatus();
  console.log('🔍 Peer Connection Status:', status);
  return status;
};

(window as any).checkDuplicateConnections = () => {
  const check = PeerConnectionManager.checkForDuplicateConnections();
  console.log('🔍 Duplicate Connection Check:', check);
  return check;
};

(window as any).peerDiagnostic = () => {
  const diagnostic = PeerConnectionManager.getDiagnosticInfo();
  console.log('🔍 Peer Connection Diagnostic:', diagnostic);
  return diagnostic;
};

(window as any).forcePeerCleanup = async () => {
  console.log('🧹 Force cleaning peer connections...');
  await PeerConnectionManager.forceCleanup();
  console.log('✅ Force cleanup completed');
};