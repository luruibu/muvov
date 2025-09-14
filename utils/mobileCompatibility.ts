// Mobile browser compatibility utility
export class MobileCompatibility {
  // Detect if mobile device
  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Check camera support
  static async checkCameraSupport(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  // Request camera permission
  static async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Rear camera is better for QR scanning
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  // Get mobile-optimized PeerJS configuration
  static getMobilePeerConfig(): any {
    return {
      config: {
        iceServers: [
          { urls: 'stun:stun.cloudflare.com:3478' },
          { urls: 'stun:stun.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10
      },
      debug: 1 // Reduce log output
    };
  }

  // Check WebRTC support
  static checkWebRTCSupport(): boolean {
    return !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
  }
}