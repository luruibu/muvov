import { useState, useRef, useCallback, useEffect } from 'react';
import type { DataConnection } from 'peerjs';
import { Message } from '../types';

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

  // Add message to chat
  const addMessage = useCallback((peerId: string, content: string, sender: string, isLocal: boolean) => {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      content,
      sender,
      timestamp: Date.now(),
      isLocal,
      type: 'text'
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

    // Try to connect
    try {
      console.log(`💬 Starting chat connection to ${username} (${peerId})`);
      const conn = peer.connect(peerId, { 
        metadata: { type: 'friend_chat' },
        reliable: true // 确保消息可靠传输
      });
      
      conn.on('open', () => {
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
        
        // 更新好友在线状态
        window.dispatchEvent(new CustomEvent('friendStatusUpdate', {
          detail: { peerId, isOnline: true, lastSeen: Date.now() }
        }));
        
        // 通知文件传输管理器
        if (onConnectionEstablished) {
          onConnectionEstablished(peerId, conn);
        }
      });
      
      conn.on('error', (error) => {
        console.error(`❌ Friend chat connection error with ${username}:`, error);
      });

      conn.on('data', (data: any) => {
        if (data.type === 'friend_message') {
          addMessage(peerId, data.content, data.sender, false);
        } else if (data.type === 'file_notification') {
          // 添加文件传输通知消息
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
        
        // 更新好友离线状态
        window.dispatchEvent(new CustomEvent('friendStatusUpdate', {
          detail: { peerId, isOnline: false, lastSeen: Date.now() }
        }));
      });
      
      conn.on('error', (error) => {
        console.error(`❌ Chat connection error with ${username}:`, error);
        // 连接错误时也要清理状态
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

      newChat.connection = conn;
      setActiveChats(prev => new Map(prev.set(peerId, newChat)));
      setCurrentChatPeerId(peerId);
      
    } catch (error) {
      console.error('Failed to start friend chat:', error);
    }
  }, [peer, activeChats, addMessage, addFileMessage, onConnectionEstablished]);


  // Send message to friend
  const sendMessage = useCallback((peerId: string, content: string) => {
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
      connection.send({
        type: 'friend_message',
        content: content.trim(),
        sender: localUsername,
        timestamp: Date.now()
      });

      // Add to local messages
      addMessage(peerId, content.trim(), localUsername, true);
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
        
        if (!activeChats.has(peerId)) {
          const newChat: FriendChat = {
            peerId,
            username: data.sender,
            messages: [],
            connection: conn,
            isConnected: true
          };
          setActiveChats(prev => new Map(prev.set(peerId, newChat)));
        }
        
        // 处理不同类型的消息
        if (data.type === 'friend_message') {
          addMessage(peerId, data.content, data.sender, false);
        } else if (data.type === 'file_notification') {
          addFileMessage(peerId, data.fileName, data.fileSize, data.transferId, data.sender, false);
        }
        
        connectionsRef.current.set(peerId, conn);
        
        // 更新好友在线状态
        window.dispatchEvent(new CustomEvent('friendStatusUpdate', {
          detail: { peerId, isOnline: true, lastSeen: Date.now() }
        }));
        
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
        
        // 更新好友离线状态
        window.dispatchEvent(new CustomEvent('friendStatusUpdate', {
          detail: { peerId, isOnline: false, lastSeen: Date.now() }
        }));
      });
    }
  }, [activeChats, addMessage, addFileMessage, onConnectionEstablished]);

  // Setup peer event listener
  useEffect(() => {
    if (peer) {
      peer.on('connection', handleIncomingConnection);
      
      return () => {
        peer.off('connection', handleIncomingConnection);
      };
    }
  }, [peer, handleIncomingConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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