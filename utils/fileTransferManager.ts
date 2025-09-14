// 文件传输管理器
import type { DataConnection } from 'peerjs';

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  sender: string;
  receiver: string;
  status: 'pending' | 'accepted' | 'rejected' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  chunks: Uint8Array[];
  totalChunks: number;
  receivedChunks: number;
  startTime?: number;
  endTime?: number;
  error?: string;
  previewUrl?: string; // 媒体文件预览URL
  thumbnailUrl?: string; // 缩略图URL
}

export interface FileTransferRequest {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  sender: string;
  timestamp: number;
}

export class FileTransferManager {
  private static instance: FileTransferManager;
  private transfers = new Map<string, FileTransfer>();
  private connections = new Map<string, DataConnection>();
  private chunkSize = 16384; // 16KB chunks
  private maxFileSize = 100 * 1024 * 1024; // 100MB limit
  private completedFiles = new Map<string, Blob>(); // 存储已完成的文件Blob
  
  private constructor() {}
  
  static getInstance(): FileTransferManager {
    if (!FileTransferManager.instance) {
      FileTransferManager.instance = new FileTransferManager();
    }
    return FileTransferManager.instance;
  }
  
  // 注册连接
  registerConnection(peerId: string, connection: DataConnection) {
    // 如果相同的 connection 已经注册过监听，避免重复注册（可能重复调用 registerConnection）
    const existing = this.connections.get(peerId);
    if (existing === connection && (connection as any).__ftm_registered) {
      return;
    }

    this.connections.set(peerId, connection);

    // 标记为已注册，避免重复绑定同一 connection
    (connection as any).__ftm_registered = true;

    connection.on('data', (data: any) => {
      this.handleIncomingData(peerId, data);
    });

    connection.on('close', () => {
      this.connections.delete(peerId);
      // 取消所有与此连接相关的传输
      this.cancelTransfersForPeer(peerId);
    });
  }
  
  // 发送文件
  async sendFile(file: File, receiverPeerId: string, senderName: string): Promise<string> {
    if (file.size > this.maxFileSize) {
      throw new Error(`文件太大，最大支持 ${this.maxFileSize / 1024 / 1024}MB`);
    }
    
    const connection = this.connections.get(receiverPeerId);
    if (!connection) {
      throw new Error('没有找到与接收者的连接');
    }
    
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // 为发送方创建本地预览URL
    let previewUrl: string | undefined;
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      previewUrl = URL.createObjectURL(file);
    }

    // 创建传输记录
    const transfer: FileTransfer = {
      id: transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      sender: senderName,
      receiver: receiverPeerId,
      status: 'transferring',
      progress: 0,
      chunks: [],
      totalChunks: Math.ceil(file.size / this.chunkSize),
      receivedChunks: 0,
      previewUrl: previewUrl, // 设置预览URL
    };
    
    this.transfers.set(transferId, transfer);
    
    // 发送文件传输请求
    const request: FileTransferRequest = {
      id: transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      sender: senderName,
      timestamp: Date.now()
    };
    
