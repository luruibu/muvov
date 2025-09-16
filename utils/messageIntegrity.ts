// 简单的消息完整性校验工具
export class MessageIntegrity {
  // 生成消息hash
  static async generateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  // 验证消息完整性
  static async verifyHash(content: string, expectedHash: string): Promise<boolean> {
    const actualHash = await this.generateHash(content);
    return actualHash === expectedHash;
  }

  // 生成消息ID
  static generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}