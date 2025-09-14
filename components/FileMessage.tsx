import React, { useState, useEffect } from 'react';
import { FileTransfer } from '../utils/fileTransferManager';
import { useFileTransfer } from '../hooks/useFileTransfer';

interface FileMessageProps {
  transferId: string;
  isSender: boolean;
}

export const FileMessage: React.FC<FileMessageProps> = ({ transferId, isSender }) => {
  const { getTransfer, cancelFileTransfer, getFilePreviewUrl, getFileBlob, formatFileSize } = useFileTransfer(null, '');
  const [transfer, setTransfer] = useState<FileTransfer | undefined>(getTransfer(transferId));

  useEffect(() => {
    const update = () => {
      setTransfer(getTransfer(transferId));
    };
    update(); // Initial update
    const interval = setInterval(update, 1000); // Poll for updates
    return () => clearInterval(interval);
  }, [transferId, getTransfer]);

  if (!transfer) {
    return (
      <div className={`p-3 rounded-lg max-w-xs break-words ${isSender ? 'bg-sky-600 text-white self-end' : 'bg-slate-700 text-slate-200 self-start'}`}>
        <p className="text-sm">文件传输信息加载中...</p>
      </div>
    );
  }

  const handleSave = () => {
    const blob = getFileBlob(transfer.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = transfer.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const renderContent = () => {
    switch (transfer.status) {
      case 'transferring':
        return (
          <>
            <div className="flex justify-between items-center text-sm mb-1">
              <span>{transfer.progress}%</span>
              <button onClick={() => cancelFileTransfer(transfer.id)} className="text-red-300 hover:text-red-200 text-xs">取消</button>
            </div>
            <div className="w-full bg-slate-500 rounded-full h-2">
              <div className="bg-sky-400 h-2 rounded-full" style={{ width: `${transfer.progress}%` }}></div>
            </div>
          </>
        );
      case 'completed':
        const previewUrl = getFilePreviewUrl(transfer.id);
        return (
          <>
            {previewUrl && (transfer.fileType.startsWith('image/') || transfer.fileType.startsWith('video/')) ? (
              transfer.fileType.startsWith('image/') ? (
                <img src={previewUrl} alt={transfer.fileName} className="max-w-full max-h-48 rounded-md my-2 cursor-pointer" onClick={() => window.open(previewUrl, '_blank')} />
              ) : (
                <video src={previewUrl} controls className="max-w-full max-h-48 rounded-md my-2" />
              )
            ) : (
              <div className="my-2 p-2 bg-slate-600 rounded-md text-center">
                <p className="text-sm">不支持预览</p>
              </div>
            )}
            <button onClick={handleSave} className="mt-2 w-full bg-sky-500 hover:bg-sky-400 text-white px-3 py-1 rounded text-sm font-medium">
              保存
            </button>
          </>
        );
      case 'failed':
      case 'cancelled':
        return <p className="text-red-300 text-sm">{transfer.status === 'failed' ? `传输失败: ${transfer.error}` : '已取消'}</p>;
      default:
        return <p className="text-sm">等待中...</p>;
    }
  };

  return (
    <div className={`p-3 rounded-lg max-w-xs break-words ${isSender ? 'bg-sky-700 text-white self-end' : 'bg-slate-600 text-slate-200 self-start'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">📄</span>
        <div>
          <p className="font-medium text-sm">{transfer.fileName}</p>
          <p className="text-xs text-slate-300">{formatFileSize(transfer.fileSize)}</p>
        </div>
      </div>
      {renderContent()}
    </div>
  );
};
