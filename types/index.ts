export interface Identity {
  username: string;
  peerId: string;
}

export interface Friend {
  peerId: string;
  username: string;
  addedTime: number;
  lastSeen: number;
  isOnline: boolean;
}

export interface RoomMember {
  peerId: string;
  username: string;
  joinTime: number;
  isAlive: boolean;
  connection?: any;
}

export interface Room {
  roomId: string;
  roomName: string;
  createdBy: string;
  createdAt: number;
  members: Map<string, RoomMember>;
  isHost: boolean;
}

export interface Message {
  id: string;
  type: 'text' | 'file';
  content: string;
  timestamp: number;
  isLocal: boolean;
  sender: string;
  transferId?: string;
  fileName?: string;
  fileSize?: number;
  hash?: string;
  status?: 'sending' | 'delivered' | 'failed';
}

export interface RoomMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  isLocal: boolean;
  type: 'text' | 'file';
  transferId?: string;
  fileName?: string;
  fileSize?: number;
}

export interface CallState {
  isInCall: boolean;
  isVideoCall: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  remoteStreams: Map<string, MediaStream>;
  localStream: MediaStream | null;
  incomingCall: any;
  callError: string | null;
}

export interface Member {
  peerId: string;
  username: string;
  isAlive: boolean;
}