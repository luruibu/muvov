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
    if (error.type === 'unavailable-id') {
      const attempt = reconnectAttempts.current + 1;
      const totalAttempts = 12;
      const waitTime = Math.min(5000 + (reconnectAttempts.current * 2000), 10000);
      
      console.log('🔒 ID still occupied, waiting for server cleanup...');
      setConnectionStatus(`Your previous session is still active. Waiting for cleanup... (${attempt}/${totalAttempts})`);
      
      setTimeout(() => {
        if (reconnectAttempts.current < totalAttempts) {
          console.log(`⏳ Attempt ${attempt}/12: Waiting for server cleanup...`);
          reconnectAttempts.current++;
          initializePeer();
        } else {
          console.log('❌ Server cleanup timeout. Please refresh the page.');
          setConnectionStatus('Connection timeout. Please refresh the page to try again.');
          setIsReady(false);
        }
      }, waitTime);
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
    // Prevent duplicate initialization
    if (initializingRef.current) {
      console.log('⏸️ Peer initialization already in progress');
      return;
    }
    

    
    initializingRef.current = true;
    
    try {
      // Always use original ID, wait for server cleanup
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

  // Optimized reconnect functionality
  const attemptReconnect = useCallback(() => {
    // Prevent multiple simultaneous reconnection attempts
    if (reconnectingRef.current) {
      console.log('Reconnection already in progress');
      return;
    }
    

    
    const maxAttempts = 5; // Reduced attempts to prevent spam
    
    if (reconnectAttempts.current >= maxAttempts) {
      console.log('Max reconnection attempts reached, pausing...');
      // Reset after longer delay
      setTimeout(() => {
        console.log('Resetting reconnect state...');
        reconnectAttempts.current = 0;
        reconnectingRef.current = false;
      }, 30000);
      return;
    }
    
    reconnectingRef.current = true;
    reconnectAttempts.current++;
    
    // Clean up existing peer
    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
    }
    
    // Use simple backoff delay
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
    
    setTimeout(() => {
      console.log('Attempting optimized reconnect...');
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
    
    // Handle page unload - only disconnect when truly leaving (not refreshing)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Don't disconnect on refresh, only on actual navigation away
      if ((event as any).persisted || (performance as any).navigation?.type === 1) {
        // Page is being refreshed or restored from cache, keep connection
        return;
      }
      
      console.log('🚪 Page unloading, cleaning up peer connection');
      PeerConnectionManager.forceCleanup();
    };
    
    const handlePageHide = (event: PageTransitionEvent) => {
      // Only disconnect if page is being unloaded permanently
      if (!event.persisted) {
        console.log('👋 Page hiding permanently, cleaning up peer connection');
        PeerConnectionManager.forceCleanup();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      
      // Don't destroy on component unmount in development (React strict mode)
      if (process.env.NODE_ENV === 'production') {
        console.log('🧹 Component unmounting, cleaning up peer connection');
        PeerConnectionManager.forceCleanup();
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