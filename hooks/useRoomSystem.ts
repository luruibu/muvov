import { useState, useRef, useCallback, useEffect } from 'react';
import type { DataConnection } from 'peerjs';
import { Room, RoomMember, RoomMessage } from '../types';
import { InputSanitizer } from '../utils/sanitizer';

export const useRoomSystem = (
  localUsername: string,
  localPeerId: string,
  peer: any
) => {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const roomConnectionsRef = useRef<Map<string, DataConnection>>(new Map());

  // Add message to room
  const addRoomMessage = useCallback((message: Omit<RoomMessage, 'id' | 'timestamp'>) => {
    // Generate ID with fallback for environments without crypto.randomUUID
    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback ID generation
      return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    };
    
    const newMessage: RoomMessage = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    };
    setRoomMessages(prev => [...prev, newMessage]);
  }, []);

  // Send message to room
  const sendRoomMessage = useCallback((content: string) => {
    if (!content.trim() || !currentRoom) return;

    const messageData = {
      type: 'room-message',
      roomId: currentRoom.roomId,
      sender: localUsername,
      content: content.trim(),
      timestamp: Date.now()
    };

    // Add to local messages
    addRoomMessage({
      sender: localUsername,
      content: content.trim(),
      isLocal: true
    });

    // Broadcast to room members
    console.log('Broadcasting message to', roomConnectionsRef.current.size, 'connections');
    roomConnectionsRef.current.forEach((conn, peerId) => {
      if (peerId !== localPeerId) {
        try {
          console.log('Sending message to:', peerId);
          conn.send(messageData);
        } catch (error) {
          console.error('Failed to send room message to:', peerId, error);
        }
      }
    });
  }, [currentRoom, localUsername, localPeerId, addRoomMessage]);

  // Create new room
  const createRoom = useCallback((roomName: string) => {
    // Generate more unique room ID to prevent collisions
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substring(2, 11);
    const random2 = Math.random().toString(36).substring(2, 11);
    const roomId = `room_${timestamp}_${random1}_${random2}`;
    
    const newRoom: Room = {
      roomId,
      roomName: roomName.trim(),
      createdBy: localPeerId,
      createdAt: Date.now(),
      members: new Map([[localPeerId, {
        peerId: localPeerId,
        username: localUsername,
        joinTime: Date.now(),
        isAlive: true
      }]]),
      isHost: true
    };

    setCurrentRoom(newRoom);
    setRoomMessages([]);
    
    addRoomMessage({
      sender: 'System',
      content: `Room "${roomName}" created`,
      isLocal: false
    });

    return roomId;
  }, [localPeerId, localUsername, addRoomMessage]);

  // Invite friend to room
  const inviteFriendToRoom = useCallback((friendPeerId: string, friendUsername: string) => {
    if (!currentRoom || !peer) return;

    try {
      const conn = peer.connect(friendPeerId);
      
      conn.on('open', () => {
        conn.send({
          type: 'room-invitation',
          roomId: currentRoom.roomId,
          roomName: currentRoom.roomName,
          inviterName: localUsername,
          inviterPeerId: localPeerId
        });
      });

      conn.on('data', (data: any) => {
        if (data.type === 'room-join-accept') {
          // Friend accepted invitation
          const newMember: RoomMember = {
            peerId: friendPeerId,
            username: friendUsername,
            joinTime: Date.now(),
            isAlive: true,
            connection: conn
          };

          setCurrentRoom(prev => {
            if (!prev) return prev;
            const newMembers = new Map(prev.members);
            newMembers.set(friendPeerId, newMember);
            return { ...prev, members: newMembers };
          });

          roomConnectionsRef.current.set(friendPeerId, conn);

          addRoomMessage({
            sender: 'System',
            content: `${friendUsername} joined the room`,
            isLocal: false
          });

          // Send room sync to new member
          conn.send({
            type: 'room-sync',
            roomId: currentRoom.roomId,
            roomName: currentRoom.roomName,
            members: Array.from(currentRoom.members.values()).map(m => ({
              peerId: m.peerId,
              username: m.username,
              joinTime: m.joinTime
            }))
          });
        }
      });

      conn.on('close', () => {
        // Clean up connection and member state
        roomConnectionsRef.current.delete(friendPeerId);
        
        setCurrentRoom(prev => {
          if (!prev) return prev;
          const newMembers = new Map(prev.members);
          const member = newMembers.get(friendPeerId);
          
          if (member) {
            // Mark as disconnected instead of removing immediately
            newMembers.set(friendPeerId, { ...member, isAlive: false });
            
            // Remove after delay to handle reconnections
            const currentRoomId = prev.roomId;
            setTimeout(() => {
              setCurrentRoom(current => {
                // Only remove if still in same room
                if (!current || current.roomId !== currentRoomId) return current;
                const updatedMembers = new Map(current.members);
                const currentMember = updatedMembers.get(friendPeerId);
                // Only remove if still marked as disconnected
                if (currentMember && !currentMember.isAlive) {
                  updatedMembers.delete(friendPeerId);
                }
                return { ...current, members: updatedMembers };
              });
            }, 5000);
          }
          
          return { ...prev, members: newMembers };
        });

        addRoomMessage({
          sender: 'System',
          content: `${friendUsername} disconnected`,
          isLocal: false
        });
      });

    } catch (error) {
      console.error('Failed to invite friend:', error);
    }
  }, [currentRoom, peer, localUsername, localPeerId, addRoomMessage]);

  // Leave room
  const leaveRoom = useCallback(() => {
    // Close all room connections
    roomConnectionsRef.current.forEach(conn => conn.close());
    roomConnectionsRef.current.clear();

    setCurrentRoom(null);
    setRoomMessages([]);
  }, []);

  // Handle incoming room messages
  const handleRoomMessage = useCallback((data: any) => {
    console.log('Received room message:', data);
    if (data.type === 'room-message') {
      addRoomMessage({
        sender: data.sender,
        content: data.content,
        isLocal: false
      });
    }
  }, [addRoomMessage]);

  // Handle incoming room invitations and messages
  const handleIncomingConnection = useCallback((conn: DataConnection) => {
    conn.on('data', (data: any) => {
      if (data.type === 'room-invitation') {
        // TODO: Replace with custom modal in production
        const sanitizedInviter = InputSanitizer.sanitizeForHTML(data.inviterName);
        const sanitizedRoom = InputSanitizer.sanitizeForHTML(data.roomName);
        const accept = window.confirm(`${sanitizedInviter} invited you to join room "${sanitizedRoom}". Accept?`);
        
        if (accept) {
          conn.send({ type: 'room-join-accept' });
          
          // Join the room
          const newRoom: Room = {
            roomId: data.roomId,
            roomName: data.roomName,
            createdBy: data.inviterPeerId,
            createdAt: Date.now(),
            members: new Map([
              [localPeerId, {
                peerId: localPeerId,
                username: localUsername,
                joinTime: Date.now(),
                isAlive: true,
                connection: conn
              }],
              [data.inviterPeerId, {
                peerId: data.inviterPeerId,
                username: data.inviterName,
                joinTime: Date.now(),
                isAlive: true,
                connection: conn
              }]
            ]),
            isHost: false
          };
          
          setCurrentRoom(newRoom);
          setRoomMessages([]);
          roomConnectionsRef.current.set(data.inviterPeerId, conn);
          
          addRoomMessage({
            sender: 'System',
            content: `Joined room "${data.roomName}"`,
            isLocal: false
          });
        } else {
          conn.close();
        }
      } else if (data.type === 'room-sync') {
        // Handle room sync data
        if (currentRoom && data.roomId === currentRoom.roomId) {
          setCurrentRoom(prev => {
            if (!prev) return prev;
            const newMembers = new Map(prev.members);
            
            data.members.forEach((memberData: any) => {
              if (memberData.peerId !== localPeerId) {
                newMembers.set(memberData.peerId, {
                  ...memberData,
                  isAlive: true,
                  connection: conn
                });
              }
            });
            
            return { ...prev, members: newMembers };
          });
        }
      } else if (data.type === 'room-message') {
        console.log('Processing room message from connection');
        handleRoomMessage(data);
      }
    });
  }, [localPeerId, localUsername, handleRoomMessage, addRoomMessage]);

  // Setup message handling
  useEffect(() => {
    if (peer) {
      peer.on('connection', handleIncomingConnection);
      
      return () => {
        peer.off('connection', handleIncomingConnection);
      };
    }
  }, [peer, handleIncomingConnection]);

  return {
    currentRoom,
    roomMessages,
    createRoom,
    inviteFriendToRoom,
    sendRoomMessage,
    leaveRoom
  };
};