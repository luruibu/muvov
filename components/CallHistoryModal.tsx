import React, { useState, useEffect } from 'react';

interface CallRecord {
  id: string;
  type: 'video' | 'audio';
  duration: number;
  timestamp: number;
  endTime: number;
}

interface CallHistoryModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const CallHistoryModal: React.FC<CallHistoryModalProps> = ({
  isVisible,
  onClose
}) => {
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);

  useEffect(() => {
    if (isVisible) {
      const records = JSON.parse(localStorage.getItem('callRecords') || '[]');
      setCallRecords(records.sort((a: CallRecord, b: CallRecord) => b.timestamp - a.timestamp));
    }
  }, [isVisible]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const clearHistory = () => {
    if (confirm('Clear all call history?')) {
      localStorage.removeItem('callRecords');
      setCallRecords([]);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-96 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Call History</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 text-xl"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto max-h-64">
          {callRecords.length > 0 ? (
            <div className="space-y-2">
              {callRecords.map((record) => (
                <div key={record.id} className="bg-slate-700 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {record.type === 'video' ? '📹' : '🎤'}
                      </span>
                      <div>
                        <div className="text-white font-medium">
                          {record.type === 'video' ? 'Video Call' : 'Audio Call'}
                        </div>
                        <div className="text-slate-400 text-sm">
                          {formatDateTime(record.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-green-400 font-mono">
                      {formatDuration(record.duration)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">
              No call history
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={clearHistory}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded"
          >
            Clear History
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};