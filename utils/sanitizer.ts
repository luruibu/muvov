// 输入清理工具
export class InputSanitizer {
  // 清理日志输入，防止日志注入
  static sanitizeForLog(input: string): string {
    if (typeof input !== 'string') return String(input);
    
    return input
      .replace(/[\r\n]/g, ' ') // 移除换行符
      .replace(/[\x00-\x1f\x7f]/g, '') // 移除控制字符
      .substring(0, 200); // 限制长度
  }

  // 清理HTML输入，防止XSS
  static sanitizeForHTML(input: string): string {
    if (typeof input !== 'string') return String(input);
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // 验证PeerID格式 - 放宽限制以支持更多格式
  static isValidPeerId(peerId: string): boolean {
    if (typeof peerId !== 'string') return false;
    // 支持更多PeerID格式，包括默认生成的格式
    return /^[a-zA-Z0-9_-]{3,50}$/.test(peerId) && peerId.length >= 3;
  }

  // 清理用户名
  static sanitizeUsername(username: string): string {
    if (typeof username !== 'string') return '';
    
    return username
      .trim()
      .replace(/[<>\"'&]/g, '') // 移除危险字符
      .substring(0, 50); // 限制长度
  }
}