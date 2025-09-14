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
        console.log('📞 Call ended');
        endCall();
      });

      call.on('error', (error) => {
        console.error('❌ Call error:', error);
        endCall();
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
  }, [peer, callState.isInCall]);

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
        console.log('📞 Call ended');
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
  }, [callState.incomingCall]);

  // Reject call
  const rejectCall = useCallback(() => {
    const incomingCall = callState.incomingCall;
    if (incomingCall) {
      console.log('🚫 Rejecting call');
      incomingCall.close();
      setCallState(prev => ({
        ...prev,
        incomingCall: null
      }));
    }
  }, [callState.incomingCall]);

  // End call
  const endCall = useCallback(() => {
    console.log('📞 Ending call');

    // Stop local stream
    if (callState.localStream) {
      callState.localStream.getTracks().forEach(track => track.stop());
    }

    // Close call
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Save call record
    if (callState.callStartTime) {
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
  }, [callState.localStream, callState.callStartTime, callState.isVideoCall]);

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
    
    if (callState.isInCall) {
      console.log('Already in call, rejecting');
      call.close();
      return;
    }

    setCallState(prev => ({
      ...prev,
      incomingCall: call,
      isVideoCall: call.metadata?.isVideoCall || false
    }));

    // Auto-reject after 30 seconds
    const timeoutId = setTimeout(() => {
      setCallState(prev => {
        if (prev.incomingCall === call) {
          console.log('Call timeout');
          call.close();
          return {
            ...prev,
            incomingCall: null
          };
        }
        return prev;
      });
    }, 30000);

    // Clear timeout if call is answered or rejected
    call.on('close', () => {
      clearTimeout(timeoutId);
    });
  }, [callState.isInCall]);

  // Setup peer event listener
  useEffect(() => {
    if (peer) {
      peer.on('call', handleIncomingCall);
      return () => {
        peer.off('call', handleIncomingCall);
      };
    }
  }, [peer, handleIncomingCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callState.localStream) {
        callState.localStream.getTracks().forEach(track => track.stop());
      }
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
    endCall,
    switchCamera,
    formatDuration
  };
};