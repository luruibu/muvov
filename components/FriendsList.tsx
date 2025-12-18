import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeModal } from './QRCodeModal';
import { Friend, Identity } from '../types';
import { InputSanitizer } from '../utils/sanitizer';

interface FriendsListProps {
  currentIdentity: Identity;
  peerInstance: any;
  friends: Friend[];
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
  onStartAudioCall: (peerId: string) => void;
  onStartVideoCall: (peerId: string) => void;
  onStartChat?: (peerId: string, username: string) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({ 
  currentIdentity, 
  peerInstance,
  friends,
  setFriends,
  onStartAudioCall,
  onStartVideoCall,
  onStartChat
}) => {
  const [newFriendId, setNewFriendId] = useState('');
  const [newFriendName, setNewFriendName] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrMode, setQrMode] = useState<'generate' | 'scan'>('generate');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [lastMessageUpdate, setLastMessageUpdate] = useState(0);
  const [showAddFriend, setShowAddFriend] = useState(false);

  // Get last message for a friend
  const getLastMessage = useCallback((peerId: string) => {
    try {
      const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      const friendChat = chatHistory.find((h: any) => h.peerId === peerId);
      if (friendChat && friendChat.messages && friendChat.messages.length > 0) {
        const lastMsg = friendChat.messages[friendChat.messages.length - 1];
        return {
          content: lastMsg.content || '',
          isLocal: lastMsg.isLocal || false,
          timestamp: lastMsg.timestamp || 0
        };
      }
    } catch (error) {
      console.warn('Failed to get last message:', error);
    }
    return null;
  }, [lastMessageUpdate]);

  // Update current time every minute for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleAutoAddFriend = (event: any) => {
      const { peerId, username } = event.detail;
      
