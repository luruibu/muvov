// File transfer manager
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
  previewUrl?: string; // Media file preview URL
  thumbnailUrl?: string; // Thumbnail URL
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
  private completedFiles = new Map<string, Blob>(); // Store completed file blobs
  
  private constructor() {}
  
  static getInstance(): FileTransferManager {
    if (!FileTransferManager.instance) {
      FileTransferManager.instance = new FileTransferManager();
    }
    return FileTransferManager.instance;
  }
  
  // Register connection
  registerConnection(peerId: string, connection: DataConnection) {
    // If the same connection has already registered listeners, avoid duplicate registration
    const existing = this.connections.get(peerId);
    if (existing === connection && (connection as any).__ftm_registered) {
      return;
    }

    this.connections.set(peerId, connection);

    // Mark as registered to avoid duplicate binding of the same connection
    (connection as any).__ftm_registered = true;

    connection.on('data', (data: any) => {
      this.handleIncomingData(peerId, data);
    });

    connection.on('close', () => {
      this.connections.delete(peerId);
      // Cancel all transfers related to this connection
      this.cancelTransfersForPeer(peerId);
    });
  }
  
  // Send file
  async sendFile(file: File, receiverPeerId: string, senderName: string): Promise<string> {
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large, maximum supported ${this.maxFileSize / 1024 / 1024}MB`);
    }
    
    const connection = this.connections.get(receiverPeerId);
    if (!connection) {
      throw new Error('No connection found to receiver');
    }
    
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Create local preview URL for sender
    let previewUrl: string | undefined;
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      previewUrl = URL.createObjectURL(file);
    }

    // Create transfer record
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
      previewUrl: previewUrl, // Set preview URL
    };
    
    this.transfers.set(transferId, transfer);
    
    // Send file transfer request
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

      console.log(`📤 Starting to send file: ${file.name} (${this.formatFileSize(file.size)})`);

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
  
  // Accept file transfer
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
      
      console.log(`✅ Accept file transfer: ${transfer.fileName}`);
      return true;
      
    } catch (error) {
      console.error('Failed to send accept response:', error);
      return false;
    }
  }
  
  // Reject file transfer
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
      
      console.log(`❌ Reject file transfer: ${transfer.fileName}`);
      this.transfers.delete(transferId);
      return true;
      
    } catch (error) {
      console.error('Failed to send reject response:', error);
      return false;
    }
  }
  
  // Cancel file transfer
  cancelFileTransfer(transferId: string): boolean {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      return false;
    }
    
    // Determine peer ID to notify
    const peerId = transfer.receiver || transfer.sender;
    
    const connection = this.connections.get(peerId);
    if (connection) {
      try {
        connection.send({
          type: 'file_transfer_cancel',
          data: { transferId }
        });
      } catch (error) {
        console.error('Failed to send cancel message:', error);
      }
    }
    
    transfer.status = 'cancelled';
    console.log(`🚫 Cancel file transfer: ${transfer.fileName}`);
    
    // Delayed deletion to give UI time to show status
    setTimeout(() => {
      this.transfers.delete(transferId);
    }, 3000);
    
    return true;
  }
  
  // Start transferring file data
  private async startFileTransfer(transferId: string, file: File) {
    const transfer = this.transfers.get(transferId);
    if (!transfer || (transfer.status === 'cancelled' || transfer.status === 'completed' || transfer.status === 'failed')) {
      console.log(`[fileTransfer] Skip transfer ${transferId}: status=${transfer?.status || 'not found'}`);
      return;
    }
    
    const connection = this.connections.get(transfer.receiver || transfer.sender);
    if (!connection) {
      transfer.status = 'failed';
      transfer.error = 'Connection lost';
      return;
    }
    
    transfer.status = 'transferring';
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      // If transfer was cancelled or deleted during reading, stop processing
      const currentTransferAfterRead = this.transfers.get(transferId);
      if (!currentTransferAfterRead || currentTransferAfterRead.status === 'cancelled') {
        console.warn(`[fileTransfer] transfer ${transferId} cancelled during file read, aborting`);
        return;
      }
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Send in chunks
      for (let i = 0; i < transfer.totalChunks; i++) {
        const start = i * this.chunkSize;
        const end = Math.min(start + this.chunkSize, uint8Array.length);
        const chunk = uint8Array.slice(start, end);
        
  await this.sendChunk(transferId, i, chunk);
        
        transfer.progress = Math.round(((i + 1) / transfer.totalChunks) * 100);
        
        // Check if cancelled
        const currentTransfer = this.transfers.get(transferId);
        if (!currentTransfer || currentTransfer.status === 'cancelled') {
          return;
        }
        
        // Small delay to avoid blocking UI
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      // Send transfer complete signal
      connection.send({
        type: 'file_transfer_complete',
        data: { transferId }
      });
      
      transfer.status = 'completed';
      transfer.endTime = Date.now();
      transfer.progress = 100;
      
      console.log(`✅ File transfer completed: ${transfer.fileName}`);
      
    } catch (error) {
      transfer.status = 'failed';
      transfer.error = error instanceof Error ? error.message : 'Transfer failed';
      console.error('File transfer failed:', error);
    }
  }
  
  // Send file chunk
  private async sendChunk(transferId: string, chunkIndex: number, chunk: Uint8Array): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;
    
    const connection = this.connections.get(transfer.receiver || transfer.sender);
    if (!connection) {
      throw new Error('Connection lost');
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
  
  // Handle received data
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
  
  // Handle file transfer request
  private handleFileTransferRequest(peerId: string, request: FileTransferRequest) {
    const transfer: FileTransfer = {
      id: request.id,
      fileName: request.fileName,
      fileSize: request.fileSize,
      fileType: request.fileType,
      sender: peerId,
      receiver: '', // Current user
      status: 'transferring',
      progress: 0,
      chunks: new Array(Math.ceil(request.fileSize / this.chunkSize)),
      totalChunks: Math.ceil(request.fileSize / this.chunkSize),
      receivedChunks: 0
    };
    
    this.transfers.set(request.id, transfer);
    
    console.log(`📥 Auto-accept file transfer: ${request.fileName} from ${request.sender}`);
    // Auto-accept: ready to receive chunks immediately
  }
  
  // Handle file transfer response
  private async handleFileTransferResponse(peerId: string, response: { transferId: string; accepted: boolean }) {
    const transfer = this.transfers.get(response.transferId);
    if (!transfer) return;
    
    if (response.accepted) {
      console.log(`✅ File transfer accepted: ${transfer.fileName}`);
      
      // Start transferring file (needs original file object)
      // Need to get file object from UI here
      // In simplified flow, sender already started streaming; nothing to do here.
    } else {
      console.log(`❌ File transfer rejected: ${transfer.fileName}`);
      transfer.status = 'rejected';
      setTimeout(() => {
        this.transfers.delete(response.transferId);
      }, 3000);
    }
  }
  
  // Handle file chunk
  private handleFileChunk(peerId: string, chunkData: any) {
    const { transferId, chunkIndex, chunk } = chunkData;
    const transfer = this.transfers.get(transferId);
    
    if (!transfer) {
      console.warn(`[fileTransfer] Received chunk for unknown transfer: ${transferId}`);
      return;
    }
    if (transfer.status === 'cancelled' || transfer.status === 'completed' || transfer.status === 'failed') {
      console.warn(`[fileTransfer] Ignoring chunk for ended transfer: ${transferId} status=${transfer.status}`);
      return;
    }

    // If first chunk, update status to transferring
    if (transfer.status !== 'transferring') {
      transfer.status = 'transferring';
      transfer.startTime = Date.now();
    }

    // Prevent duplicate counting: ignore if index already exists (network retransmission or duplicate messages)
    if (transfer.chunks[chunkIndex]) {
      console.debug(`[fileTransfer] duplicate chunk ignored transfer=${transferId} idx=${chunkIndex}`);
      return;
    }

    // Convert back to Uint8Array (supports Array, ArrayBuffer, Uint8Array)
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
      // All chunks received, assemble file
      this.assembleFile(transfer);
    }
  }
  
  // Assemble file
  private assembleFile(transfer: FileTransfer) {
    try {
      // Calculate total size
      const totalSize = transfer.chunks.reduce((sum, chunk) => sum + (chunk?.length || 0), 0);
      const assembledData = new Uint8Array(totalSize);
      
      let offset = 0;
      for (const chunk of transfer.chunks) {
        if (chunk) {
          assembledData.set(chunk, offset);
          offset += chunk.length;
        }
      }
      
      // Create Blob
      const blob = new Blob([assembledData], { type: transfer.fileType });
      
      // Store file Blob for preview use
      this.completedFiles.set(transfer.id, blob);
      
      // Create preview URL for media files
      if (this.isMediaFile(transfer.fileType)) {
        transfer.previewUrl = URL.createObjectURL(blob);
        
        // Generate thumbnail for images
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
      
      console.log(`✅ File reception completed: ${transfer.fileName}`);
      
      // Notify UI that file reception is complete (UI can provide preview or save)
      this.notifyFileReceived(transfer);
      
    } catch (error) {
      transfer.status = 'failed';
      transfer.error = error instanceof Error ? error.message : 'File assembly failed';
      console.error('File assembly failed:', error);
    }
  }
  
  // Handle transfer completion
  private handleFileTransferComplete(peerId: string, data: { transferId: string }) {
    const transfer = this.transfers.get(data.transferId);
    if (transfer) {
      transfer.status = 'completed';
      transfer.endTime = Date.now();
      console.log(`✅ File transfer completion confirmed: ${transfer.fileName}`);
    }
  }
  
  // Handle transfer cancellation
  private handleFileTransferCancel(peerId: string, data: { transferId: string }) {
    const transfer = this.transfers.get(data.transferId);
    if (transfer) {
      transfer.status = 'cancelled';
      console.log(`🚫 File transfer cancelled: ${transfer.fileName}`);
      
      setTimeout(() => {
        this.transfers.delete(data.transferId);
      }, 3000);
    }
  }
  
  // Cancel all transfers related to specific peer
  private cancelTransfersForPeer(peerId: string) {
    for (const [transferId, transfer] of this.transfers) {
      if (transfer.sender === peerId || transfer.receiver === peerId) {
        if (transfer.status === 'transferring' || transfer.status === 'accepted' || transfer.status === 'pending') {
          transfer.status = 'cancelled';
          transfer.error = 'Connection disconnected';
        }
      }
    }
  }
  
  // Get transfer list
  getTransfers(): FileTransfer[] {
    return Array.from(this.transfers.values());
  }
  
  // Get specific transfer
  getTransfer(transferId: string): FileTransfer | undefined {
    return this.transfers.get(transferId);
  }
  
  // Format file size
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // (old request/accept notification removed - transfers auto-start)
  
  // Start file transfer (called from UI)
  async startTransferWithFile(transferId: string, file: File) {
    await this.startFileTransfer(transferId, file);
  }
  
  // Check if it's a media file
  private isMediaFile(fileType: string): boolean {
    return fileType.startsWith('image/') || 
           fileType.startsWith('video/') || 
           fileType.startsWith('audio/');
  }
  
  // Generate image thumbnail
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
        // Set thumbnail size
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
        
        // Draw thumbnail
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to Blob URL
        canvas.toBlob((thumbnailBlob) => {
          if (thumbnailBlob) {
            const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
            resolve(thumbnailUrl);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.8);
        
        // Cleanup
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(img.src);
      };
      
      img.src = URL.createObjectURL(blob);
    });
  }
  
  // Get file preview URL
  getFilePreviewUrl(transferId: string): string | null {
    const transfer = this.transfers.get(transferId);
    if (transfer && transfer.previewUrl) {
      return transfer.previewUrl;
    }
    
    const blob = this.completedFiles.get(transferId);
    if (blob) {
      const url = URL.createObjectURL(blob);
      // Update transfer record
      if (transfer) {
        transfer.previewUrl = url;
      }
      return url;
    }
    
    return null;
  }
  
  // Get file Blob
  getFileBlob(transferId: string): Blob | null {
    return this.completedFiles.get(transferId) || null;
  }
  
  // Clean up file resources
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
  
  // Notify UI that file reception is complete
  private notifyFileReceived(transfer: FileTransfer) {
    window.dispatchEvent(new CustomEvent('fileReceived', {
      detail: transfer
    }));
  }
}

export default FileTransferManager;