import React from 'react';

interface SimpleCallInterfaceProps {
  callState: {
    isInCall: boolean;
    isVideoCall: boolean;
    incomingCall: any;
    callError: string | null;
    callDuration: number;
  };
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onSwitchCamera?: () => void;
  getCallerName: (peerId: string) => string;
  formatDuration: (seconds: number) => string;
}

export const SimpleCallInterface: React.FC<SimpleCallInterfaceProps> = ({
  callState,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onReject,
  onEndCall,
  onSwitchCamera,
  getCallerName,
  formatDuration
}) => {
  // Incoming call modal
  if (callState.incomingCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="text-4xl mb-4">
              {callState.isVideoCall ? '📹' : '📞'}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Incoming {callState.isVideoCall ? 'Video' : 'Audio'} Call
            </h3>
            <p className="text-slate-300 mb-6">
              {getCallerName(callState.incomingCall.peer)} is calling you
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={onReject}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-lg font-medium"
              >
                ❌ Decline
              </button>
              <button
                onClick={onAccept}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 px-4 rounded-lg font-medium"
              >
                ✅ Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active call interface
  if (callState.isInCall) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Video area */}
        <div className="flex-1 relative">
          {callState.isVideoCall ? (
            <>
              {/* Remote video (main) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local video (picture-in-picture) */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg object-cover"
              />
              
              {/* Call duration overlay */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg font-mono">
                {formatDuration(callState.callDuration)}
              </div>
            </>
          ) : (
            /* Audio call interface */
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🎤</div>
                <h2 className="text-2xl text-white mb-2">Audio Call</h2>
                <p className="text-slate-300 mb-4">Call in progress...</p>
                <div className="text-xl text-green-400 font-mono">
                  {formatDuration(callState.callDuration)}
                </div>
                {/* Hidden audio elements for audio-only calls */}
                <audio ref={localVideoRef} autoPlay muted style={{display: 'none'}} />
                <audio ref={remoteVideoRef} autoPlay style={{display: 'none'}} />
              </div>
            </div>
          )}
        </div>

        {/* Call controls */}
        <div className="p-6 bg-slate-900 flex justify-center gap-4">
          {callState.isVideoCall && onSwitchCamera && (
            <button
              onClick={onSwitchCamera}
              className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-full font-medium"
            >
              🔄 Switch Camera
            </button>
          )}
          <button
            onClick={onEndCall}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-medium"
          >
            📞 End Call
          </button>
        </div>
      </div>
    );
  }

  // Call error display
  if (callState.callError) {
    return (
      <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
        {callState.callError}
      </div>
    );
  }

  return null;
};