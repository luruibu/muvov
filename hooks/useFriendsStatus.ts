import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { Friend } from '../types';
import { FriendsConfig } from '../utils/friendsConfig';

// Helper function to load friends from storage, can be called outside of the hook.
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
    console.warn('Failed to load or parse friends from localStorage:', error);
  }
  return [];
};

export const useFriendsStatus = (
  currentPeerId: string,
  peer: Peer | null
) => {
  const [friends, setFriends] = useState<Friend[]>(() => {
    const key = `meshchat_friends_${currentPeerId}`;
    return loadFriendsFromStorage(key);
  });

  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const pendingChecks = useRef<Set<string>>(new Set());
  const pendingTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  const prevFriendsRef = useRef<Friend[]>([]);

  useEffect(() => {
    const newFriends = friends.filter(f => !prevFriendsRef.current.some(pf => pf.peerId === f.peerId));
    if (newFriends.length > 0) {
      newFriends.forEach(friend => {
        console.log(`New friend ${friend.username} detected, checking status.`);
        checkFriendStatus(friend);
      });
    }
    prevFriendsRef.current = friends;
  }, [friends]);

  const getFriendsKey = useCallback(() => `meshchat_friends_${currentPeerId}`, [currentPeerId]);

  // Save friends to localStorage whenever the friends state changes.
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

  // Check single friend status
  const checkFriendStatus = useCallback(async (friend: Friend) => {
    if (!peer || pendingChecks.current.has(friend.peerId)) {
      return;
    }

    pendingChecks.current.add(friend.peerId);

    const updateStatus = (isOnline: boolean, forceUpdateLastSeen = false) => {
      setFriends(prev =>
        prev.map(f =>
          f.peerId === friend.peerId
            ? { 
                ...f, 
                isOnline, 
                lastSeen: (isOnline || forceUpdateLastSeen) ? Date.now() : f.lastSeen 
              }
            : f
        )
      );
      pendingChecks.current.delete(friend.peerId);
    };

    try {
      const conn = peer.connect(friend.peerId, {
        reliable: false,
        metadata: { type: 'status_check' }
      });

      const timeout = setTimeout(() => {
        conn.close();
        updateStatus(false);
      }, FriendsConfig.CONNECTION_TIMEOUT);

      conn.on('open', () => {
        clearTimeout(timeout);
        console.log(`✅ Friend ${friend.username} is online, updating status`);
        updateStatus(true, true); // 强制更新lastSeen
        conn.close();
      });

      conn.on('error', () => {
        clearTimeout(timeout);
        updateStatus(false);
      });
    } catch (error) {
      console.log('Status check failed for:', friend.username, error);
      updateStatus(false);
    }
  }, [peer]);

  // Check all friends status
  const checkAllFriendsStatus = useCallback(() => {
    if (!peer || friends.length === 0) return;

    friends.forEach((friend, index) => {
      // Stagger checks to avoid overwhelming the network
      const timeoutId = setTimeout(() => {
        pendingTimeouts.current.delete(timeoutId);
        checkFriendStatus(friend);
      }, index * FriendsConfig.STAGGER_DELAY);
      
      // Store timeout for cleanup
      pendingTimeouts.current.add(timeoutId);
    });
  }, [friends, checkFriendStatus, peer]);

  // Start periodic status checking
  useEffect(() => {
    if (peer && friends.length > 0) {
      // Initial check after configured delay
      const initialTimeout = setTimeout(() => {
        checkAllFriendsStatus();
      }, FriendsConfig.INITIAL_CHECK_DELAY);

      // Periodic checks with configurable interval
      statusCheckInterval.current = setInterval(() => {
        checkAllFriendsStatus();
      }, FriendsConfig.STATUS_CHECK_INTERVAL);

      // Function to handle page visibility change
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('Page is visible, triggering status check.');
          checkAllFriendsStatus();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearTimeout(initialTimeout);
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [peer, friends.length, checkAllFriendsStatus]);

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

  // Listen for external friend updates
  useEffect(() => {
    const handleFriendUpdate = (event: any) => {
      const { peerId, isOnline, lastSeen } = event.detail;
      
      setFriends(prev => {
        const updated = prev.map(f => 
          f.peerId === peerId 
            ? { ...f, isOnline, lastSeen }
            : f
        );
        // Save updated friend status to localStorage
        const key = getFriendsKey();
        try {
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (error) {
          console.warn('Failed to save friend status to localStorage:', error);
        }
        return updated;
      });
    };

    window.addEventListener('friendStatusUpdate', handleFriendUpdate);
    return () => {
      window.removeEventListener('friendStatusUpdate', handleFriendUpdate);
    };
  }, [getFriendsKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
      pendingChecks.current.clear();
    };
  }, []);

  // Cleanup when peer or currentPeerId changes
  useEffect(() => {
    // Clear all pending checks when identity changes
    pendingChecks.current.clear();
    
    // Clear all pending timeouts
    pendingTimeouts.current.forEach(timeout => clearTimeout(timeout));
    pendingTimeouts.current.clear();
    
    // Clear interval when peer changes
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [peer]);

  return { friends, setFriends, checkFriendStatus, checkAllFriendsStatus };
};