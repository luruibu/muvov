import React from 'react';

interface FriendsStatusIndicatorProps {
  totalFriends: number;
  onlineFriends: number;
  isChecking: boolean;
  onRefresh?: () => void;
}

export const FriendsStatusIndicator: React.FC<FriendsStatusIndicatorProps> = ({
  totalFriends,
  onlineFriends,
  isChecking,
  onRefresh
}) => {
  if (totalFriends === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <div className={`w-2 h-2 rounded-full ${isChecking ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
      <span>Friends: {onlineFriends}/{totalFriends} online</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isChecking}
          className="text-slate-500 hover:text-slate-300 disabled:opacity-50"
          title="Refresh friends status"
        >
          🔄
        </button>
      )}
    </div>
  );
};