import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMeshNetwork } from '../hooks/useMeshNetwork';
import { useSimpleCall } from '../hooks/useSimpleCall';
import { useIndependentFriendsStatus } from '../hooks/useIndependentFriendsStatus';
import { useRoomSystem } from '../hooks/useRoomSystem';
import { useFriendChat } from '../hooks/useFriendChat';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { applyPreset } from '../utils/friendsConfig';
import { FriendsList } from './FriendsList';
import { RoomPanel } from './RoomPanel';

import { SimpleCallInterface } from './SimpleCallInterface';
import { BackupModal } from './BackupModal';
import { SettingsModal } from './SettingsModal';
import { DebugPanel } from './DebugPanel';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { FriendsStatusIndicator } from './FriendsStatusIndicator';
import { FileTransferModal } from './FileTransferModal';
import { FileSendButton } from './FileSendButton';
import { FileMessage } from './FileMessage';
import { CallHistoryModal } from './CallHistoryModal';
import { DonationModal } from './DonationModal';

import { Identity, Message, RoomMessage } from '../types';
import { WakeLockManager } from '../utils/wakeLock';

interface MeshChatProps {
  identity: Identity;
  onLogout: () => void;
}

export const MeshChat: React.FC<MeshChatProps> = ({ identity, onLogout }) => {
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'rooms' | 'chat'>('friends');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const [chatInputValue, setChatInputValue] = useState('');
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [roomInputValue, setRoomInputValue] = useState('');
  const roomInputRef = useRef<HTMLTextAreaElement>(null);
  
  // 初始化网络配置 - 使用中等频率减少通讯量
  useEffect(() => {
    const savedPreference = localStorage.getItem('meshchat_network_frequency') || 'MEDIUM_FREQUENCY';
    applyPreset(savedPreference as any);
    console.log('🌐 Network frequency initialized:', savedPreference);
  }, []);
  
  const { 
    isReady, 
    isVisible, 
    isOnline,
    connectionStatus,
    attemptReconnect,
    getCacheStats,
    peerInstance
  } = useMeshNetwork(identity.username, identity.peerId);

  const {
    currentRoom,
    roomMessages,
    createRoom,
    inviteFriendToRoom,
    sendRoomMessage,
    leaveRoom
  } = useRoomSystem(identity.username, identity.peerId, peerInstance);

  const { friends, setFriends, onlineFriendsCount, isCheckingFriends, refreshFriendsStatus } = useIndependentFriendsStatus(identity.peerId);

  // 文件传输功能
  const {
    transfers,
    incomingRequests,
    isTransferModalOpen,
    setIsTransferModalOpen,
    sendFile,
    acceptFileTransfer,
    rejectFileTransfer,
    cancelFileTransfer,
    registerConnection,
    getActiveTransfers,
    getCompletedTransfers,
    formatFileSize,
    formatTransferSpeed,
    estimateRemainingTime
  } = useFileTransfer(peerInstance, identity.username);

  const {
    currentChat,
    startChat,
    sendMessage: sendFriendMessage,
    sendFileNotification,
    closeChat,
    setCurrentChatPeerId
  } = useFriendChat(identity.username, peerInstance, registerConnection);

  // Create friends map for media call (memoized)
  const friendsMap = useMemo(() => 
    new Map(friends.map(f => [f.peerId, { 
      peerId: f.peerId, 
      username: f.username, 
      isAlive: f.isOnline 
    }])), [friends]
  );

  const {
    callState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    switchCamera,
    formatDuration
  } = useSimpleCall(peerInstance);



  const cacheStats = getCacheStats();

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.log('Fullscreen not supported, using layout fullscreen');
      setIsFullscreen(!isFullscreen);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);



  // Handle incoming friend requests
  useEffect(() => {
    if (peerInstance) {
      const handleConnection = (conn: any) => {
        conn.on('data', (data: any) => {
          if (data.type === 'friend_added') {
            console.log('📨 Received friend request from:', data.fromUsername);
            
            // Check if friend already exists
            const exists = friends.some(f => f.peerId === data.fromPeerId);
            if (!exists) {
              // Auto-add the friend
              window.dispatchEvent(new CustomEvent('autoAddFriend', {
                detail: {
                  peerId: data.fromPeerId,
                  username: data.fromUsername
                }
              }));
            }
          } else if (data.type === 'friend_added_back') {
            console.log('✅ Friend confirmed mutual addition:', data.fromUsername);
            // 可以在这里显示通知或更新状态
          }
        });
      };
      
      peerInstance.on('connection', handleConnection);
      
      return () => {
        peerInstance.off('connection', handleConnection);
      };
    }
  }, [peerInstance]);



  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && currentRoom) {
      sendRoomMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleSendFriendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && currentChat) {
      sendFriendMessage(currentChat.peerId, newMessage);
      setNewMessage('');
    }
  };

  const handleStartCallWithFriend = (friendPeerId: string, isVideo: boolean = false) => {
    startCall(friendPeerId, isVideo);
  };

  const getCallerName = (peerId: string) => {
    const friend = friends.find(f => f.peerId === peerId);
    return friend?.username || 'Unknown';
  };

  const handleSendChatMessage = () => {
    if (!chatInputValue.trim()) {
      return;
    }
    
    if (!currentChat) {
      console.warn('No active chat');
      return;
    }
    
    if (!currentChat.isConnected) {
      alert('Friend is offline. Message cannot be sent.');
      return;
    }
    
    const success = sendFriendMessage(currentChat.peerId, chatInputValue.trim());
    if (success) {
      setChatInputValue('');
    } else {
      alert('Failed to send message. Please check your connection.');
    }
  };

  const handleChatInputKeydown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const handleSendRoomMessage = () => {
    if (roomInputValue.trim() && currentRoom) {
      sendRoomMessage(roomInputValue.trim());
      setRoomInputValue('');
    }
  };

  const handleRoomInputKeydown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendRoomMessage();
    }
  };

  const handleFileSelect = async (file: File, isRoom: boolean = false) => {
    const targetPeerId = isRoom ? null : currentChat?.peerId;

    if (!targetPeerId && !isRoom) {
      alert('Please select a friend to send the file to.');
      return;
    }

    if (isRoom && currentRoom) {
      // This is a placeholder for room file sending logic
      console.log(`Attempting to send file ${file.name} to room ${currentRoom.roomName}`);
      alert('File sending in rooms is not yet implemented.');
      // Example: await sendFileToRoom(file, currentRoom.roomId);
      return;
    }
    
    if (targetPeerId) {
      try {
        const transferId = await sendFile(file, targetPeerId);
        sendFileNotification(targetPeerId, file.name, file.size, transferId);
        console.log(`📤 Started sending file: ${file.name} to ${targetPeerId}`);
      } catch (error) {
        console.error('Failed to send file:', error);
        alert(`Failed to send file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const renderMessageContent = (msg: Message | RoomMessage) => {
    if (msg.type === 'file' && msg.transferId) {
      return <FileMessage transferId={msg.transferId} isSender={msg.isLocal} />;
    }
    return <p>{msg.content}</p>;
  };

  // 监听浏览器全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 屏幕唤醒管理
  useEffect(() => {
    const shouldKeepAwake = currentChat?.isConnected || callState.isInCall;
    
    if (shouldKeepAwake && !WakeLockManager.isActive()) {
      WakeLockManager.requestWakeLock(callState.isInCall ? 'call' : 'chat');
    } else if (!shouldKeepAwake && WakeLockManager.isActive()) {
      WakeLockManager.releaseWakeLock();
    }
  }, [currentChat?.isConnected, callState.isInCall]);

  // 页面可见性变化处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      WakeLockManager.handleVisibilityChange();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 组件卸载时释放唤醒锁
  useEffect(() => {
    return () => {
      WakeLockManager.releaseWakeLock();
    };
  }, []);


  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-slate-900">
      {/* Sidebar */}
      <aside className={`${isFullscreen ? 'hidden' : 'w-full md:w-64 lg:w-72'} bg-slate-800 p-4 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col`}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-sky-400 mb-3">MUVOV Mesh Chat</h1>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="text-slate-400 hover:text-slate-300 text-sm relative"
              title="File Transfers"
            >
              📁
              {(incomingRequests.length > 0 || getActiveTransfers().length > 0) && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {incomingRequests.length + getActiveTransfers().length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCallHistory(true)}
              className="text-slate-400 hover:text-slate-300 text-sm"
              title="Call History"
            >
              📞
            </button>
            <button
              onClick={() => setShowDebugPanel(true)}
              className="text-slate-400 hover:text-slate-300 text-sm"
              title="Debug Panel"
            >
              🔧
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-slate-400 hover:text-slate-300 text-sm"
              title="Settings"
            >
              ⚙️
            </button>
            <button
              onClick={() => setShowBackupModal(true)}
              className="text-slate-400 hover:text-slate-300 text-sm"
              title="Backup & Restore"
            >
              💾
            </button>
            <button
              onClick={() => setShowDonationModal(true)}
              className="text-slate-400 hover:text-slate-300 text-sm"
              title="Support Project"
            >
              💝
            </button>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              Logout
            </button>
          </div>
          <p className="text-sm text-slate-400">Welcome, <span className="font-semibold">{identity.username}</span></p>
          
          {/* Connection Status */}
          <div className="mt-2 space-y-2">
            <ConnectionStatusIndicator
              isReady={isReady}
              connectionStatus={connectionStatus}
              isOnline={isOnline}
              onReconnect={attemptReconnect}
            />
            <FriendsStatusIndicator
              totalFriends={friends.length}
              onlineFriends={onlineFriendsCount}
              isChecking={isCheckingFriends}
              onRefresh={refreshFriendsStatus}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-3">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-l ${
              activeTab === 'friends' 
                ? 'bg-sky-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-r ${
              activeTab === 'rooms' 
                ? 'bg-sky-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Rooms
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1">
          {activeTab === 'friends' && (
            <FriendsList 
              currentIdentity={identity}
              peerInstance={peerInstance}
              friends={friends}
              setFriends={setFriends}
              onStartAudioCall={(peerId) => handleStartCallWithFriend(peerId, false)}
              onStartVideoCall={(peerId) => handleStartCallWithFriend(peerId, true)}
              onStartChat={(peerId, username) => {
                startChat(peerId, username);
              }}
            />
          )}
          
          {activeTab === 'rooms' && (
            <RoomPanel
              currentRoom={currentRoom}
              friends={friends}
              onCreateRoom={createRoom}
              onInviteFriend={inviteFriendToRoom}
              onLeaveRoom={leaveRoom}
            />
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-slate-900">
        {currentChat ? (
          // Friend Chat View
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{currentChat.username}</h2>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${currentChat.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-slate-400">{currentChat.isConnected ? 'Secure Chat Connected' : 'Secure Chat Disconnected'}</span>
                <button
                  onClick={toggleFullscreen}
                  className="text-slate-400 hover:text-slate-300 text-lg"
                  title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen (F11)'}
                >
                  {isFullscreen ? '🗗' : '🗖'}
                </button>
                <button
                  onClick={() => {
                    closeChat(currentChat.peerId);
                    if (isFullscreen) {
                      setIsFullscreen(false);
                    }
                  }}
                  className="text-slate-400 hover:text-slate-300 text-xl"
                  title="Close Chat"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Message List */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <div className="space-y-4">
                {currentChat.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isLocal ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-2 rounded-lg max-w-xs md:max-w-md lg:max-w-lg ${msg.isLocal ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                      {renderMessageContent(msg)}
                      <div className="text-xs text-slate-400 mt-1 text-right flex items-center justify-end gap-1">
                        <span>{new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString()}</span>
                        {msg.isLocal && (
                          <span className="text-xs">
                            {msg.status === 'sending' && '⏳'}
                            {msg.status === 'delivered' && '✓'}
                            {msg.status === 'failed' && '❌'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 pb-safe border-t border-slate-700" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <div className="relative">
                <textarea
                  ref={chatInputRef}
                  value={chatInputValue}
                  onChange={(e) => setChatInputValue(e.target.value)}
                  onKeyDown={handleChatInputKeydown}
                  onFocus={() => {
                    // 移动端优化：输入框获得焦点时滚动到可视区域
                    setTimeout(() => {
                      chatInputRef.current?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                      });
                    }, 300);
                  }}
                  placeholder="Type a message..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 pr-24 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={1}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  <FileSendButton onFileSelect={handleFileSelect} />
                  <button
                    onClick={handleSendChatMessage}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg ml-2"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : currentRoom ? (
          // Room Chat View
          <div className="flex-1 flex flex-col">
            {/* Room Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Room: {currentRoom.roomName}</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{currentRoom.members.size} members</span>
                <button
                  onClick={toggleFullscreen}
                  className="text-slate-400 hover:text-slate-300 text-lg"
                  title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen (F11)'}
                >
                  {isFullscreen ? '🗗' : '🗖'}
                </button>
                <button
                  onClick={() => {
                    leaveRoom();
                    if (isFullscreen) {
                      setIsFullscreen(false);
                    }
                  }}
                  className="text-slate-400 hover:text-slate-300 text-xl"
                  title="Leave Room"
                >
                  &times;
                </button>
              </div>
            </div>
        
            {/* Room Message List */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <div className="space-y-4">
                {roomMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isLocal ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-2 rounded-lg max-w-xs md:max-w-md lg:max-w-lg ${msg.isLocal ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                      <div className="text-sm font-bold text-slate-400">{getCallerName(msg.sender)}</div>
                      {renderMessageContent(msg)}
                      <div className="text-xs text-slate-400 mt-1 text-right">
                        {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        
            {/* Room Message Input */}
            <div className="p-4 pb-safe border-t border-slate-700" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <div className="relative">
                <textarea
                  ref={roomInputRef}
                  value={roomInputValue}
                  onChange={(e) => setRoomInputValue(e.target.value)}
                  onKeyDown={handleRoomInputKeydown}
                  onFocus={() => {
                    // 移动端优化：输入框获得焦点时滚动到可视区域
                    setTimeout(() => {
                      roomInputRef.current?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                      });
                    }, 300);
                  }}
                  placeholder="Type a message in the room..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 pr-24 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={1}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  <FileSendButton onFileSelect={(file) => handleFileSelect(file, true)} />
                  <button
                    onClick={handleSendRoomMessage}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg ml-2"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Welcome / No Chat Selected View
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Mesh Chat</h2>
              <p>Select a friend from the list to start a conversation.</p>
            </div>
          </div>
        )}
      </main>
      
      {/* Simple Call Interface */}
      <SimpleCallInterface
        callState={callState}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEndCall={endCall}
        onSwitchCamera={switchCamera}
        getCallerName={getCallerName}
        formatDuration={formatDuration}
      />

      {/* File Transfer Modal */}
      <FileTransferModal
        isVisible={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        incomingRequests={incomingRequests}
        activeTransfers={getActiveTransfers()}
        completedTransfers={getCompletedTransfers()}
        onAcceptTransfer={acceptFileTransfer}
        onRejectTransfer={rejectFileTransfer}
        onCancelTransfer={cancelFileTransfer}
        formatFileSize={formatFileSize}
        formatTransferSpeed={formatTransferSpeed}
        estimateRemainingTime={estimateRemainingTime}
      />
      
      {/* Backup Modal */}
      <BackupModal
        isVisible={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onRestoreComplete={() => {
          // Refresh the page after restore
          window.location.reload();
        }}
      />
      
      {/* Settings Modal */}
      <SettingsModal
        isVisible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSettingsChanged={() => {
          // This is a placeholder. In a real app, you might want to
          // re-initialize the peer connection or show a notification.
          console.log('Settings have been changed. A restart may be required.');
        }}
      />

      {/* Debug Panel */}
      <DebugPanel
        isVisible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
      
      {/* Call History Modal */}
      <CallHistoryModal
        isVisible={showCallHistory}
        onClose={() => setShowCallHistory(false)}
      />
      
      {/* Donation Modal */}
      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
      />
    </div>
  );
};