// Input sanitization utility
export class InputSanitizer {
  // Sanitize log input to prevent log injection
  static sanitizeForLog(input: string): string {
    if (typeof input !== 'string') return String(input);
    
    return input
      .replace(/[\r\n]/g, ' ') // Remove line breaks
      .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
      .substring(0, 200); // Limit length
  }

  // Sanitize HTML input to prevent XSS
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

  // Validate PeerID format - relaxed restrictions to support more formats
  static isValidPeerId(peerId: string): boolean {
    if (typeof peerId !== 'string') return false;
    // Support more PeerID formats, including default generated formats
    return /^[a-zA-Z0-9_-]{3,50}$/.test(peerId) && peerId.length >= 3;
  }

  // Sanitize username
  static sanitizeUsername(username: string): string {
    if (typeof username !== 'string') return '';
    
    return username
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove dangerous characters
      .substring(0, 50); // Limit length
  }
}