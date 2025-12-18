import { useState, useRef, useCallback, useEffect } from 'react';
import type { DataConnection } from 'peerjs';
import { Message } from '../types';
import { MessageIntegrity } from '../utils/messageIntegrity';

interface FriendChat {
  peerId: string;
  username: string;
  messages: Message[];
  connection: DataConnection | null;
  isConnected: boolean;
}

export const useFriendChat = (localUsername: string, peer: any, onConnectionEstablished?: (peerId: string, connection: DataConnection) => void) => {
  const [activeChats, setActiveChats] = useState<Map<string, FriendChat>>(new Map());
  const [currentChatPeerId, setCurrentChatPeerId] = useState<string | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Add message to chat
  const addMessage = useCallback(async (peerId: string, content: string, sender: string, isLocal: boolean, messageId?: string, hash?: string) => {
    const message: Message = {
      id: messageId || MessageIntegrity.generateMessageId(),
      content,
      sender,
      timestamp: Date.now(),
      isLocal,
      type: 'text',
      hash,
      status: isLocal ? 'sending' : 'delivered'
    };

    setActiveChats(prev => {
      const updated = new Map(prev);
      const chat = updated.get(peerId);
      if (chat) {
        chat.messages = [...chat.messages, message];
        
        // Save to localStorage
        const chatHistory = {
          peerId,
          username: chat.username,
          messages: chat.messages.map(msg => ({
            ...msg,
            content: msg.type === 'file' ? msg.fileName || msg.content : msg.content
          }))
        };
        const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        const historyIndex = existingHistory.findIndex((h: any) => h.peerId === peerId);
        if (historyIndex >= 0) {
          existingHistory[historyIndex] = chatHistory;
        } else {
          existingHistory.push(chatHistory);
        }
        localStorage.setItem('chatHistory', JSON.stringify(existingHistory));
        
        // 触发好友列表更新事件
        window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
          detail: { peerId }
        }));
      }
      return updated;
    });
  }, []);

  // Add file message to chat
  const addFileMessage = useCallback((peerId: string, fileName: string, fileSize: number, transferId: string, sender: string, isLocal: boolean) => {
    const message: Message = {
      id: `file_${transferId}`,
      content: `${isLocal ? 'Sending' : 'Receiving'} file: ${fileName}`,
      sender,
      timestamp: Date.now(),
      isLocal,
      type: 'file',
      transferId,
      fileName,
      fileSize
    };

    setActiveChats(prev => {
      const updated = new Map(prev);
      const chat = updated.get(peerId);
      if (chat) {
        chat.messages = [...chat.messages, message];
      }
      return updated;
    });
  }, []);

  // Start chat with friend
  const startChat = useCallback((peerId: string, username: string) => {
    if (!peer) {
      console.warn('No peer instance available for chat');
      return;
    }

    // Check if chat already exists
    if (activeChats.has(peerId)) {
      setCurrentChatPeerId(peerId);
      return;
    }
    
    // Check if connection already exists
    if (connectionsRef.current.has(peerId)) {
      console.log('Reusing existing connection for chat');
      setCurrentChatPeerId(peerId);
      return;
    }

    // Load chat history from localStorage
    const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const savedChat = existingHistory.find((h: any) => h.peerId === peerId);

    // Create new chat
    const newChat: FriendChat = {
      peerId,
      username,
      messages: savedChat ? savedChat.messages : [],
      connection: null,
      isConnected: false
    };

    // 创建聊天窗口但不立即尝试连接
    setActiveChats(prev => new Map(prev.set(peerId, newChat)));
    setCurrentChatPeerId(peerId);
    
    // 只有在主连接就绪时才尝试建立聊天连接
    if (!peer || !peer.open) {
      console.log(`💬 Chat created for ${username}, will connect when peer is ready`);
      return;
    }
    
    // Try to connect
    try {
      console.log(`💬 Starting chat connection to ${username} (${peerId})`);
      
      const conn = peer.connect(peerId, { 
        metadata: { type: 'friend_chat' },
        reliable: true, // 确保消息可靠传输
        serialization: 'json'
      });
      
      // 设置连接超时，避免无限等待
      const connectionTimeout = setTimeout(() => {
        if (!conn.open) {
          console.log(`⏰ Chat connection timeout for ${username}, friend may be offline`);
          conn.close();
        }
      }, 5000); // 5秒超时，更快失败
      
      conn.on('open', () => {
        clearTimeout(connectionTimeout); // 清除超时定时器
        console.log(`✅ Friend chat connected to ${username} (${peerId})`);
        setActiveChats(prev => {
          const updated = new Map(prev);
          const chat = updated.get(peerId);
          if (chat) {
            chat.connection = conn;
            chat.isConnected = true;
          }
          return updated;
        });
        connectionsRef.current.set(peerId, conn);
        
        // 通知文件传输管理器
        if (onConnectionEstablished) {
          onConnectionEstablished(peerId, conn);
        }
      });
      
      conn.on('error', (error) => {
        clearTimeout(connectionTimeout); // 清除超时定时器
        console.log(`🔌 Friend ${username} appears to be offline, connection failed silently`);
        // 不显示错误，因为这可能只是好友离线
      });

      conn.on('data', async (data: any) => {
        if (data.type === 'friend_message') {
          // 验证消息完整性
          if (data.hash) {
            const isValid = await MessageIntegrity.verifyHash(data.content, data.hash);
            if (!isValid) {
              console.warn('Message integrity check failed');
              return;
            }
          }
          
          await addMessage(peerId, data.content, data.sender, false, data.id, data.hash);
          
          // 发送确认
          if (data.id) {
            conn.send({
              type: 'message_ack',
              messageId: data.id
            });
          }
        } else if (data.type === 'message_ack') {
          // 更新消息状态为已送达
          setActiveChats(prev => {
            const updated = new Map(prev);
            const chat = updated.get(peerId);
            if (chat) {
              const messageIndex = chat.messages.findIndex(m => m.id === data.messageId);
              if (messageIndex >= 0) {
                chat.messages = [...chat.messages];
                chat.messages[messageIndex] = {
                  ...chat.messages[messageIndex],
                  status: 'delivered'
                };
              }
            }
            return updated;
          });
        } else if (data.type === 'file_notification') {
          addFileMessage(peerId, data.fileName, data.fileSize, data.transferId, data.sender, false);
        }
      });

      conn.on('close', () => {
        console.log(`🔌 Friend chat disconnected from ${username}`);
        setActiveChats(prev => {
          const updated = new Map(prev);
          const chat = updated.get(peerId);
          if (chat) {
            chat.isConnected = false;
            chat.connection = null;
          }
          return updated;
        });
        connectionsRef.current.delete(peerId);
      });

      // 连接已在 conn.on('open') 中设置，这里不需要重复设置
      
    } catch (error) {
      console.error('Failed to start friend chat:', error);
    }
  }, [peer, addMessage, addFileMessage, onConnectionEstablished]);


  // Send message to friend
  const sendMessage = useCallback(async (peerId: string, content: string) => {
    const connection = connectionsRef.current.get(peerId);
    if (!connection || !content.trim()) {
      console.warn('No connection or empty message');
      return false;
    }
    
    if (!connection.open) {
      console.warn('Connection is not open');
      return false;
    }

    try {
      const messageId = MessageIntegrity.generateMessageId();
      const hash = await MessageIntegrity.generateHash(content.trim());
      
      connection.send({
        type: 'friend_message',
        id: messageId,
        content: content.trim(),
        sender: localUsername,
        timestamp: Date.now(),
        hash
      });

      // Add to local messages
      await addMessage(peerId, content.trim(), localUsername, true, messageId, hash);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }, [localUsername, addMessage]);

  // Send file notification to friend
  const sendFileNotification = useCallback((peerId: string, fileName: string, fileSize: number, transferId: string) => {
    const connection = connectionsRef.current.get(peerId);
    if (!connection) return;

    try {
      connection.send({
        type: 'file_notification',
        fileName,
        fileSize,
        transferId,
        sender: localUsername,
        timestamp: Date.now()
      });

      // Add to local messages
      addFileMessage(peerId, fileName, fileSize, transferId, localUsername, true);
    } catch (error) {
      console.error('Failed to send file notification:', error);
    }
  }, [localUsername, addFileMessage]);

  // Handle incoming connections
  const handleIncomingConnection = useCallback((conn: DataConnection) => {
    if (conn.metadata?.type === 'friend_chat') {
      conn.on('data', (data: any) => {
        // Find or create chat for this peer
        const peerId = conn.peer;
        
        setActiveChats(prev => {
          if (!prev.has(peerId)) {
            const newChat: FriendChat = {
              peerId,
              username: data.sender,
              messages: [],
              connection: conn,
              isConnected: true
            };
            return new Map(prev.set(peerId, newChat));
          }
          return prev;
        });
        
        // 处理不同类型的消息
        if (data.type === 'friend_message') {
          // 验证消息完整性
          const processMessage = async () => {
            if (data.hash) {
              const isValid = await MessageIntegrity.verifyHash(data.content, data.hash);
              if (!isValid) {
                console.warn('Message integrity check failed');
                return;
              }
            }
            
            await addMessage(peerId, data.content, data.sender, false, data.id, data.hash);
            
            // 发送确认
            if (data.id) {
              conn.send({
                type: 'message_ack',
                messageId: data.id
              });
            }
          };
          processMessage();
        } else if (data.type === 'message_ack') {
          // 更新消息状态为已送达
          setActiveChats(prev => {
            const updated = new Map(prev);
            const chat = updated.get(peerId);
            if (chat) {
              const messageIndex = chat.messages.findIndex(m => m.id === data.messageId);
              if (messageIndex >= 0) {
                chat.messages = [...chat.messages];
                chat.messages[messageIndex] = {
                  ...chat.messages[messageIndex],
                  status: 'delivered'
                };
              }
            }
            return updated;
          });
        } else if (data.type === 'file_notification') {
          addFileMessage(peerId, data.fileName, data.fileSize, data.transferId, data.sender, false);
        }
        
        connectionsRef.current.set(peerId, conn);
        
        // 通知文件传输管理器
        if (onConnectionEstablished) {
          onConnectionEstablished(peerId, conn);
        }
      });

      conn.on('close', () => {
        const peerId = conn.peer;
        setActiveChats(prev => {
          const updated = new Map(prev);
          const chat = updated.get(peerId);
          if (chat) {
            chat.isConnected = false;
            chat.connection = null;
          }
          return updated;
        });
        connectionsRef.current.delete(peerId);
      });
    }
  }, [addMessage, addFileMessage, onConnectionEstablished]);

  // Setup peer event listener
  useEffect(() => {
    if (peer) {
      peer.on('connection', handleIncomingConnection);
      
      return () => {
        peer.off('connection', handleIncomingConnection);
      };
    }
  }, [peer, handleIncomingConnection]);

  // Check connection status periodically
  const checkConnectionStatus = useCallback(() => {
    setActiveChats(prev => {
      const updated = new Map(prev);
      let hasChanges = false;
      
      updated.forEach((chat, peerId) => {
        const connection = connectionsRef.current.get(peerId);
        const isActuallyConnected = connection && connection.open && !(connection as any).destroyed;
        
        if (chat.isConnected !== isActuallyConnected) {
          console.log(`🔄 Chat connection status changed for ${chat.username}: ${isActuallyConnected ? 'connected' : 'disconnected'}`);
          chat.isConnected = !!isActuallyConnected;
          hasChanges = true;
        }
      });
      
      return hasChanges ? new Map(updated) : prev;
    });
  }, []);

  // Start periodic status checking
  useEffect(() => {
    if (activeChats.size > 0) {
      statusCheckInterval.current = setInterval(() => {
        checkConnectionStatus();
      }, 5000); // Check every 5 seconds
      
      return () => {
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
          statusCheckInterval.current = null;
        }
      };
    }
  }, [activeChats.size, checkConnectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
      connectionsRef.current.forEach(conn => conn.close());
      connectionsRef.current.clear();
    };
  }, []);

  const getCurrentChat = () => {
    return currentChatPeerId ? activeChats.get(currentChatPeerId) : null;
  };

  const closeChat = (peerId: string) => {
    const connection = connectionsRef.current.get(peerId);
    if (connection) {
      connection.close();
    }
    
    setActiveChats(prev => {
      const updated = new Map(prev);
      updated.delete(peerId);
      return updated;
    });
    
    if (currentChatPeerId === peerId) {
      setCurrentChatPeerId(null);
    }
  };

  return {
    activeChats,
    currentChatPeerId,
    currentChat: getCurrentChat(),
    startChat,
    sendMessage,
    sendFileNotification,
    closeChat,
    setCurrentChatPeerId
  };
};