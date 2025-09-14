import React, { useState } from 'react';
import { BackupManager } from '../utils/backup';

interface BackupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onRestoreComplete: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isVisible, onClose, onRestoreComplete }) => {
  const [mode, setMode] = useState<'menu' | 'backup' | 'restore'>('menu');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetState = () => {
    setMode('menu');
    setPassword('');
    setConfirmPassword('');
    setFile(null);
    setError('');
    setSuccess('');
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleCreateBackup = async () => {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await BackupManager.createBackup(password);
      setSuccess('Backup created successfully!');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!file) {
      setError('Please select a backup file');
      return;
    }
    
    if (!password) {
      setError('Please enter backup password');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await BackupManager.restoreBackup(file, password);
      setSuccess('Backup restored successfully! Please refresh the page.');
      setTimeout(() => {
        onRestoreComplete();
        handleClose();
      }, 2000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-100 font-medium">
            {mode === 'menu' && 'Backup & Restore'}
            {mode === 'backup' && 'Create Backup'}
            {mode === 'restore' && 'Restore Backup'}
          </h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-300">✕</button>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-2 rounded mb-4 text-sm">{error}</div>
        )}
        
        {success && (
          <div className="bg-green-600 text-white p-2 rounded mb-4 text-sm">{success}</div>
        )}

        {mode === 'menu' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('backup')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded text-sm"
            >
              📦 Create Encrypted Backup
            </button>
            <button
              onClick={() => setMode('restore')}
              className="w-full bg-green-600 hover:bg-green-500 text-white py-3 px-4 rounded text-sm"
            >
              📥 Restore from Backup
            </button>
            <p className="text-slate-400 text-xs text-center">
              Backup includes your identities and friends list
            </p>
          </div>
        )}

        {mode === 'backup' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">Backup Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('menu')}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded text-sm"
              >
                Back
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-500 text-white py-2 px-4 rounded text-sm"
              >
                {loading ? 'Creating...' : 'Create Backup'}
              </button>
            </div>
          </div>
        )}

        {mode === 'restore' && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">Backup File</label>
              <input
                type="file"
                accept=".mcb"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-2">Backup Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter backup password"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm"
              />
            </div>
            <div className="bg-yellow-600 text-yellow-100 p-2 rounded text-xs">
              ⚠️ This will replace your current data. Make sure to backup first!
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('menu')}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded text-sm"
              >
                Back
              </button>
              <button
                onClick={handleRestoreBackup}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-slate-500 text-white py-2 px-4 rounded text-sm"
              >
                {loading ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};