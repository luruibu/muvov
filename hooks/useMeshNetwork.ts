import { useState, useRef, useCallback, useEffect } from 'react';
import Peer from 'peerjs';
import { SettingsManager } from '../utils/settings';

import { PeerServerManager } from '../utils/peerServerManager';
import { PeerConnectionManager } from '../utils/peerConnectionManager';

export const useMeshNetwork = (localUsername: string, customPeerId?: string) => {
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const peerRef = useRef<Peer | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectingRef = useRef(false);
  const initializingRef = useRef(false);
  const tabIdRef = useRef(`tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connection timeout handler
  const handleConnectionTimeout = useCallback(() => {
    console.log('⏰ Connection timeout, forcing reconnect...');
    setIsReady(false);
    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
    }
    attemptReconnect();
  }, []);

  // Handle peer errors
  const handlePeerError = useCallback((error: any) => {
    // Handle different error types
    if (error.type === 'unavailable-id' || error.type === 'ID-TAKEN') {
      const attempt = reconnectAttempts.current + 1;
      const maxAttempts = 5;
      const waitTime = Math.min(10000 * Math.pow(1.5, reconnectAttempts.current), 60000);
      
      console.log('🔒 ID occupied, waiting for server cleanup...');
      
      // Detailed user notification
      const statusMessage = `🔄 Connection Conflict Detected: Your ID is still registered on server

📝 Reason: Previous browser session didn't disconnect properly, server still thinks you're online

⏳ Waiting for server to automatically cleanup old connection...

🔢 Attempt ${attempt}/${maxAttempts} - Please wait ${Math.round(waitTime/1000)} seconds

⚠️ Please don't close browser, system is handling this automatically...`;
      
      setConnectionStatus(statusMessage);
      
      if (reconnectAttempts.current < maxAttempts) {
        setTimeout(() => {
          reconnectAttempts.current++;
          console.log(`⏳ Retry ${attempt}/${maxAttempts} after ${Math.round(waitTime/1000)}s wait`);
          initializePeer();
        }, waitTime);
      } else {
        console.log('❌ Server cleanup timeout. Manual refresh recommended.');
        const finalMessage = `❌ Connection Timeout: Server cleanup taking too long

📝 Possible causes:
• Server overload
• Unstable network connection
• Multiple tabs using same ID

🔄 Solutions:
1. Close other MUVOV tabs
2. Refresh current page (Ctrl+F5)
3. Wait 2-3 minutes and try again

ℹ️ Your friends list and chat history will remain intact after refresh`;
        setConnectionStatus(finalMessage);
        setIsReady(false);
      }
    } else if (error.type === 'peer-unavailable') {
      console.log('✅ Old ID cleared from server, can use original ID');
    } else if (error.type === 'network' || error.type === 'server-error') {
      console.log('🌐 Network/server error, will retry...');
      setTimeout(() => {
        if (!isReady && reconnectAttempts.current < 10) {
          attemptReconnect();
        }
      }, 3000);
    } else if (error.type === 'disconnected') {
      console.log('📡 Disconnected, attempting reconnect...');
      setTimeout(() => attemptReconnect(), 2000);
    }
  }, [isReady]);

  // Setup peer event listeners
  const setupPeerEventListeners = useCallback((peer: Peer) => {


    peer.on('disconnected', () => {
      console.log('⚠️ Peer disconnected, attempting to reconnect...');
      setIsReady(false);
      

      
      // Try to reconnect
      setTimeout(() => {
        if (peer && !peer.destroyed) {
          peer.reconnect();
        }
      }, 1000);
    });

    peer.on('error', (error) => {
      console.error('❌ PeerJS error:', error);
      setIsReady(false);
      handlePeerError(error);
    });
  }, [handlePeerError]);

  // Initialize PeerJS with duplicate prevention
  const initializePeer = useCallback(async () => {
    if (initializingRef.current) {
      console.log('⏸️ Peer initialization already in progress');
      return;
    }
    
    initializingRef.current = true;
    
    try {
      const peerId = customPeerId || `user_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get optimal server configuration with mobile optimization
      const { MobileCompatibility } = await import('../utils/mobileCompatibility');
      let peerConfig = await PeerServerManager.getOptimalPeerConfig();
      
      // Apply mobile optimizations if on mobile device
      if (MobileCompatibility.isMobile()) {
        const mobileConfig = MobileCompatibility.getMobilePeerConfig();
        peerConfig = {
          ...peerConfig,
          config: {
            ...peerConfig.config,
            ...mobileConfig.config
          },
          debug: mobileConfig.debug
        };
        console.log('📱 Applied mobile optimizations to peer config');
      }
      
      console.log('🚀 Initializing peer with ID:', peerId, 'attempt:', reconnectAttempts.current);
      console.log('📋 Using config:', peerConfig);
      

      
      // Use connection manager to prevent duplicates
      const peer = await PeerConnectionManager.getOrCreatePeer(peerId, peerConfig);
      
      // Store peer reference
      peerRef.current = peer;
      
      // Connection successful
      console.log('🆔 Peer connection established with ID:', peer.id);
      setIsReady(true);
      setConnectionStatus('');
      reconnectAttempts.current = 0;
      reconnectingRef.current = false;
      

      
      // Setup event listeners for the established connection
      setupPeerEventListeners(peer);
      
    } catch (error) {
      console.error('❌ Failed to initialize peer:', error);
      setIsReady(false);
      handlePeerError(error);
      
    } finally {
      initializingRef.current = false;
    }
  }, [customPeerId, setupPeerEventListeners, handlePeerError]);

  // Optimized reconnect functionality with longer delays
  const attemptReconnect = useCallback(() => {
    if (reconnectingRef.current) {
      console.log('Reconnection already in progress');
      return;
    }
    
    const maxAttempts = 3; // 减少重试次数
    
    if (reconnectAttempts.current >= maxAttempts) {
      console.log('Max reconnection attempts reached, pausing for server cleanup...');
      
      const pauseMessage = `🚫 Connection Attempts Paused: Maximum retries reached

📝 Current Status: System waiting for server to cleanup old connections

⏳ Please wait 1 minute, system will automatically retry

💡 Suggestions:
• Keep this page open, don't close it
• If urgent, refresh page to force reconnection
• Ensure no other tabs are using the same ID

ℹ️ This is normal behavior and won't affect your data security`;
      
      setConnectionStatus(pauseMessage);
      
      setTimeout(() => {
        console.log('Resetting reconnect state after server cleanup period...');
        reconnectAttempts.current = 0;
        reconnectingRef.current = false;
        setConnectionStatus('🔄 Server cleanup completed, retrying connection...');
      }, 60000);
      return;
    }
    
    reconnectingRef.current = true;
    reconnectAttempts.current++;
    
    // 强制清理现有连接
    PeerConnectionManager.forceCleanup();
    
    // 使用更长的延迟给服务器时间
    const delay = Math.min(15000 * Math.pow(1.5, reconnectAttempts.current), 45000);
    
    const reconnectMessage = `🔄 Network Reconnecting...

📝 Reason: Network interruption or server disconnection

⏳ Waiting ${Math.round(delay/1000)} seconds before retry...

🔢 Attempt ${reconnectAttempts.current}/${maxAttempts}

ℹ️ Please keep network connection stable`;
    
    setConnectionStatus(reconnectMessage);
    
    setTimeout(() => {
      console.log(`Attempting reconnect ${reconnectAttempts.current}/${maxAttempts} after ${delay/1000}s...`);
      reconnectingRef.current = false;
      initializePeer();
    }, delay);
  }, [initializePeer]);

  // Basic visibility and network detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible && !isReady) {
        attemptReconnect();
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (!isReady) {
        attemptReconnect();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isReady, attemptReconnect]);

  // Initialize peer only once on mount
  useEffect(() => {
    console.log('🔄 useMeshNetwork effect triggered');
    
    // Check if we already have a healthy connection
    const status = PeerConnectionManager.getConnectionStatus();
    if (status.hasPeer && status.isOpen && !status.isDestroyed) {
      console.log('✅ Using existing healthy peer connection');
      peerRef.current = (PeerConnectionManager as any).currentPeer;
      setIsReady(true);
      return;
    }
    
    // Initialize new connection
    initializePeer();
    
    // 优化页面刷新处理 - 避免刷新时断开连接
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // 检测刷新操作的多种方式
      const isRefresh = 
        event.type === 'beforeunload' && (
          (performance as any).navigation?.type === 1 || // TYPE_RELOAD
          (event as any).persisted ||
          document.visibilityState === 'visible' ||
          event.returnValue === undefined // 用户主动刷新
        );
      
      if (isRefresh) {
        console.log('🔄 Page refresh detected, keeping connection to avoid ID conflicts');
        // 刷新时不断开连接，让服务器自然超时释放
        return;
      }
      
      console.log('🚪 Page actually closing, cleaning up connection');
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
      }
    };
    
    // 使用visibilitychange更精确地检测页面状态
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ Page hidden, delaying connection cleanup');
        // 页面隐藏时不立即断开，给刷新操作留时间
      } else if (document.visibilityState === 'visible') {
        console.log('👀 Page visible, checking connection status');
        // 页面重新显示时检查连接
        if (!isReady && (!peerRef.current || peerRef.current.destroyed)) {
          setTimeout(() => attemptReconnect(), 1000);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // 开发环境下不清理连接（React严格模式）
      if (process.env.NODE_ENV === 'production') {
        console.log('🧹 Component unmounting, cleaning up connection');
        if (peerRef.current && !peerRef.current.destroyed) {
          peerRef.current.destroy();
        }
      }
    };
  }, []); // Empty dependency array - only run once

  return {
    isReady,
    isVisible,
    isOnline,
    connectionStatus,
    attemptReconnect,
    peerInstance: peerRef.current,
    getCacheStats: () => ({ 
      totalMessages: 0,
      tabId: tabIdRef.current,
      isReconnecting: reconnectingRef.current
    })
  };
};