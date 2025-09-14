// 文件传输Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import FileTransferManager, { FileTransfer } from '../utils/fileTransferManager';
import type { DataConnection } from 'peerjs';

export const useFileTransfer = (peer: any, localUsername: string) => {
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FileTransfer[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const fileTransferManager = useRef(FileTransferManager.getInstance());
  

  // 更新传输列表
  const updateTransfers = useCallback(() => {
    const allTransfers = fileTransferManager.current.getTransfers();
    setTransfers(allTransfers);
    
    // 将来自其他人的未完成传输视为传入文件（自动接受后仍可查看）
    const incoming = allTransfers.filter(t => t.sender !== localUsername && (t.status === 'pending' || t.status === 'transferring'));
    setIncomingRequests(incoming);
  }, [localUsername]);

  // 发送文件
  const sendFile = useCallback(async (file: File, receiverPeerId: string): Promise<string> => {
    try {
      const transferId = await fileTransferManager.current.sendFile(file, receiverPeerId, localUsername);
      updateTransfers();
      return transferId;
    } catch (error) {
      console.error('发送文件失败:', error);
      throw error;
    }
  }, [localUsername, updateTransfers]);

  // acceptance is automatic in simplified flow; expose no-op wrappers for compatibility
  const acceptFileTransfer = useCallback((transferId: string) => {
    const success = fileTransferManager.current.acceptFileTransfer(transferId);
    if (success) updateTransfers();
    return success;
  }, [updateTransfers]);

  const rejectFileTransfer = useCallback((transferId: string) => {
    // No reject in simplified flow - just cancel instead
    const success = fileTransferManager.current.cancelFileTransfer(transferId);
    if (success) updateTransfers();
    return success;
  }, [updateTransfers]);

  // 取消文件传输
  const cancelFileTransfer = useCallback((transferId: string) => {
    const success = fileTransferManager.current.cancelFileTransfer(transferId);
    if (success) {
      updateTransfers();
    }
    return success;
  }, [updateTransfers]);

  // 注册连接
  const registerConnection = useCallback((peerId: string, connection: DataConnection) => {
    fileTransferManager.current.registerConnection(peerId, connection);
  }, []);

  // No longer need to listen for request/accepted events - transfers are automatic

  // 定期更新传输状态
  useEffect(() => {
    const interval = setInterval(updateTransfers, 1000);
    return () => clearInterval(interval);
  }, [updateTransfers]);

  // 清理
  useEffect(() => {
    return () => {
      // nothing to clean up in simplified flow
    };
  }, []);

  // 获取活跃传输（正在进行的）
  const getActiveTransfers = useCallback(() => {
    return transfers.filter(t => 
      t.status === 'transferring' || 
      t.status === 'accepted' || 
      t.status === 'pending'
    );
  }, [transfers]);

  // 获取已完成传输
  const getCompletedTransfers = useCallback(() => {
    return transfers.filter(t => 
      t.status === 'completed' || 
      t.status === 'failed' || 
      t.status === 'cancelled' ||
      t.status === 'rejected'
    );
  }, [transfers]);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // 格式化传输速度
  const formatTransferSpeed = useCallback((transfer: FileTransfer): string => {
    if (!transfer.startTime || transfer.status !== 'transferring') {
      return '';
    }
    
    const elapsed = (Date.now() - transfer.startTime) / 1000; // 秒
    const bytesTransferred = (transfer.progress / 100) * transfer.fileSize;
    const speed = bytesTransferred / elapsed; // bytes/second
    
    return formatFileSize(speed) + '/s';
  }, [formatFileSize]);

  // 估算剩余时间
  const estimateRemainingTime = useCallback((transfer: FileTransfer): string => {
    if (!transfer.startTime || transfer.status !== 'transferring' || transfer.progress === 0) {
      return '';
    }
    
    const elapsed = (Date.now() - transfer.startTime) / 1000;
    const bytesTransferred = (transfer.progress / 100) * transfer.fileSize;
    const speed = bytesTransferred / elapsed;
    const remainingBytes = transfer.fileSize - bytesTransferred;
    const remainingSeconds = remainingBytes / speed;
    
    if (remainingSeconds < 60) {
      return `${Math.round(remainingSeconds)}秒`;
    } else if (remainingSeconds < 3600) {
      return `${Math.round(remainingSeconds / 60)}分钟`;
    } else {
      return `${Math.round(remainingSeconds / 3600)}小时`;
    }
  }, []);

  const getFilePreviewUrl = useCallback((transferId: string) => {
    return fileTransferManager.current.getFilePreviewUrl(transferId);
  }, []);

  const getFileBlob = useCallback((transferId: string) => {
    return fileTransferManager.current.getFileBlob(transferId);
  }, []);

  const getTransfer = useCallback((transferId: string) => {
    return fileTransferManager.current.getTransfer(transferId);
  }, []);

  return {
    transfers,
    incomingRequests,
    isTransferModalOpen,
    setIsTransferModalOpen,
    sendFile,
    acceptFileTransfer,
    rejectFileTransfer,
    cancelFileTransfer,
    registerConnection,
    getActiveTransfers,
    getCompletedTransfers,
    formatFileSize,
    formatTransferSpeed,
    estimateRemainingTime,
    getFilePreviewUrl,
    getFileBlob,
    getTransfer,
  };
};

export default useFileTransfer;