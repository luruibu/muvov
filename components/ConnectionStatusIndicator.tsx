import React, { useState } from 'react';

interface ConnectionStatusIndicatorProps {
  isReady: boolean;
  connectionStatus: string;
  isOnline: boolean;
  isVisible: boolean;
  onReconnect: () => void;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  isReady,
  connectionStatus,
  isOnline,
  isVisible,
  onReconnect
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (isReady) return 'bg-green-500';

    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isReady) return 'Ready';
    if (connectionStatus) return connectionStatus;

    return 'Connecting...';
  };



  return (
    <div className="space-y-2">
      {/* Main Status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-slate-400 text-xs">Status: {getStatusText()}</span>
        {!isReady && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-slate-500 hover:text-slate-400 text-xs"
            title="Show connection details"
          >
            {showDetails ? '▼' : '▶'}
          </button>
        )}
      </div>



      {/* Connection Status Message */}
      {connectionStatus && (
        <div className="bg-yellow-600 text-yellow-100 p-2 rounded text-xs">
          {connectionStatus}
        </div>
      )}

      {/* Network Status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-slate-400 text-xs">Network: {isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Page Visibility */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isVisible ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
        <span className="text-slate-400 text-xs">Page: {isVisible ? 'Active' : 'Background'}</span>
      </div>

      {/* Action Buttons */}
      {!isReady && (
        <div className="flex gap-1 mt-2">
          <button
            onClick={onReconnect}
            className="bg-orange-600 hover:bg-orange-500 text-white px-2 py-1 rounded text-xs"
          >
            Reconnect
          </button>

        </div>
      )}


    </div>
  );
};