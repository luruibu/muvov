// Encrypted backup utility
export class BackupManager {
  // Generate backup data
  static generateBackupData(): any {
    const data = {
      identity: JSON.parse(localStorage.getItem('meshchat_current_identity') || '{}'),
      identities: JSON.parse(localStorage.getItem('meshchat_identities') || '[]'),
      friends: {},
      settings: JSON.parse(localStorage.getItem('meshchat_system_settings') || 'null'),
      timestamp: Date.now(),
      version: '1.1'
    };

    // Collect friends data for all identities
    data.identities.forEach((identity: any) => {
      const friendsKey = `meshchat_friends_${identity.peerId}`;
      const friendsData = localStorage.getItem(friendsKey);
      if (friendsData) {
        try {
          const parsed = JSON.parse(friendsData);
          data.friends[identity.peerId] = Array.isArray(parsed) ? parsed : parsed.friends || [];
        } catch (error) {
          console.warn('Failed to parse friends data for', identity.peerId);
        }
      }
    });

    return data;
  }

  // Encrypt data
  static async encryptData(data: any, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    
    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(dataString)
    );
    
    // Combine salt, IV and encrypted data
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Convert to Base64
    return btoa(String.fromCharCode(...result));
  }

  // Decrypt data
  static async decryptData(encryptedData: string, password: string): Promise<any> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    
    // Decode from Base64
    const data = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    
    // Extract salt, IV and encrypted data
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encrypted = data.slice(28);
    
    // Derive key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    
    return JSON.parse(decoder.decode(decrypted));
  }

  // Create backup file
  static async createBackup(password: string): Promise<void> {
    try {
      const data = this.generateBackupData();
      const encrypted = await this.encryptData(data, password);
      
      const blob = new Blob([encrypted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `meshchat-backup-${new Date().toISOString().split('T')[0]}.mcb`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error('Failed to create backup: ' + error.message);
    }
  }

  // Restore backup
  static async restoreBackup(file: File, password: string): Promise<void> {
    try {
      const encryptedData = await file.text();
      const data = await this.decryptData(encryptedData, password);
      
      // Validate backup format
      if (!data.version || !data.timestamp) {
        throw new Error('Invalid backup file format');
      }
      
      // Restore identity data
      if (data.identity && Object.keys(data.identity).length > 0) {
        localStorage.setItem('meshchat_current_identity', JSON.stringify(data.identity));
      }
      
      if (data.identities && Array.isArray(data.identities)) {
        localStorage.setItem('meshchat_identities', JSON.stringify(data.identities));
      }
      
      // Restore friends data
      if (data.friends) {
        Object.entries(data.friends).forEach(([peerId, friends]) => {
          const friendsKey = `meshchat_friends_${peerId}`;
          const friendsData = {
            friends: friends,
            lastUpdated: Date.now(),
            tabId: `restore_${Date.now()}`
          };
          localStorage.setItem(friendsKey, JSON.stringify(friendsData));
        });
      }
      
      // Restore system settings
      if (data.settings) {
        localStorage.setItem('meshchat_system_settings', JSON.stringify(data.settings));
      }
      
    } catch (error) {
      if (error.message.includes('decrypt')) {
        throw new Error('Invalid password or corrupted backup file');
      }
      throw new Error('Failed to restore backup: ' + error.message);
    }
  }
}