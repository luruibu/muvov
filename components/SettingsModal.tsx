import React, { useState, useEffect } from 'react';
import { SettingsManager, ServerConfig, STUNConfig } from '../utils/settings';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSettingsChanged: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isVisible, onClose, onSettingsChanged }) => {
  const [activeTab, setActiveTab] = useState<'peer' | 'stun'>('peer');
  const [peerServers, setPeerServers] = useState<ServerConfig[]>([]);
  const [stunServers, setSTUNServers] = useState<STUNConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPeerServer, setEditingPeerServer] = useState<string | null>(null);
  const [editingSTUNServer, setEditingSTUNServer] = useState<string | null>(null);
  
  // 新服务器表单
  const [newPeerServer, setNewPeerServer] = useState({
    name: '',
    host: '',
    port: 443,
    path: '/',
    secure: true,
    key: ''
  });
  
  const [newSTUNServer, setNewSTUNServer] = useState({
    name: '',
    url: ''
  });

  // 编辑服务器表单
  const [editPeerServer, setEditPeerServer] = useState({
    name: '',
    host: '',
    port: 443,
    path: '/',
    secure: true,
    key: ''
  });
  
  const [editSTUNServer, setEditSTUNServer] = useState({
    name: '',
    url: ''
  });

  useEffect(() => {
    if (isVisible) {
      loadSettings();
    }
  }, [isVisible]);

  const loadSettings = () => {
    const settings = SettingsManager.loadSettings();
    setPeerServers(settings.peerServers);
    setSTUNServers(settings.stunServers);
  };

  const handleClose = () => {
    setShowAddForm(false);
    setEditingPeerServer(null);
    setEditingSTUNServer(null);
    setNewPeerServer({ name: '', host: '', port: 443, path: '/', secure: true, key: '' });
    setNewSTUNServer({ name: '', url: '' });
    setEditPeerServer({ name: '', host: '', port: 443, path: '/', secure: true, key: '' });
    setEditSTUNServer({ name: '', url: '' });
    onClose();
  };

  const togglePeerServer = (id: string, enabled: boolean) => {
    // 如果启用新服务器，先禁用其他服务器
    if (enabled) {
      peerServers.forEach(server => {
        if (server.id !== id && server.enabled) {
          SettingsManager.updatePeerServer(server.id, { enabled: false });
        }
      });
    }
    
    SettingsManager.updatePeerServer(id, { enabled });
    loadSettings();
    onSettingsChanged();
  };

  const toggleSTUNServer = (id: string, enabled: boolean) => {
    SettingsManager.updateSTUNServer(id, { enabled });
    loadSettings();
    onSettingsChanged();
  };

  const addPeerServer = () => {
    if (!newPeerServer.name || !newPeerServer.host) return;
    
    SettingsManager.addPeerServer({
      ...newPeerServer,
      enabled: false
    });
    
    setNewPeerServer({ name: '', host: '', port: 443, path: '/', secure: true, key: '' });
    setShowAddForm(false);
    loadSettings();
  };

  const addSTUNServer = () => {
    if (!newSTUNServer.name || !newSTUNServer.url) return;
    
    SettingsManager.addSTUNServer({
      ...newSTUNServer,
      enabled: false
    });
    
    setNewSTUNServer({ name: '', url: '' });
    setShowAddForm(false);
    loadSettings();
  };

  const removePeerServer = (id: string) => {
    SettingsManager.removePeerServer(id);
    loadSettings();
    onSettingsChanged();
  };

  const removeSTUNServer = (id: string) => {
    SettingsManager.removeSTUNServer(id);
    loadSettings();
    onSettingsChanged();
  };

  // 编辑功能
  const startEditPeerServer = (server: ServerConfig) => {
    setEditingPeerServer(server.id);
    setEditPeerServer({
      name: server.name,
      host: server.host,
      port: server.port,
      path: server.path || '/',
      secure: server.secure !== false,
      key: server.key || ''
    });
    setShowAddForm(false);
  };

  const startEditSTUNServer = (server: STUNConfig) => {
    setEditingSTUNServer(server.id);
    setEditSTUNServer({
      name: server.name,
      url: server.url
    });
    setShowAddForm(false);
  };

  const saveEditPeerServer = () => {
    if (!editingPeerServer || !editPeerServer.name || !editPeerServer.host) return;
    
    SettingsManager.updatePeerServer(editingPeerServer, {
      name: editPeerServer.name,
      host: editPeerServer.host,
      port: editPeerServer.port,
      path: editPeerServer.path,
      secure: editPeerServer.secure,
      key: editPeerServer.key
    });
    
    setEditingPeerServer(null);
    setEditPeerServer({ name: '', host: '', port: 443, path: '/', secure: true, key: '' });
    loadSettings();
    onSettingsChanged();
  };

  const saveEditSTUNServer = () => {
    if (!editingSTUNServer || !editSTUNServer.name || !editSTUNServer.url) return;
    
    SettingsManager.updateSTUNServer(editingSTUNServer, {
      name: editSTUNServer.name,
      url: editSTUNServer.url
    });
    
    setEditingSTUNServer(null);
    setEditSTUNServer({ name: '', url: '' });
    loadSettings();
    onSettingsChanged();
  };

  const cancelEdit = () => {
    setEditingPeerServer(null);
    setEditingSTUNServer(null);
    setEditPeerServer({ name: '', host: '', port: 443, path: '/', secure: true, key: '' });
    setEditSTUNServer({ name: '', url: '' });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-100 font-medium">System Settings</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-300">✕</button>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-4">
          <button
            onClick={() => setActiveTab('peer')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-l ${
              activeTab === 'peer' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            PeerJS Servers
          </button>
          <button
            onClick={() => setActiveTab('stun')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-r ${
              activeTab === 'stun' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            STUN Servers
          </button>
        </div>

        {/* PeerJS Servers Tab */}
        {activeTab === 'peer' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-slate-300 font-medium">PeerJS Servers</h4>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingPeerServer(null);
                  setEditingSTUNServer(null);
                }}
                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm"
              >
                + Add Server
              </button>
            </div>

            {showAddForm && activeTab === 'peer' && (
              <div className="bg-slate-700 p-4 rounded space-y-3">
                <h5 className="text-slate-300 font-medium">Add PeerJS Server</h5>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Server Name"
                    value={newPeerServer.name}
                    onChange={(e) => setNewPeerServer(prev => ({ ...prev, name: e.target.value }))}
                    className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Host (e.g., pjs.gotestsec.net)"
                    value={newPeerServer.host}
                    onChange={(e) => setNewPeerServer(prev => ({ ...prev, host: e.target.value }))}
                    className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Port"
                    value={newPeerServer.port}
                    onChange={(e) => setNewPeerServer(prev => ({ ...prev, port: parseInt(e.target.value) || 443 }))}
                    className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Path (e.g., /peerjs)"
                    value={newPeerServer.path}
                    onChange={(e) => setNewPeerServer(prev => ({ ...prev, path: e.target.value }))}
                    className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Key (optional, e.g., peerjs)"
                    value={newPeerServer.key}
                    onChange={(e) => setNewPeerServer(prev => ({ ...prev, key: e.target.value }))}
                    className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm col-span-2"
                  />
                </div>
                <label className="flex items-center gap-2 text-slate-300 text-sm">
                  <input
                    type="checkbox"
                    checked={newPeerServer.secure}
                    onChange={(e) => setNewPeerServer(prev => ({ ...prev, secure: e.target.checked }))}
                  />
                  Use HTTPS/WSS
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addPeerServer}
                    className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded text-sm"
                  >
                    Add Server
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {peerServers.map(server => (
                <div key={server.id} className="bg-slate-700 rounded">
                  {editingPeerServer === server.id ? (
                    // 编辑表单
                    <div className="p-4 space-y-3">
                      <h5 className="text-slate-300 font-medium">Edit PeerJS Server</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Server Name"
                          value={editPeerServer.name}
                          onChange={(e) => setEditPeerServer(prev => ({ ...prev, name: e.target.value }))}
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Host (e.g., pjs.gotestsec.net)"
                          value={editPeerServer.host}
                          onChange={(e) => setEditPeerServer(prev => ({ ...prev, host: e.target.value }))}
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Port"
                          value={editPeerServer.port}
                          onChange={(e) => setEditPeerServer(prev => ({ ...prev, port: parseInt(e.target.value) || 443 }))}
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Path (e.g., /peerjs)"
                          value={editPeerServer.path}
                          onChange={(e) => setEditPeerServer(prev => ({ ...prev, path: e.target.value }))}
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Key (optional, e.g., peerjs)"
                          value={editPeerServer.key}
                          onChange={(e) => setEditPeerServer(prev => ({ ...prev, key: e.target.value }))}
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm col-span-2"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-slate-300 text-sm">
                        <input
                          type="checkbox"
                          checked={editPeerServer.secure}
                          onChange={(e) => setEditPeerServer(prev => ({ ...prev, secure: e.target.checked }))}
                        />
                        Use HTTPS/WSS
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEditPeerServer}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 显示模式
                    <div className="flex items-center justify-between p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="peerServer"
                            checked={server.enabled}
                            onChange={(e) => togglePeerServer(server.id, e.target.checked)}
                          />
                          <span className="text-slate-100 font-medium">{server.name}</span>
                        </div>
                        <div className="text-slate-400 text-sm">
                          {server.secure ? 'https://' : 'http://'}{server.host}:{server.port}{server.path}
                          {server.key && <span className="ml-2 text-slate-500">(key: {server.key})</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {server.id !== 'default' && (
                          <>
                            <button
                              onClick={() => startEditPeerServer(server)}
                              className="text-blue-400 hover:text-blue-300 px-2 py-1 text-sm"
                              title="Edit server"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => removePeerServer(server.id)}
                              className="text-red-400 hover:text-red-300 px-2 py-1 text-sm"
                              title="Delete server"
                            >
                              ❌
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STUN Servers Tab */}
        {activeTab === 'stun' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-slate-300 font-medium">STUN Servers</h4>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingPeerServer(null);
                  setEditingSTUNServer(null);
                }}
                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm"
              >
                + Add Server
              </button>
            </div>

            {showAddForm && activeTab === 'stun' && (
              <div className="bg-slate-700 p-4 rounded space-y-3">
                <h5 className="text-slate-300 font-medium">Add STUN Server</h5>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text"
                    placeholder="Server Name"
                    value={newSTUNServer.name}
                    onChange={(e) => setNewSTUNServer(prev => ({ ...prev, name: e.target.value }))}
                    className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="STUN URL (e.g., stun:stun.example.com:3478)"
                    value={newSTUNServer.url}
                    onChange={(e) => setNewSTUNServer(prev => ({ ...prev, url: e.target.value }))}
                    className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addSTUNServer}
                    className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded text-sm"
                  >
                    Add Server
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {stunServers.map(server => (
                <div key={server.id} className="bg-slate-700 rounded">
                  {editingSTUNServer === server.id ? (
                    // 编辑表单
                    <div className="p-4 space-y-3">
                      <h5 className="text-slate-300 font-medium">Edit STUN Server</h5>
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          type="text"
                          placeholder="Server Name"
                          value={editSTUNServer.name}
                          onChange={(e) => setEditSTUNServer(prev => ({ ...prev, name: e.target.value }))}
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="STUN URL (e.g., stun:stun.example.com:3478)"
                          value={editSTUNServer.url}
                          onChange={(e) => setEditSTUNServer(prev => ({ ...prev, url: e.target.value }))}
                          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-100 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEditSTUNServer}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 显示模式
                    <div className="flex items-center justify-between p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={server.enabled}
                            onChange={(e) => toggleSTUNServer(server.id, e.target.checked)}
                          />
                          <span className="text-slate-100 font-medium">{server.name}</span>
                        </div>
                        <div className="text-slate-400 text-sm">{server.url}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditSTUNServer(server)}
                          className="text-blue-400 hover:text-blue-300 px-2 py-1 text-sm"
                          title="Edit server"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => removeSTUNServer(server.id)}
                          className="text-red-400 hover:text-red-300 px-2 py-1 text-sm"
                          title="Delete server"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-600">
          <p className="text-slate-400 text-xs">
            Changes will take effect after reconnection. PeerJS servers are used for signaling, STUN servers help with NAT traversal.
          </p>
        </div>
      </div>
    </div>
  );
};