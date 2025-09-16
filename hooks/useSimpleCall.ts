import { useState, useRef, useCallback, useEffect } from 'react';
import type { MediaConnection } from 'peerjs';

interface CallState {
  isInCall: boolean;
  isVideoCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingCall: MediaConnection | null;
  callError: string | null;
  facingMode: 'user' | 'environment';
  callStartTime: number | null;
  callDuration: number;
}

export const useSimpleCall = (peer: any) => {
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isVideoCall: false,
    localStream: null,
    remoteStream: null,
    incomingCall: null,
    callError: null,
    facingMode: 'user',
    callStartTime: null,
    callDuration: 0
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const currentCallRef = useRef<MediaConnection | null>(null);

  // Start call
  const startCall = useCallback(async (targetPeerId: string, isVideo: boolean) => {
    if (!peer || !peer.open) {
      console.error('Peer not ready');
      return;
    }

    if (callState.isInCall) {
      console.warn('Already in call');
      return;
    }

    console.log(`📞 Starting ${isVideo ? 'video' : 'audio'} call to ${targetPeerId}`);

    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: callState.facingMode } : false
      });

      console.log('📺 Got local stream:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));

      // Update state first
      setCallState(prev => ({
        ...prev,
        isInCall: true,
        isVideoCall: isVideo,
        localStream: stream,
        callError: null,
        callStartTime: Date.now()
      }));

      // Set local video after state update
      setTimeout(() => {
        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(e => console.log('Local video play error:', e));
        }
      }, 100);

      // Make call
      const call = peer.call(targetPeerId, stream, {
        metadata: { isVideoCall: isVideo }
      });

      currentCallRef.current = call;
      


      // Handle remote stream
      call.on('stream', (remoteStream: MediaStream) => {
        console.log('📺 Received remote stream:', remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
        
        setCallState(prev => ({
          ...prev,
          remoteStream
        }));
        
        // Set remote video
        setTimeout(() => {
          if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.log('Remote video play error:', e));
          }
        }, 100);
      });

      // Handle call close
      call.on('close', () => {
        console.log('📞 Call ended by remote');
        setCallState(prev => {
          const wasConnected = !!prev.remoteStream;
          return {
            ...prev,
            callError: wasConnected ? 'Call ended by remote' : 'Call was declined'
          };
        });
        setTimeout(() => {
          endCall();
        }, 1000);
      });

      // Handle call error
      call.on('error', (error) => {
        console.error('❌ Call error:', error);
        setCallState(prev => ({
          ...prev,
          callError: 'Call failed - friend may be offline'
        }));
        setTimeout(() => {
          endCall();
        }, 2000);
      });
      


      // Handle connection timeout (no answer)
      const callTimeout = setTimeout(() => {
        setCallState(prev => {
          if (currentCallRef.current === call && !prev.remoteStream) {
            console.log('📞 Call timeout - no answer');
            setTimeout(() => {
              endCall();
            }, 2000);
            return {
              ...prev,
              callError: 'No answer - call timed out'
            };
          }
          return prev;
        });
      }, 30000);

      // Clear timeout when call connects
      call.on('stream', () => {
        clearTimeout(callTimeout);
      });

      // Clear timeout when call ends
      call.on('close', () => {
        clearTimeout(callTimeout);
      });

    } catch (error) {
      console.error('Failed to start call:', error);
      setCallState(prev => ({
        ...prev,
        callError: 'Failed to access camera/microphone'
      }));
      setTimeout(() => {
        setCallState(prev => ({ ...prev, callError: null }));
      }, 3000);
    }
  }, [peer, callState.isInCall, callState.facingMode]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    const incomingCall = callState.incomingCall;
    if (!incomingCall) return;

    const isVideoCall = incomingCall.metadata?.isVideoCall || false;
    console.log(`✅ Accepting ${isVideoCall ? 'video' : 'audio'} call`);

    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall ? { facingMode: callState.facingMode } : false
      });

      console.log('📺 Got local stream for answer:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));

      // Answer call
      incomingCall.answer(stream);
      currentCallRef.current = incomingCall;

      // Update state
      setCallState(prev => ({
        ...prev,
        isInCall: true,
        isVideoCall,
        localStream: stream,
        incomingCall: null,
        callError: null,
        callStartTime: Date.now()
      }));

      // Set local video after state update
      setTimeout(() => {
        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(e => console.log('Local video play error:', e));
        }
      }, 100);

      // Handle remote stream
      incomingCall.on('stream', (remoteStream: MediaStream) => {
        console.log('📺 Received remote stream:', remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
        
        setCallState(prev => ({
          ...prev,
          remoteStream
        }));
        
        // Set remote video
        setTimeout(() => {
          if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.log('Remote video play error:', e));
          }
        }, 100);
      });

      // Handle call close
      incomingCall.on('close', () => {
        console.log('📞 Call ended by remote');
        setCallState(prev => ({
          ...prev,
          callError: 'Call ended by remote'
        }));
        setTimeout(() => {
          endCall();
        }, 1000);
      });

      // Handle call error
      incomingCall.on('error', (error) => {
        console.error('❌ Call error:', error);
        endCall();
      });

    } catch (error) {
      console.error('Failed to accept call:', error);
      setCallState(prev => ({
        ...prev,
        callError: 'Failed to access camera/microphone',
        incomingCall: null
      }));
    }
  }, [callState.incomingCall, callState.facingMode]);

  // Send hangup signal
  const sendHangupSignal = useCallback((targetPeer: string) => {
    if (peer) {
      const conn = peer.connect(targetPeer);
      conn.on('open', () => {
        conn.send({ type: 'call_hangup' });
      });
    }
  }, [peer]);

  // Reject call
  const rejectCall = useCallback(() => {
    const incomingCall = callState.incomingCall;
    if (incomingCall) {
      sendHangupSignal(incomingCall.peer);
      incomingCall.close();
      setCallState(prev => ({ ...prev, incomingCall: null }));
    }
  }, [callState.incomingCall, sendHangupSignal]);

  // End call
  const endCall = useCallback(() => {
    console.log('📞 Ending call');

    // Send hangup signal if we have an active call
    if (currentCallRef.current) {
      sendHangupSignal(currentCallRef.current.peer);
    }



    // Stop local stream
    if (callState.localStream) {
      callState.localStream.getTracks().forEach(track => track.stop());
    }

    // Close call connection
    if (currentCallRef.current) {
      try {
        currentCallRef.current.close();
      } catch (error) {
        console.log('Error closing call:', error);
      }
      currentCallRef.current = null;
    }

    // Close incoming call if exists
    if (callState.incomingCall) {
      try {
        callState.incomingCall.close();
      } catch (error) {
        console.log('Error closing incoming call:', error);
      }
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Save call record only if call was actually connected
    if (callState.callStartTime && callState.isInCall) {
      const duration = Math.floor((Date.now() - callState.callStartTime) / 1000);
      const callRecord = {
        id: Date.now().toString(),
        type: callState.isVideoCall ? 'video' : 'audio',
        duration,
        timestamp: callState.callStartTime,
        endTime: Date.now()
      };
      
      const existingRecords = JSON.parse(localStorage.getItem('callRecords') || '[]');
      existingRecords.push(callRecord);
      localStorage.setItem('callRecords', JSON.stringify(existingRecords));
    }

    // Reset state
    setCallState({
      isInCall: false,
      isVideoCall: false,
      localStream: null,
      remoteStream: null,
      incomingCall: null,
      callError: null,
      facingMode: 'user',
      callStartTime: null,
      callDuration: 0
    });
  }, [callState.localStream, callState.callStartTime, callState.isVideoCall, callState.isInCall, callState.incomingCall]);

  // Update call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState.isInCall && callState.callStartTime) {
      interval = setInterval(() => {
        setCallState(prev => ({
          ...prev,
          callDuration: Math.floor((Date.now() - prev.callStartTime!) / 1000)
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.isInCall, callState.callStartTime]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!callState.isInCall || !callState.isVideoCall || !callState.localStream) return;

    const newFacingMode = callState.facingMode === 'user' ? 'environment' : 'user';
    
    try {
      // Stop current video track
      callState.localStream.getVideoTracks().forEach(track => track.stop());
      
      // Get new stream with switched camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: newFacingMode }
      });

      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      // Replace track in peer connection
      if (currentCallRef.current && currentCallRef.current.peerConnection) {
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = currentCallRef.current.peerConnection.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }

      // Update state
      setCallState(prev => ({
        ...prev,
        localStream: newStream,
        facingMode: newFacingMode
      }));

    } catch (error) {
      console.error('Failed to switch camera:', error);
      setCallState(prev => ({
        ...prev,
        callError: 'Failed to switch camera'
      }));
      setTimeout(() => {
        setCallState(prev => ({ ...prev, callError: null }));
      }, 3000);
    }
  }, [callState.isInCall, callState.isVideoCall, callState.localStream, callState.facingMode]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle incoming calls
  const handleIncomingCall = useCallback((call: MediaConnection) => {
    console.log('📞 Incoming call from:', call.peer, 'Video:', call.metadata?.isVideoCall);
    
    setCallState(prev => {
      if (prev.isInCall || prev.incomingCall) {
        console.log('Already in call or has incoming call, rejecting');
        call.close();
        return prev;
      }
      

      
      return {
        ...prev,
        incomingCall: call,
        isVideoCall: call.metadata?.isVideoCall || false
      };
    });



    // Auto-reject after 30 seconds
    const timeoutId = setTimeout(() => {
      setCallState(prev => {
        if (prev.incomingCall === call) {
          console.log('Call timeout');
          call.close();
          return {
            ...prev,
            incomingCall: null,
            callError: 'Call timed out - no response'
          };
        }
        return prev;
      });
    }, 30000);

    // Handle call close/hangup from caller
    call.on('close', () => {
      console.log('📞 Caller hung up');
      clearTimeout(timeoutId);
      setCallState(prev => ({
        ...prev,
        incomingCall: null,
        callError: 'Caller ended the call'
      }));
      
      setTimeout(() => {
        setCallState(prev => ({ ...prev, callError: null }));
      }, 3000);
    });
    


    // Handle call error
    call.on('error', (error) => {
      console.log('📞 Call error:', error);
      clearTimeout(timeoutId);
      setCallState(prev => ({
        ...prev,
        incomingCall: null,
        callError: 'Call failed'
      }));
      
      setTimeout(() => {
        setCallState(prev => ({ ...prev, callError: null }));
      }, 3000);
    });
  }, [callState.isInCall]);

  // Setup peer event listener
  useEffect(() => {
    if (peer) {
      peer.on('call', handleIncomingCall);
      
      // Listen for data connections (hangup/reject signals)
      peer.on('connection', (conn) => {
        conn.on('data', (data) => {
          if (data.type === 'call_hangup') {
            console.log('📞 Received hangup signal');
            setCallState(prev => ({
              ...prev,
              incomingCall: null,
              callError: prev.incomingCall ? 'Call was declined' : 'Call ended by remote'
            }));
            
            setTimeout(() => {
              setCallState(prev => ({ ...prev, callError: null }));
            }, 3000);
            
            // End current call if in progress
            if (currentCallRef.current) {
              endCall();
            }
          }
        });
      });
      
      return () => {
        peer.off('call', handleIncomingCall);
      };
    }
  }, [peer, handleIncomingCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentCallRef.current) {
        currentCallRef.current.close();
      }
    };
  }, []);

  return {
    callState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall: endCall,
    switchCamera,
    formatDuration
  };
};