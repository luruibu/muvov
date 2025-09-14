// 手机浏览器兼容性工具
export class MobileCompatibility {
  // 检测是否为移动设备
  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // 检测摄像头支持
  static async checkCameraSupport(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  // 请求摄像头权限
  static async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // 后置摄像头更适合扫码
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  // 获取移动端优化的 PeerJS 配置
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
      debug: 1 // 减少日志输出
    };
  }

  // 检测 WebRTC 支持
  static checkWebRTCSupport(): boolean {
    return !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
  }
}