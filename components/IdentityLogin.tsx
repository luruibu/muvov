import React, { useState, useEffect } from 'react';

interface Identity {
  username: string;
  peerId: string;
}

interface IdentityLoginProps {
  onLogin: (identity: Identity) => void;
}

export const IdentityLogin: React.FC<IdentityLoginProps> = ({ onLogin }) => {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('meshchat_identities');
    if (stored) {
      setIdentities(JSON.parse(stored));
    }
  }, []);

  const saveIdentities = (newIdentities: Identity[]) => {
    localStorage.setItem('meshchat_identities', JSON.stringify(newIdentities));
    setIdentities(newIdentities);
  };

  const handleUseOldIdentity = (identity: Identity) => {
    localStorage.setItem('meshchat_current_identity', JSON.stringify(identity));
    onLogin(identity);
  };

  const handleDeleteIdentity = (identityToDelete: Identity) => {
    const updatedIdentities = identities.filter(id => id.peerId !== identityToDelete.peerId);
    saveIdentities(updatedIdentities);
  };

  const handleCreateNewIdentity = () => {
    if (!newUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    const exists = identities.some(id => id.username.toLowerCase() === newUsername.toLowerCase());
    if (exists) {
      setError('Username already exists');
      return;
    }

    const newPeerId = `user_${Math.random().toString(36).substr(2, 9)}`;
    const newIdentity: Identity = {
      username: newUsername.trim(),
      peerId: newPeerId
    };

    const updatedIdentities = [...identities, newIdentity];
    saveIdentities(updatedIdentities);
    
    localStorage.setItem('meshchat_current_identity', JSON.stringify(newIdentity));
    onLogin(newIdentity);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-sky-400 text-center mb-8">
          Choose Your Identity
        </h1>

        {/* Historical Identities */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Use Previous Identity
          </h2>
          {identities.length > 0 ? (
            <div className="space-y-2">
              {identities.map((identity) => (
                <div key={identity.peerId} className="flex gap-2">
                  <button
                    onClick={() => handleUseOldIdentity(identity)}
                    className="flex-1 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition"
                  >
                    <div className="text-slate-100 font-medium">{identity.username}</div>
                    <div className="text-slate-400 text-sm">{identity.peerId}</div>
                  </button>
                  <button
                    onClick={() => handleDeleteIdentity(identity)}
                    className="px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                    title="Delete identity"
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 text-center py-4">
              No previous identities found
            </div>
          )}
        </div>

        {/* Create New Identity */}
        <div>
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Create New Identity
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => {
                setNewUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter username"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
            <button
              onClick={handleCreateNewIdentity}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white py-3 px-4 rounded-lg font-medium transition"
            >
              Create Identity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};