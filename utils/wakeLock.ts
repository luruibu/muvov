// 屏幕唤醒锁管理
export class WakeLockManager {
  private static wakeLock: WakeLockSentinel | null = null;
  private static isSupported = 'wakeLock' in navigator;

  // 请求屏幕保持唤醒
  static async requestWakeLock(reason: string = 'chat'): Promise<boolean> {
    if (!this.isSupported) {
      console.log('Wake Lock API not supported');
      return false;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log(`🔆 Screen wake lock activated: ${reason}`);
      
      this.wakeLock.addEventListener('release', () => {
        console.log('🌙 Screen wake lock released');
      });
      
      return true;
    } catch (error) {
      console.error('Failed to request wake lock:', error);
      return false;
    }
  }

  // 释放屏幕唤醒锁
  static async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  // 检查是否已激活
  static isActive(): boolean {
    return this.wakeLock !== null && !this.wakeLock.released;
  }

  // 页面可见性变化时重新请求
  static handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && this.wakeLock && this.wakeLock.released) {
      this.requestWakeLock('visibility-change');
    }
  }
}