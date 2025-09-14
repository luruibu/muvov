import React, { useState } from 'react';
import { Friend, Room } from '../types';

interface RoomPanelProps {
  currentRoom: Room | null;
  friends: Friend[];
  onCreateRoom: (roomName: string) => void;
  onInviteFriend: (friendPeerId: string, friendUsername: string) => void;
  onLeaveRoom: () => void;
}

export const RoomPanel: React.FC<RoomPanelProps> = ({
  currentRoom,
  friends,
  onCreateRoom,
  onInviteFriend,
  onLeaveRoom
}) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return;
    onCreateRoom(newRoomName.trim());
    setNewRoomName('');
  };

  const handleInviteFriend = (friend: Friend) => {
    onInviteFriend(friend.peerId, friend.username);
    setShowInviteModal(false);
  };

  if (currentRoom) {
    return (
      <div className="space-y-4">
        {/* Current Room Info */}
        <div className="bg-slate-700 p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-100 font-medium">{currentRoom.roomName}</h3>
            <button
              onClick={onLeaveRoom}
              className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs"
            >
              Leave
            </button>
          </div>
          <div className="text-slate-400 text-xs">
            Room ID: {currentRoom.roomId}
          </div>
        </div>

        {/* Room Members */}
        <div>
          <h4 className="text-slate-300 text-sm font-medium mb-2">
            Members ({currentRoom.members.size})
          </h4>
          <div className="space-y-1">
            {Array.from(currentRoom.members.values()).map(member => (
              <div key={member.peerId} className="flex items-center gap-2 p-2 bg-slate-700 rounded">
                <div className={`w-2 h-2 rounded-full ${
                  member.isAlive ? 'bg-green-500' : 'bg-gray-500'
                }`}></div>
                <span className="text-slate-100 text-sm">{member.username}</span>
                {currentRoom.createdBy === member.peerId && (
                  <span className="text-yellow-400 text-xs">Host</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invite Friends */}
        {currentRoom.isHost && (
          <div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded text-sm"
            >
              Invite Friends
            </button>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-4 rounded-lg max-w-sm w-full mx-4">
              <h3 className="text-slate-100 font-medium mb-3">Invite Friends</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friends.filter(f => !currentRoom.members.has(f.peerId)).map(friend => (
                  <div key={friend.peerId} className="flex items-center justify-between p-2 bg-slate-700 rounded">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        friend.isOnline ? 'bg-green-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-slate-100 text-sm">{friend.username}</span>
                    </div>
                    <button
                      onClick={() => handleInviteFriend(friend)}
                      className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full mt-3 bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Room */}
      <div>
        <h3 className="text-slate-300 text-sm font-medium mb-2">Create Room</h3>
        <div className="space-y-2">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm"
          />
          <button
            onClick={handleCreateRoom}
            disabled={!newRoomName.trim()}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-500 text-white py-2 px-3 rounded text-sm"
          >
            Create Room
          </button>
        </div>
      </div>

      {/* No Room Message */}
      <div className="text-slate-400 text-center py-8 text-sm">
        Create a room to start chatting with multiple friends
      </div>
    </div>
  );
};