    try {
      // Notify peer a transfer is starting. We will start streaming immediately.
      try {
        connection.send({
          type: 'file_transfer_request',
          data: request
        });
      } catch (e) {
        // best-effort notify; ignore if send fails
      }

      console.log(`📤 开始发送文件: ${file.name} (${this.formatFileSize(file.size)})`);

      // Start streaming file data immediately
      this.startFileTransfer(transferId, file).catch(err => {
        console.error('startFileTransfer error', err);
        const t = this.transfers.get(transferId);
        if (t) {
          t.status = 'failed';
          t.error = err instanceof Error ? err.message : String(err);
        }
      });

      return transferId;

    } catch (error) {
      this.transfers.delete(transferId);
      throw error;
    }
  }
  
  // 接受文件传输
  acceptFileTransfer(transferId: string): boolean {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.status !== 'pending') {
      return false;
    }
    
    const connection = this.connections.get(transfer.sender);
    if (!connection) {
      return false;
    }
    
    transfer.status = 'accepted';
    transfer.startTime = Date.now();
    
    try {
      connection.send({
        type: 'file_transfer_response',
        data: {
          transferId,
          accepted: true
        }
      });
      
      console.log(`✅ 接受文件传输: ${transfer.fileName}`);
      return true;
      
    } catch (error) {
      console.error('发送接受响应失败:', error);
      return false;
    }
  }
  
  // 拒绝文件传输
  rejectFileTransfer(transferId: string): boolean {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.status !== 'pending') {
      return false;
    }
    
    const connection = this.connections.get(transfer.sender);
    if (!connection) {
      return false;
    }
    
    transfer.status = 'rejected';
    
    try {
      connection.send({
        type: 'file_transfer_response',
        data: {
          transferId,
          accepted: false
        }
      });
      
      console.log(`❌ 拒绝文件传输: ${transfer.fileName}`);
      this.transfers.delete(transferId);
      return true;
      
    } catch (error) {
      console.error('发送拒绝响应失败:', error);
      return false;
    }
  }
  
  // 取消文件传输
  cancelFileTransfer(transferId: string): boolean {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      return false;
    }
    
    // 确定要通知的peer ID
    const peerId = transfer.receiver || transfer.sender;
    
    const connection = this.connections.get(peerId);
    if (connection) {
      try {
        connection.send({
          type: 'file_transfer_cancel',
          data: { transferId }
        });
      } catch (error) {
        console.error('发送取消消息失败:', error);
      }
    }
    
    transfer.status = 'cancelled';
    console.log(`🚫 取消文件传输: ${transfer.fileName}`);
    
    // 延迟删除，给UI时间显示状态
    setTimeout(() => {
      this.transfers.delete(transferId);
    }, 3000);
    
    return true;
  }
  
  // 开始传输文件数据
  private async startFileTransfer(transferId: string, file: File) {
    const transfer = this.transfers.get(transferId);
    if (!transfer || (transfer.status === 'cancelled' || transfer.status === 'completed' || transfer.status === 'failed')) {
      console.log(`[fileTransfer] 跳过传输 ${transferId}: 状态=${transfer?.status || 'not found'}`);
      return;
    }
    
    const connection = this.connections.get(transfer.receiver || transfer.sender);
    if (!connection) {
      transfer.status = 'failed';
      transfer.error = '连接丢失';
      return;
    }
    
    transfer.status = 'transferring';
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      // 如果在读取过程中传输被取消或删除，停止继续处理
      const currentTransferAfterRead = this.transfers.get(transferId);
      if (!currentTransferAfterRead || currentTransferAfterRead.status === 'cancelled') {
        console.warn(`[fileTransfer] transfer ${transferId} cancelled during file read, aborting`);
        return;
      }
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 分块发送
      for (let i = 0; i < transfer.totalChunks; i++) {
        const start = i * this.chunkSize;
        const end = Math.min(start + this.chunkSize, uint8Array.length);
        const chunk = uint8Array.slice(start, end);
        
  await this.sendChunk(transferId, i, chunk);
        
        transfer.progress = Math.round(((i + 1) / transfer.totalChunks) * 100);
        
        // 检查是否被取消
        const currentTransfer = this.transfers.get(transferId);
        if (!currentTransfer || currentTransfer.status === 'cancelled') {
          return;
        }
        
        // 小延迟避免阻塞UI
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      // 发送传输完成信号
      connection.send({
        type: 'file_transfer_complete',
        data: { transferId }
      });
      
      transfer.status = 'completed';
      transfer.endTime = Date.now();
      transfer.progress = 100;
      
      console.log(`✅ 文件传输完成: ${transfer.fileName}`);
      
    } catch (error) {
      transfer.status = 'failed';
      transfer.error = error instanceof Error ? error.message : '传输失败';
      console.error('文件传输失败:', error);
    }
  }
  
  // 发送文件块
  private async sendChunk(transferId: string, chunkIndex: number, chunk: Uint8Array): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;
    
    const connection = this.connections.get(transfer.receiver || transfer.sender);
    if (!connection) {
      throw new Error('连接丢失');
    }
    // Try to use the underlying RTCDataChannel's bufferedAmount to apply backpressure
    const dc = (connection as any).dc || (connection as any)._dc || (connection as any).peerConnection;

    // If we can access bufferedAmount, wait while it's too large to avoid blowing memory
    const waitForBuffer = async () => {
      try {
        const threshold = 1 * 1024 * 1024; // 1MB threshold
        if (dc && typeof dc.bufferedAmount === 'number') {
          let attempts = 0;
          while (dc.bufferedAmount > threshold && attempts < 200) {
            // wait a short time for the buffer to drain
            await new Promise(res => setTimeout(res, 20));
            attempts++;
          }
        }
      } catch (e) {
        // ignore and proceed
      }
    };

    await waitForBuffer();

    return new Promise((resolve, reject) => {
      try {
        // Send the chunk as binary (ArrayBuffer) instead of converting to JS array.
        // Structured cloning of ArrayBuffer/Uint8Array works with WebRTC datachannels.
        connection.send({
          type: 'file_chunk',
          data: {
            transferId,
            chunkIndex,
            chunk: chunk.buffer || chunk,
            isLastChunk: chunkIndex === transfer.totalChunks - 1
          }
        });

        // Debug logging for backpressure visibility
        try {
          const ba = dc && typeof dc.bufferedAmount === 'number' ? dc.bufferedAmount : (connection as any).bufferedAmount;
          if (typeof ba === 'number') {
            console.debug(`[fileTransfer] sent chunk ${chunkIndex} transfer=${transferId} bufferedAmount=${ba}`);
          }
        } catch (e) {
          // noop
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // 处理接收到的数据
  private handleIncomingData(peerId: string, data: any) {
    switch (data.type) {
      case 'file_transfer_request':
        this.handleFileTransferRequest(peerId, data.data);
        break;
        
      case 'file_transfer_response':
        this.handleFileTransferResponse(peerId, data.data);
        break;
        
      case 'file_chunk':
        this.handleFileChunk(peerId, data.data);
        break;
        
      case 'file_transfer_complete':
        this.handleFileTransferComplete(peerId, data.data);
        break;
        
      case 'file_transfer_cancel':
        this.handleFileTransferCancel(peerId, data.data);
        break;
    }
  }
  
  // 处理文件传输请求
  private handleFileTransferRequest(peerId: string, request: FileTransferRequest) {
    const transfer: FileTransfer = {
      id: request.id,
      fileName: request.fileName,
      fileSize: request.fileSize,
      fileType: request.fileType,
      sender: peerId,
      receiver: '', // 当前用户
      status: 'transferring',
      progress: 0,
      chunks: new Array(Math.ceil(request.fileSize / this.chunkSize)),
      totalChunks: Math.ceil(request.fileSize / this.chunkSize),
      receivedChunks: 0
    };
    
    this.transfers.set(request.id, transfer);
    
    console.log(`📥 自动接收文件传输: ${request.fileName} 来自 ${request.sender}`);
    // Auto-accept: ready to receive chunks immediately
  }
  
  // 处理文件传输响应
  private async handleFileTransferResponse(peerId: string, response: { transferId: string; accepted: boolean }) {
    const transfer = this.transfers.get(response.transferId);
    if (!transfer) return;
    
    if (response.accepted) {
      console.log(`✅ 文件传输被接受: ${transfer.fileName}`);
      
      // 开始传输文件（需要原始文件对象）
      // 这里需要从UI获取文件对象
      // In simplified flow, sender already started streaming; nothing to do here.
    } else {
      console.log(`❌ 文件传输被拒绝: ${transfer.fileName}`);
      transfer.status = 'rejected';
      setTimeout(() => {
        this.transfers.delete(response.transferId);
      }, 3000);
    }
  }
  
  // 处理文件块
  private handleFileChunk(peerId: string, chunkData: any) {
    const { transferId, chunkIndex, chunk } = chunkData;
    const transfer = this.transfers.get(transferId);
    
    if (!transfer) {
      console.warn(`[fileTransfer] 收到未知传输的块: ${transferId}`);
      return;
    }
    if (transfer.status === 'cancelled' || transfer.status === 'completed' || transfer.status === 'failed') {
      console.warn(`[fileTransfer] 忽略已结束传输的块: ${transferId} status=${transfer.status}`);
      return;
    }

    // 如果是第一个块，更新状态为传输中
    if (transfer.status !== 'transferring') {
      transfer.status = 'transferring';
      transfer.startTime = Date.now();
    }

    // 防止重复计数：如果已存在该索引，则忽略（网络重传或重复消息）
    if (transfer.chunks[chunkIndex]) {
      console.debug(`[fileTransfer] duplicate chunk ignored transfer=${transferId} idx=${chunkIndex}`);
      return;
    }

    // 转换回Uint8Array（支持 Array, ArrayBuffer, Uint8Array）
    let chunkUint8: Uint8Array;
    if (chunk instanceof Uint8Array) {
      chunkUint8 = chunk;
    } else if (chunk instanceof ArrayBuffer) {
      chunkUint8 = new Uint8Array(chunk);
    } else if (Array.isArray(chunk)) {
      chunkUint8 = new Uint8Array(chunk);
    } else if (chunk && chunk.buffer) {
      // e.g. structured clone of Uint8Array-like object
      chunkUint8 = new Uint8Array(chunk.buffer);
    } else {
      // fallback: try to coerce
      chunkUint8 = new Uint8Array(chunk);
    }

    transfer.chunks[chunkIndex] = chunkUint8;
    transfer.receivedChunks = (transfer.receivedChunks || 0) + 1;
    transfer.progress = Math.round((transfer.receivedChunks / transfer.totalChunks) * 100);

    if (transfer.receivedChunks === transfer.totalChunks) {
      // 所有块都收到了，组装文件
      this.assembleFile(transfer);
    }
  }
  
  // 组装文件
  private assembleFile(transfer: FileTransfer) {
    try {
      // 计算总大小
      const totalSize = transfer.chunks.reduce((sum, chunk) => sum + (chunk?.length || 0), 0);
      const assembledData = new Uint8Array(totalSize);
      
      let offset = 0;
      for (const chunk of transfer.chunks) {
        if (chunk) {
          assembledData.set(chunk, offset);
          offset += chunk.length;
        }
      }
      
      // 创建Blob
      const blob = new Blob([assembledData], { type: transfer.fileType });
      
      // 存储文件Blob供预览使用
      this.completedFiles.set(transfer.id, blob);
      
      // 为媒体文件创建预览URL
      if (this.isMediaFile(transfer.fileType)) {
        transfer.previewUrl = URL.createObjectURL(blob);
        
        // 为图片生成缩略图
        if (transfer.fileType.startsWith('image/')) {
          this.generateThumbnail(blob, transfer.fileType).then(thumbnailUrl => {
            if (thumbnailUrl) {
              transfer.thumbnailUrl = thumbnailUrl;
            }
          });
        }
      }
      
      // Do not auto-download. Let UI offer preview/save actions.
      transfer.status = 'completed';
      transfer.endTime = Date.now();
      transfer.progress = 100;
      
      console.log(`✅ 文件接收完成: ${transfer.fileName}`);
      
      // 通知UI文件接收完成（UI 可以提供预览或保存）
      this.notifyFileReceived(transfer);
      
    } catch (error) {
      transfer.status = 'failed';
      transfer.error = error instanceof Error ? error.message : '文件组装失败';
      console.error('文件组装失败:', error);
    }
  }
  
  // 处理传输完成
  private handleFileTransferComplete(peerId: string, data: { transferId: string }) {
    const transfer = this.transfers.get(data.transferId);
    if (transfer) {
      transfer.status = 'completed';
      transfer.endTime = Date.now();
      console.log(`✅ 文件传输完成确认: ${transfer.fileName}`);
    }
  }
  
  // 处理传输取消
  private handleFileTransferCancel(peerId: string, data: { transferId: string }) {
    const transfer = this.transfers.get(data.transferId);
    if (transfer) {
      transfer.status = 'cancelled';
      console.log(`🚫 文件传输被取消: ${transfer.fileName}`);
      
      setTimeout(() => {
        this.transfers.delete(data.transferId);
      }, 3000);
    }
  }
  
  // 取消与特定peer相关的所有传输
  private cancelTransfersForPeer(peerId: string) {
    for (const [transferId, transfer] of this.transfers) {
      if (transfer.sender === peerId || transfer.receiver === peerId) {
        if (transfer.status === 'transferring' || transfer.status === 'accepted' || transfer.status === 'pending') {
          transfer.status = 'cancelled';
          transfer.error = '连接断开';
        }
      }
    }
  }
  
  // 获取传输列表
  getTransfers(): FileTransfer[] {
    return Array.from(this.transfers.values());
  }
  
  // 获取特定传输
  getTransfer(transferId: string): FileTransfer | undefined {
    return this.transfers.get(transferId);
  }
  
  // 格式化文件大小
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // (old request/accept notification removed - transfers auto-start)
  
  // 开始文件传输（从UI调用）
  async startTransferWithFile(transferId: string, file: File) {
    await this.startFileTransfer(transferId, file);
  }
  
  // 判断是否为媒体文件
  private isMediaFile(fileType: string): boolean {
    return fileType.startsWith('image/') || 
           fileType.startsWith('video/') || 
           fileType.startsWith('audio/');
  }
  
  // 生成图片缩略图
  private async generateThumbnail(blob: Blob, fileType: string): Promise<string | null> {
    if (!fileType.startsWith('image/')) {
      return null;
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(null);
        return;
      }
      
      img.onload = () => {
        // 设置缩略图尺寸
        const maxSize = 150;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制缩略图
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为Blob URL
        canvas.toBlob((thumbnailBlob) => {
          if (thumbnailBlob) {
            const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
            resolve(thumbnailUrl);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.8);
        
        // 清理
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(img.src);
      };
      
      img.src = URL.createObjectURL(blob);
    });
  }
  
  // 获取文件预览URL
  getFilePreviewUrl(transferId: string): string | null {
    const transfer = this.transfers.get(transferId);
    if (transfer && transfer.previewUrl) {
      return transfer.previewUrl;
    }
    
    const blob = this.completedFiles.get(transferId);
    if (blob) {
      const url = URL.createObjectURL(blob);
      // 更新传输记录
      if (transfer) {
        transfer.previewUrl = url;
      }
      return url;
    }
    
    return null;
  }
  
  // 获取文件Blob
  getFileBlob(transferId: string): Blob | null {
    return this.completedFiles.get(transferId) || null;
  }
  
  // 清理文件资源
  cleanupFileResources(transferId: string) {
    const transfer = this.transfers.get(transferId);
    if (transfer) {
      if (transfer.previewUrl) {
        URL.revokeObjectURL(transfer.previewUrl);
        transfer.previewUrl = undefined;
      }
      if (transfer.thumbnailUrl) {
        URL.revokeObjectURL(transfer.thumbnailUrl);
        transfer.thumbnailUrl = undefined;
      }
    }
    
    this.completedFiles.delete(transferId);
  }
  
  // 通知UI文件接收完成
  private notifyFileReceived(transfer: FileTransfer) {
    window.dispatchEvent(new CustomEvent('fileReceived', {
      detail: transfer
    }));
  }
}

export default FileTransferManager;