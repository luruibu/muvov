import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { Friend } from '../types';
import { FriendsConfig } from '../utils/friendsConfig';
import { PeerServerManager } from '../utils/peerServerManager';

const loadFriendsFromStorage = (key: string): Friend[] => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed && typeof parsed === 'object' && parsed.friends && Array.isArray(parsed.friends)) {
        return parsed.friends;
      }
    }
  } catch (error) {
    console.warn('Failed to load friends from localStorage:', error);
  }
  return [];
};

export const useIndependentFriendsStatus = (currentPeerId: string) => {
  const [friends, setFriends] = useState<Friend[]>(() => {
    const key = `meshchat_friends_${currentPeerId}`;
    return loadFriendsFromStorage(key);
  });
  const [isCheckingFriends, setIsCheckingFriends] = useState(false);

  const statusPeerRef = useRef<Peer | null>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const pendingChecks = useRef<Set<string>>(new Set());
  const initializingRef = useRef(false);
  const statusCache = useRef<Map<string, { isOnline: boolean; lastCheck: number }>>(new Map());

  const getFriendsKey = useCallback(() => `meshchat_friends_${currentPeerId}`, [currentPeerId]);

  // Save friends to localStorage
  useEffect(() => {
    try {
      const key = getFriendsKey();
      const dataToStore = {
        friends: friends,
        lastUpdated: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to save friends:', error);
    }
  }, [friends, getFriendsKey]);

  // Initialize independent peer for status checking
  const initializeStatusPeer = useCallback(async () => {
    if (initializingRef.current) {
      console.log('🔍 Status peer initialization already in progress');
      return;
    }

    if (statusPeerRef.current && !statusPeerRef.current.destroyed) {
      console.log('🔍 Status peer already exists, reusing connection');
      return;
    }

    initializingRef.current = true;

    try {
      const statusPeerId = `status_${currentPeerId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const peerConfig = await PeerServerManager.getOptimalPeerConfig();
      
      console.log('🔍 Initializing independent status peer:', statusPeerId);
      
      const statusPeer = new Peer(statusPeerId, peerConfig);
      
      statusPeer.on('open', () => {
        console.log('✅ Status peer connected:', statusPeerId);
        statusPeerRef.current = statusPeer;
        initializingRef.current = false;
        
        // Trigger initial status check when peer is ready
        setTimeout(() => {
          console.log('🔄 Triggering status check after peer connection');
          // Use a direct check here to avoid stale closure
          if (statusPeerRef.current && statusPeerRef.current.open) {
            const currentFriends = JSON.parse(localStorage.getItem(`meshchat_friends_${currentPeerId}`) || '[]');
            const friendsList = Array.isArray(currentFriends) ? currentFriends : (currentFriends.friends || []);
            
            if (friendsList.length > 0) {
              setIsCheckingFriends(true);
              let completedChecks = 0;
              
              friendsList.forEach((friend: Friend, index: number) => {
                setTimeout(() => {
                  checkFriendStatus(friend).finally(() => {
                    completedChecks++;
                    if (completedChecks >= friendsList.length) {
                      setIsCheckingFriends(false);
                    }
                  });
                }, index * 1000);
              });
            }
          }
        }, 1000);
      });

      statusPeer.on('error', (error) => {
        console.log('⚠️ Status peer error (isolated):', error.type);
        initializingRef.current = false;
        if (statusPeerRef.current === statusPeer) {
          statusPeerRef.current = null;
          // 错误后立即重试，不等待
          setTimeout(() => {
            initializeStatusPeer();
          }, 2000);
        }
      });

      statusPeer.on('disconnected', () => {
        console.log('🔌 Status peer disconnected, will retry...');
        initializingRef.current = false;
        if (statusPeerRef.current === statusPeer) {
          statusPeerRef.current = null;
          // 断开后快速重连
          setTimeout(() => {
            initializeStatusPeer();
          }, 3000);
        }
      });

    } catch (error) {
      console.log('Failed to initialize status peer:', error);
      initializingRef.current = false;
    }
  }, [currentPeerId]);

  // Lightweight friend status check using quick ping
  const checkFriendStatus = useCallback(async (friend: Friend): Promise<void> => {
    if (!statusPeerRef.current || !statusPeerRef.current.open || pendingChecks.current.has(friend.peerId)) {
      return;
    }

    pendingChecks.current.add(friend.peerId);

    const updateStatus = (isOnline: boolean) => {
      // 更新缓存
      statusCache.current.set(friend.peerId, {
        isOnline,
        lastCheck: Date.now()
      });
      
      setFriends(prev =>
        prev.map(f =>
          f.peerId === friend.peerId
            ? { ...f, isOnline, lastSeen: isOnline ? Date.now() : f.lastSeen }
            : f
        )
      );
      pendingChecks.current.delete(friend.peerId);
    };

    // 检查缓存，避免频繁检测
    const cached = statusCache.current.get(friend.peerId);
    const cacheTimeout = 30000; // 30秒缓存
    if (cached && Date.now() - cached.lastCheck < cacheTimeout) {
      console.log(`💾 Using cached status for ${friend.username}: ${cached.isOnline ? 'online' : 'offline'}`);
      pendingChecks.current.delete(friend.peerId);
      return;
    }

    try {
      console.log(`🏓 Quick ping test for ${friend.username} (${friend.peerId})`);
      
      // 轻量级ping测试
      const conn = statusPeerRef.current.connect(friend.peerId, {
        reliable: false,
        metadata: { type: 'ping' }
      });

      let completed = false;
      const cleanup = () => {
        if (!completed) {
          completed = true;
          try { conn.close(); } catch (e) {}
        }
      };

      // 缩短超时时间到1.5秒
      const timeout = setTimeout(() => {
        cleanup();
        updateStatus(false);
        console.log(`❌ ${friend.username} ping timeout - offline`);
      }, 1500);

      conn.on('open', () => {
        clearTimeout(timeout);
        cleanup();
        updateStatus(true);
        console.log(`✅ ${friend.username} ping success - online`);
      });

      conn.on('error', (error) => {
        clearTimeout(timeout);
        cleanup();
        updateStatus(false);
        console.log(`❌ ${friend.username} ping error - offline:`, error.type);
      });

    } catch (error) {
      updateStatus(false);
      console.log(`❌ ${friend.username} ping failed:`, error);
    }
  }, []);

  // Check all friends status
  const checkAllFriendsStatus = useCallback(() => {
    // 如果状态检测Peer不就绪，尝试重新初始化
    if (!statusPeerRef.current || !statusPeerRef.current.open) {
      console.log('🔍 Status peer not ready, attempting to initialize...');
      
      // 尝试重新初始化状态检测Peer
      if (!initializingRef.current) {
        initializeStatusPeer().then(() => {
          // 初始化成功后再次尝试检查
          setTimeout(() => {
            if (statusPeerRef.current && statusPeerRef.current.open) {
              checkAllFriendsStatus();
            }
          }, 2000);
        });
      }
      return;
    }

    // Get fresh friends list from state
    const currentFriends = friends.length > 0 ? friends : (() => {
      try {
        const stored = localStorage.getItem(`meshchat_friends_${currentPeerId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return Array.isArray(parsed) ? parsed : (parsed.friends || []);
        }
      } catch (e) {}
      return [];
    })();

    if (currentFriends.length === 0) {
      console.log('🔍 No friends to check');
      return;
    }

    console.log('🔍 Starting lightweight status check for', currentFriends.length, 'friends');
    setIsCheckingFriends(true);
    let completedChecks = 0;

    // 批量检测优化：按组处理，减少并发连接
    const batchSize = 3; // 每批最多3个
    const batches = [];
    for (let i = 0; i < currentFriends.length; i += batchSize) {
      batches.push(currentFriends.slice(i, i + batchSize));
    }

    batches.forEach((batch, batchIndex) => {
      setTimeout(() => {
        batch.forEach((friend, friendIndex) => {
          setTimeout(() => {
            checkFriendStatus(friend).finally(() => {
              completedChecks++;
              if (completedChecks >= currentFriends.length) {
                setIsCheckingFriends(false);
                console.log('✅ Lightweight status check completed');
              }
            });
          }, friendIndex * 300); // 批内间隔300ms
        });
      }, batchIndex * 1500); // 批间间隔1.5秒
    });
  }, [friends, checkFriendStatus, currentPeerId, initializeStatusPeer]);

  // Initialize status peer on mount
  useEffect(() => {
    initializeStatusPeer();
    
    return () => {
      console.log('🧹 Cleaning up status peer resources');
      initializingRef.current = false;
      
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
      
      if (statusPeerRef.current && !statusPeerRef.current.destroyed) {
        try {
          statusPeerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying status peer:', error);
        } finally {
          statusPeerRef.current = null;
        }
      }
      
      pendingChecks.current.clear();
      statusCache.current.clear();
    };
  }, [initializeStatusPeer]);

  // Start periodic checking when status peer is ready
  useEffect(() => {
    if (statusPeerRef.current && statusPeerRef.current.open && friends.length > 0) {
      console.log('🔄 Setting up periodic status checks');
      
      const initialTimeout = setTimeout(() => {
        checkAllFriendsStatus();
      }, 5000); // Reduced initial delay
      
      statusCheckInterval.current = setInterval(() => {
        checkAllFriendsStatus();
      }, 180000); // 3 minutes (reduced frequency)

      return () => {
        clearTimeout(initialTimeout);
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
          statusCheckInterval.current = null;
        }
      };
    }
  }, [statusPeerRef.current?.open, friends.length, checkAllFriendsStatus]);

  // Trigger status check when peer becomes ready
  useEffect(() => {
    if (statusPeerRef.current && statusPeerRef.current.open && friends.length > 0) {
      console.log('🚀 Status peer ready, triggering initial check');
      setTimeout(() => checkAllFriendsStatus(), 2000);
    }
  }, [statusPeerRef.current?.open, checkAllFriendsStatus]);

  // Handle auto-add friend events
  useEffect(() => {
    const handleAutoAddFriend = (event: any) => {
      const { peerId, username } = event.detail;
      
      setFriends(prev => {
        const exists = prev.some(f => f.peerId === peerId);
        if (!exists) {
          const newFriend: Friend = {
            peerId,
            username,
            addedTime: Date.now(),
            lastSeen: Date.now(),
            isOnline: true
          };
          return [...prev, newFriend];
        }
        return prev;
      });
    };

    window.addEventListener('autoAddFriend', handleAutoAddFriend);
    return () => {
      window.removeEventListener('autoAddFriend', handleAutoAddFriend);
    };
  }, []);



  return { 
    friends, 
    setFriends, 
    isCheckingFriends,
    onlineFriendsCount: friends.filter(f => f.isOnline).length,
    refreshFriendsStatus: checkAllFriendsStatus
  };
};