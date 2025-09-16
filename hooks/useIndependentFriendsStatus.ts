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
    if (statusPeerRef.current) return;

    try {
      const statusPeerId = `status_${currentPeerId}_${Date.now()}`;
      const peerConfig = await PeerServerManager.getOptimalPeerConfig();
      
      console.log('🔍 Initializing independent status peer:', statusPeerId);
      
      const statusPeer = new Peer(statusPeerId, peerConfig);
      
      statusPeer.on('open', () => {
        console.log('✅ Status peer connected:', statusPeerId);
        statusPeerRef.current = statusPeer;
      });

      statusPeer.on('error', (error) => {
        console.log('⚠️ Status peer error (isolated):', error.type);
      });

      statusPeer.on('disconnected', () => {
        console.log('🔌 Status peer disconnected, will retry...');
        setTimeout(() => {
          if (statusPeerRef.current === statusPeer) {
            statusPeerRef.current = null;
            initializeStatusPeer();
          }
        }, 10000);
      });

    } catch (error) {
      console.log('Failed to initialize status peer:', error);
    }
  }, [currentPeerId]);

  // Check single friend status using independent peer
  const checkFriendStatus = useCallback(async (friend: Friend): Promise<void> => {
    if (!statusPeerRef.current || !statusPeerRef.current.open || pendingChecks.current.has(friend.peerId)) {
      return;
    }

    pendingChecks.current.add(friend.peerId);

    const updateStatus = (isOnline: boolean) => {
      setFriends(prev =>
        prev.map(f =>
          f.peerId === friend.peerId
            ? { ...f, isOnline, lastSeen: isOnline ? Date.now() : f.lastSeen }
            : f
        )
      );
      pendingChecks.current.delete(friend.peerId);
    };

    try {
      const conn = statusPeerRef.current.connect(friend.peerId, {
        reliable: false,
        metadata: { type: 'status_check' }
      });

      let completed = false;
      const cleanup = () => {
        if (!completed) {
          completed = true;
          try { conn.close(); } catch (e) {}
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        updateStatus(false);
      }, 3000);

      conn.on('open', () => {
        clearTimeout(timeout);
        cleanup();
        updateStatus(true);
      });

      conn.on('error', () => {
        clearTimeout(timeout);
        cleanup();
        updateStatus(false);
      });

    } catch (error) {
      updateStatus(false);
    }
  }, []);

  // Check all friends status
  const checkAllFriendsStatus = useCallback(() => {
    if (!statusPeerRef.current || friends.length === 0) return;

    setIsCheckingFriends(true);
    let completedChecks = 0;

    friends.forEach((friend, index) => {
      setTimeout(() => {
        checkFriendStatus(friend).finally(() => {
          completedChecks++;
          if (completedChecks >= friends.length) {
            setIsCheckingFriends(false);
          }
        });
      }, index * 2000); // Stagger checks every 2 seconds
    });
  }, [friends, checkFriendStatus]);

  // Initialize status peer on mount
  useEffect(() => {
    initializeStatusPeer();
    
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (statusPeerRef.current) {
        statusPeerRef.current.destroy();
        statusPeerRef.current = null;
      }
    };
  }, [initializeStatusPeer]);

  // Start periodic checking when status peer is ready
  useEffect(() => {
    if (statusPeerRef.current && statusPeerRef.current.open && friends.length > 0) {
      const initialTimeout = setTimeout(() => {
        checkAllFriendsStatus();
      }, 15000);
      
      statusCheckInterval.current = setInterval(() => {
        checkAllFriendsStatus();
      }, 300000); // 5 minutes

      return () => {
        clearTimeout(initialTimeout);
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
      };
    }
  }, [statusPeerRef.current?.open, friends.length, checkAllFriendsStatus]);

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

  // Listen for external friend updates (from chat connections)
  useEffect(() => {
    const handleFriendUpdate = (event: any) => {
      const { peerId, isOnline, lastSeen } = event.detail;
      
      setFriends(prev =>
        prev.map(f => 
          f.peerId === peerId 
            ? { ...f, isOnline, lastSeen }
            : f
        )
      );
    };

    window.addEventListener('friendStatusUpdate', handleFriendUpdate);
    return () => {
      window.removeEventListener('friendStatusUpdate', handleFriendUpdate);
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