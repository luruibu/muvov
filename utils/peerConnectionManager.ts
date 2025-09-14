// PeerJS连接管理器 - 防止重复连接
import Peer from 'peerjs';

export class PeerConnectionManager {
  private static currentPeer: Peer | null = null;
  private static isInitializing = false;
  private static initPromise: Promise<Peer> | null = null;
  private static connectionCount = 0;
  private static lastPeerId: string | null = null;

  // 获取或创建Peer连接（单例模式）
  static async getOrCreatePeer(peerId: string, config: any): Promise<Peer> {
    console.log(`🔍 Requesting peer connection for ID: ${peerId}`);
    
    // 检查是否已有相同ID的健康连接
    if (this.currentPeer && 
        !this.currentPeer.destroyed && 
        this.currentPeer.id === peerId &&
        this.currentPeer.open) {
      console.log('✅ Reusing existing healthy peer connection');
      return this.currentPeer;
    }
    
    // 如果正在初始化相同ID的连接，等待完成
    if (this.isInitializing && this.initPromise && this.lastPeerId === peerId) {
      console.log('⏳ Waiting for existing initialization to complete');
      return this.initPromise;
    }
    
    // 只有在ID不同或连接真的有问题时才清理
    if (this.currentPeer && (this.currentPeer.destroyed || this.lastPeerId !== peerId)) {
      console.log('🧹 Cleaning up incompatible connection');
      await this.forceCleanup();
    }
    
    // 创建新连接
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

  // 创建Peer连接
  private static createPeerConnection(peerId: string, config: any): Promise<Peer> {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting peer creation with config:`, config);
      
      const peer = new Peer(peerId, config);
      let resolved = false;
      
      // 设置超时
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.log('⏰ Peer connection timeout, destroying...');
          peer.destroy();
          reject(new Error('Peer connection timeout after 30 seconds'));
        }
      }, 30000);
      
      // 监听连接成功
      peer.on('open', (id) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log(`🎉 Peer opened with ID: ${id}`);
          resolve(peer);
        }
      });
      
      // 监听连接错误
      peer.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.error('💥 Peer error:', error.type, error.message);
          
          // 特殊处理ID占用错误
          if (error.type === 'unavailable-id') {
            console.log('🔄 ID unavailable, will retry with cleanup');
          }
          
          reject(error);
        }
      });
      
      // 监听连接断开
      peer.on('disconnected', () => {
        console.log('🔌 Peer disconnected');
      });
      
      // 监听连接关闭
      peer.on('close', () => {
        console.log('🚪 Peer connection closed');
      });
    });
  }

  // 强制清理所有连接
  static async forceCleanup(): Promise<void> {
    console.log('🧹 Starting force cleanup...');
    
    // 取消正在进行的初始化
    if (this.isInitializing && this.initPromise) {
      console.log('⏹️ Cancelling ongoing initialization');
      this.isInitializing = false;
      this.initPromise = null;
    }
    
    // 销毁当前连接
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
    
    // 等待清理完成（减少等待时间）
    console.log('⏳ Waiting for cleanup to complete...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Force cleanup completed');
  }

  // 获取当前连接状态
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

  // 获取WebSocket状态字符串
  private static getSocketStateString(readyState: number): string {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  // 检查是否有重复连接
  static checkForDuplicateConnections(): {
    duplicateCount: number;
    connections: string[];
    recommendation: string;
  } {
    // 检查性能条目中的WebSocket连接
    const wsConnections = performance.getEntriesByType('resource')
      .filter((entry: any) => entry.name.includes('peerjs'))
      .map((entry: any) => entry.name);
    
    const duplicateCount = wsConnections.length;
    
    let recommendation = '';
    if (duplicateCount > 1) {
      recommendation = `⚠️ 检测到 ${duplicateCount} 个PeerJS连接，建议刷新页面清理重复连接`;
    } else if (duplicateCount === 1) {
      recommendation = '✅ 连接数量正常';
    } else {
      recommendation = '❓ 未检测到PeerJS连接';
    }
    
    return {
      duplicateCount,
      connections: wsConnections,
      recommendation
    };
  }

  // 重置管理器状态
  static reset(): void {
    console.log('🔄 Resetting PeerConnectionManager');
    
    this.forceCleanup();
    this.connectionCount = 0;
    this.lastPeerId = null;
  }

  // 获取详细诊断信息
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

// 在控制台中可用的调试函数
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