      setFriends(prevFriends => {
        // 检查是否已存在
        const exists = prevFriends.some(f => f.peerId === peerId);
        if (exists) {
          return prevFriends; // 不更新
        }
        
        console.log('🤝 Auto-adding friend:', username);
        const newFriend: Friend = {
          peerId,
          username,
          addedTime: Date.now(),
          lastSeen: Date.now(),
          isOnline: true,
        };
        
        // 反向通知对方已成功添加
        if (peerInstance && peerInstance.open) {
          try {
            const conn = peerInstance.connect(peerId);
            conn.on('open', () => {
              conn.send({
                type: 'friend_added_back',
                fromPeerId: currentIdentity.peerId,
                fromUsername: currentIdentity.username,
                timestamp: Date.now()
              });
              setTimeout(() => conn.close(), 1000);
            });
          } catch (error) {
            console.warn('Failed to send add-back notification:', error);
          }
        }
        
        return [...prevFriends, newFriend];
      });
    };

    window.addEventListener('autoAddFriend', handleAutoAddFriend);
    return () => {
      window.removeEventListener('autoAddFriend', handleAutoAddFriend);
    };
  }, [peerInstance, currentIdentity]);

  // Listen for chat history updates
  useEffect(() => {
    const handleChatHistoryUpdate = () => {
      setLastMessageUpdate(Date.now());
    };

    window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
    return () => {
      window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdate);
    };
  }, []); // 移除 friends 和 setFriends 依赖

  const addFriend = async () => {
    if (!newFriendId.trim() || !newFriendName.trim()) {
      setError('Please enter both Peer ID and username');
      return;
    }

    const friendId = newFriendId.trim();
    const friendName = newFriendName.trim();

    if (friendId === currentIdentity.peerId) {
      setError('Cannot add yourself as friend');
      return;
    }

    // 放宽验证规则
    if (!InputSanitizer.isValidPeerId(friendId)) {
      setError('Invalid Peer ID format. Please check and try again.');
      return;
    }

    const exists = friends.some(f => f.peerId === friendId);
    if (exists) {
      setError('Friend already exists');
      return;
    }

    // 显示加载状态
    setError('');
    setNotification('Adding friend...');

    const newFriend: Friend = {
      peerId: friendId,
      username: friendName,
      addedTime: Date.now(),
      lastSeen: Date.now(), // 设置为当前时间而不是0
      isOnline: false
    };

    setFriends([...friends, newFriend]);
    setNewFriendId('');
    setNewFriendName('');
    
    // 立即检查好友状态
    try {
      // 状态检测由独立的hook自动处理
      console.log(`✅ Added friend: ${newFriend.username}, status will be checked automatically`);
      
      setNotification('Friend added successfully!');
      
      // 通知对方
      if (peerInstance && peerInstance.open) {
        try {
          const conn = peerInstance.connect(friendId, {
            metadata: { type: 'friend_request' }
          });
          
          const timeout = setTimeout(() => {
            conn.close();
            console.log('Friend notification timeout');
          }, 5000);
          
          conn.on('open', () => {
            clearTimeout(timeout);
            conn.send({
              type: 'friend_added',
              fromPeerId: currentIdentity.peerId,
              fromUsername: currentIdentity.username,
              timestamp: Date.now()
            });
            
            setTimeout(() => conn.close(), 1000);
            setNotification('Friend added and notified successfully!');
          });

          conn.on('error', (err) => {
            clearTimeout(timeout);
            console.warn('Failed to notify friend:', err);
            setNotification('Friend added, but they may need to add you back manually.');
          });
        } catch (error) {
          console.warn('Failed to connect for notification:', error);
          setNotification('Friend added, but notification failed. They may need to add you back.');
        }
      } else {
        setNotification('Friend added, but you\'re offline. Notification will be sent when connected.');
      }
      
      // 清除通知
      setTimeout(() => setNotification(''), 3000);
      
    } catch (error) {
      console.error('Failed to check friend status:', error);
      setNotification('Friend added, but status check failed.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const removeFriend = (peerId: string) => {
    const updatedFriends = friends.filter(f => f.peerId !== peerId);
    setFriends(updatedFriends);
  };

  const handleQRScanned = async (peerId: string, username: string) => {
    if (peerId === currentIdentity.peerId) {
      setError('Cannot add yourself as friend');
      return;
    }

    const exists = friends.some(f => f.peerId === peerId);
    if (exists) {
      setError('Friend already exists');
      return;
    }

    setError('');
    setNotification('Adding friend from QR code...');

    const newFriend: Friend = {
      peerId,
      username,
      addedTime: Date.now(),
      lastSeen: Date.now(), // QR码扫描添加的好友也设置为当前时间
      isOnline: false
    };

    setFriends([...friends, newFriend]);
    
    try {
      setNotification('Friend added successfully via QR code!');
      
      // 通知对方
      if (peerInstance && peerInstance.open) {
        try {
          const conn = peerInstance.connect(peerId, {
            metadata: { type: 'friend_request' }
          });
          
          const timeout = setTimeout(() => {
            conn.close();
          }, 5000);
          
          conn.on('open', () => {
            clearTimeout(timeout);
            conn.send({
              type: 'friend_added',
              fromPeerId: currentIdentity.peerId,
              fromUsername: currentIdentity.username,
              timestamp: Date.now()
            });
            
            setTimeout(() => conn.close(), 1000);
            setNotification('QR friend added and notified successfully!');
          });

          conn.on('error', (err) => {
            clearTimeout(timeout);
            console.warn('Failed to notify QR friend:', err);
            setNotification('QR friend added, but notification failed.');
          });
        } catch (error) {
          console.warn('Failed to connect to QR friend:', error);
          setNotification('QR friend added, but they may need to add you back.');
        }
      }
      
      setTimeout(() => setNotification(''), 3000);
      
    } catch (error) {
      console.error('Failed to process QR friend:', error);
      setNotification('QR friend added, but status check failed.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const formatLastSeen = (timestamp: number) => {
    if (timestamp === 0) return 'Never seen';
    const diff = currentTime - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-4">
      {/* Add Friend - Collapsed */}
      <div className="mb-3">
        <button
          onClick={() => setShowAddFriend(!showAddFriend)}
          className="w-full flex items-center justify-between p-2 bg-slate-700 hover:bg-slate-600 rounded-sm text-xs text-slate-300"
        >
          <span>➕ Add Friend</span>
          <span>{showAddFriend ? '▼' : '▶'}</span>
        </button>
        
        {showAddFriend && (
          <div className="mt-2 space-y-2 p-2 bg-slate-750 rounded-sm">
            {/* QR Code Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setQrMode('generate');
                  setShowQRModal(true);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-sm text-xs flex items-center justify-center gap-1"
              >
                📱 My QR Code
              </button>
              <button
                onClick={() => {
                  setQrMode('scan');
                  setShowQRModal(true);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 px-3 rounded-sm text-xs flex items-center justify-center gap-1"
              >
                📷 Scan QR Code
              </button>
            </div>
            
            {/* Manual Add Form */}
            <div className="flex gap-1">
              <input
                type="text"
                value={newFriendId}
                onChange={(e) => {
                  setNewFriendId(e.target.value);
                  setError('');
                }}
                placeholder="Peer ID"
                className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded-sm text-slate-100 text-xs"
              />
              <input
                type="text"
                value={newFriendName}
                onChange={(e) => {
                  setNewFriendName(e.target.value);
                  setError('');
                }}
                placeholder="Username"
                className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded-sm text-slate-100 text-xs"
              />
            </div>
            {error && (
              <div className="text-red-400 text-xs">{error}</div>
            )}
            {notification && (
              <div className="text-yellow-400 text-xs">{notification}</div>
            )}
            <button
              onClick={addFriend}
              className="w-full bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded-sm text-xs"
            >
              Add Friend
            </button>
          </div>
        )}
      </div>

      {/* Friends List */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Friends ({friends.length})
        </h3>
        {friends.length > 0 ? (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div key={friend.peerId} className="flex items-center gap-2 p-2 bg-slate-700 rounded-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      friend.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-slate-100 text-sm font-medium">
                      {friend.username}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs">
                    {(() => {
                      const lastMsg = getLastMessage(friend.peerId);
                      if (lastMsg) {
                        const prefix = lastMsg.isLocal ? 'You: ' : `${friend.username}: `;
                        const content = lastMsg.content.length > 30 
                          ? lastMsg.content.substring(0, 30) + '...' 
                          : lastMsg.content;
                        return `${prefix}${content}`;
                      }
                      return formatLastSeen(friend.lastSeen);
                    })()}
                  </div>
                </div>

                <button
                  onClick={() => onStartChat && onStartChat(friend.peerId, friend.username)}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded-sm text-xs"
                  title="Send message"
                >
                  💬
                </button>
                <button
                  onClick={() => onStartAudioCall(friend.peerId)}
                  disabled={!peerInstance || !peerInstance.open}
                  className={`px-2 py-1 rounded text-xs ${
                    peerInstance && peerInstance.open
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  title={peerInstance && peerInstance.open ? "Audio call" : "Connection not ready"}
                >
                  🎤
                </button>
                <button
                  onClick={() => onStartVideoCall(friend.peerId)}
                  disabled={!peerInstance || !peerInstance.open}
                  className={`px-2 py-1 rounded text-xs ${
                    peerInstance && peerInstance.open
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  title={peerInstance && peerInstance.open ? "Video call" : "Connection not ready"}
                >
                  📹
                </button>
                <button
                  onClick={() => removeFriend(friend.peerId)}
                  className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded-sm text-xs"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-400 text-center py-4 text-sm">
            No friends added yet
          </div>
        )}
      </div>
      
      <QRCodeModal
        isVisible={showQRModal}
        mode={qrMode}
        identity={currentIdentity}
        onClose={() => setShowQRModal(false)}
        onFriendScanned={handleQRScanned}
      />
    </div>
  );
};