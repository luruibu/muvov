import React, { useState } from 'react';

interface DebugPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'storage' | 'commands'>('storage');

  const getStorageInfo = () => {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const callRecords = JSON.parse(localStorage.getItem('callRecords') || '[]');
    const totalMessages = chatHistory.reduce((sum: number, chat: any) => sum + (chat.messages?.length || 0), 0);
    
    return {
      chatHistory: chatHistory.length,
      totalMessages,
      callRecords: callRecords.length,
      storageUsed: JSON.stringify({ chatHistory, callRecords }).length
    };
  };

  const runCommand = (command: string) => {
    try {
      let result;
      switch (command) {
        case 'clearFriends':
          if (confirm('Clear all friends data?')) {
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('meshchat_friends_')) {
                localStorage.removeItem(key);
              }
            });
            result = 'All friends data cleared';
          } else {
            result = 'Operation cancelled';
          }
          break;
        case 'clearChatHistory':
          if (confirm('Clear all chat history?')) {
            localStorage.removeItem('chatHistory');
            result = 'Chat history cleared';
          } else {
            result = 'Operation cancelled';
          }
          break;
        case 'clearCallHistory':
          if (confirm('Clear all call history?')) {
            localStorage.removeItem('callRecords');
            result = 'Call history cleared';
          } else {
            result = 'Operation cancelled';
          }
          break;
        default:
          result = 'Unknown command';
      }
      
      alert(result);
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">🔧 Debug Panel</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {[
            { id: 'storage', label: '💾 Storage' },
            { id: 'commands', label: '⚡ Commands' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Storage Information</h3>
              {(() => {
                const info = getStorageInfo();
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-700 p-3 rounded">
                      <div className="text-slate-400">Chat Conversations</div>
                      <div className="text-white text-xl font-bold">{info.chatHistory}</div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <div className="text-slate-400">Total Messages</div>
                      <div className="text-white text-xl font-bold">{info.totalMessages}</div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <div className="text-slate-400">Call Records</div>
                      <div className="text-white text-xl font-bold">{info.callRecords}</div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <div className="text-slate-400">Storage Used</div>
                      <div className="text-white text-xl font-bold">{Math.round(info.storageUsed / 1024)} KB</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Quick Commands</h3>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => runCommand('clearFriends')}
                  className="bg-red-600 hover:bg-red-500 text-white p-2 rounded text-sm text-left"
                >
                  🗑️ Clear All Friends Data
                </button>
                <button
                  onClick={() => runCommand('clearChatHistory')}
                  className="bg-red-600 hover:bg-red-500 text-white p-2 rounded text-sm text-left"
                >
                  💬 Clear Chat History
                </button>
                <button
                  onClick={() => runCommand('clearCallHistory')}
                  className="bg-red-600 hover:bg-red-500 text-white p-2 rounded text-sm text-left"
                >
                  📞 Clear Call History
                </button>
              </div>
              <div className="text-slate-400 text-xs mt-4">
                💡 Tip: These commands help manage local storage and app data.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};