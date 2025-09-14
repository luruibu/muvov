// 文件传输模态框
import React, { useState } from 'react';
import { FileTransfer } from '../utils/fileTransferManager';
import FileTransferManager from '../utils/fileTransferManager';

interface FileTransferModalProps {
  isVisible: boolean;
  onClose: () => void;
  incomingRequests: FileTransfer[];
  activeTransfers: FileTransfer[];
  completedTransfers: FileTransfer[];
  onAcceptTransfer: (transferId: string) => void;
  onRejectTransfer: (transferId: string) => void;
  onCancelTransfer: (transferId: string) => void;
  formatFileSize: (bytes: number) => string;
  formatTransferSpeed: (transfer: FileTransfer) => string;
  estimateRemainingTime: (transfer: FileTransfer) => string;
}

export const FileTransferModal: React.FC<FileTransferModalProps> = ({
  isVisible,
  onClose,
  incomingRequests,
  activeTransfers,
  completedTransfers,
  onAcceptTransfer,
  onRejectTransfer,
  onCancelTransfer,
  formatFileSize,
  formatTransferSpeed,
  estimateRemainingTime
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'active' | 'completed'>('requests');

  if (!isVisible) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'accepted': return '✅';
      case 'rejected': return '❌';
      case 'transferring': return '📤';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待响应';
      case 'accepted': return '已接受';
      case 'rejected': return '已拒绝';
      case 'transferring': return '传输中';
      case 'completed': return '已完成';
      case 'failed': return '传输失败';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'accepted': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'transferring': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-100 font-medium text-lg">文件传输</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-300 text-xl">✕</button>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-4 bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'requests' 
                ? 'bg-sky-600 text-white' 
                : 'text-slate-300 hover:text-white hover:bg-slate-600'
            }`}
          >
            传入文件 {incomingRequests.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'active' 
                ? 'bg-sky-600 text-white' 
                : 'text-slate-300 hover:text-white hover:bg-slate-600'
            }`}
          >
            进行中 {activeTransfers.length > 0 && (
              <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeTransfers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'completed' 
                ? 'bg-sky-600 text-white' 
                : 'text-slate-300 hover:text-white hover:bg-slate-600'
            }`}
          >
            已完成 ({completedTransfers.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* 传输请求 */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {incomingRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">📥</div>
                  <p>暂无传入文件</p>
                </div>
              ) : (
                incomingRequests.map(transfer => (
                  <div key={transfer.id} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">📄</span>
                          <div>
                            <h4 className="text-slate-100 font-medium">{transfer.fileName}</h4>
                            <p className="text-slate-400 text-sm">
                              来自 {transfer.sender} • {formatFileSize(transfer.fileSize)}
                            </p>
                          </div>
                        </div>
                        <div className="text-slate-300 text-sm">
                          文件类型: {transfer.fileType || '未知'}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => onCancelTransfer(transfer.id)}
                          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm font-medium"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 进行中的传输 */}
          {activeTab === 'active' && (
            <div className="space-y-3">
              {activeTransfers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">📤</div>
                  <p>没有进行中的文件传输</p>
                </div>
              ) : (
                activeTransfers.map(transfer => (
                  <div key={transfer.id} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📄</span>
                        <div>
                          <h4 className="text-slate-100 font-medium">{transfer.fileName}</h4>
                          <p className="text-slate-400 text-sm">
                            {transfer.sender === transfer.receiver ? '发送给' : '来自'} {transfer.sender === transfer.receiver ? transfer.receiver : transfer.sender} • {formatFileSize(transfer.fileSize)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${getStatusColor(transfer.status)}`}>
                          {getStatusIcon(transfer.status)} {getStatusText(transfer.status)}
                        </span>
                        {(transfer.status === 'transferring' || transfer.status === 'accepted' || transfer.status === 'pending') && (
                          <button
                            onClick={() => onCancelTransfer(transfer.id)}
                            className="text-red-400 hover:text-red-300 px-2 py-1 text-sm"
                            title="取消传输"
                          >
                            🚫
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 进度条 */}
                    {transfer.status === 'transferring' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-300">
                          <span>{transfer.progress}%</span>
                          <span>{formatTransferSpeed(transfer)}</span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${transfer.progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-400 text-center">
                          剩余时间: {estimateRemainingTime(transfer)}
                        </div>
                      </div>
                    )}

                    {/* 等待状态 */}
                    {transfer.status === 'pending' && (
                      <div className="text-center py-2">
                        <div className="inline-flex items-center gap-2 text-yellow-400 text-sm">
                          <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                          等待对方响应...
                        </div>
                      </div>
                    )}

                    {/* 已接受状态 */}
                    {transfer.status === 'accepted' && (
                      <div className="text-center py-2">
                        <div className="inline-flex items-center gap-2 text-green-400 text-sm">
                          <div className="animate-pulse w-4 h-4 bg-green-400 rounded-full"></div>
                          准备开始传输...
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 已完成的传输 */}
          {activeTab === 'completed' && (
            <div className="space-y-3">
              {completedTransfers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">📋</div>
                  <p>没有已完成的文件传输</p>
                </div>
              ) : (
                completedTransfers.map(transfer => (
                  <div key={transfer.id} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📄</span>
                        <div>
                          <h4 className="text-slate-100 font-medium">{transfer.fileName}</h4>
                          <p className="text-slate-400 text-sm">
                            {transfer.sender === transfer.receiver ? '发送给' : '来自'} {transfer.sender === transfer.receiver ? transfer.receiver : transfer.sender} • {formatFileSize(transfer.fileSize)}
                          </p>
                          {transfer.startTime && transfer.endTime && (
                            <p className="text-slate-500 text-xs">
                              耗时: {Math.round((transfer.endTime - transfer.startTime) / 1000)}秒
                            </p>
                          )}
                          {transfer.error && (
                            <p className="text-red-400 text-xs">
                              错误: {transfer.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${getStatusColor(transfer.status)}`}>
                          {getStatusIcon(transfer.status)} {getStatusText(transfer.status)}
                        </span>
                        <button
                          onClick={() => {
                            const url = FileTransferManager.getInstance().getFilePreviewUrl(transfer.id);
                            if (url) {
                              window.open(url, '_blank');
                            }
                          }}
                          className="text-sky-400 hover:text-sky-300 px-2 py-1 text-sm"
                          title="预览"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => {
                            const blob = FileTransferManager.getInstance().getFileBlob(transfer.id);
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
                          }}
                          className="text-green-400 hover:text-green-300 px-2 py-1 text-sm"
                          title="保存"
                        >
                          💾
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-600">
          <p className="text-slate-400 text-xs text-center">
            支持最大 100MB 的文件传输 • 文件通过P2P直接传输，不经过服务器
          </p>
        </div>
      </div>
    </div>
  );
};