
import React, { useState, useEffect } from 'react';
import { IdentityLogin } from './components/IdentityLogin';
import { MeshChat } from './components/MeshChat';

interface Identity {
  username: string;
  peerId: string;
}

function App() {
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('meshchat_current_identity');
    if (stored) {
      setIdentity(JSON.parse(stored));
    }
  }, []);

  const handleLogin = (newIdentity: Identity) => {
    setIdentity(newIdentity);
  };

  const handleLogout = () => {
    // Clear current identity
    localStorage.removeItem('meshchat_current_identity');
    
    // Force page reload to clean up all connections and state
    window.location.reload();
  };

  if (!identity) {
    return <IdentityLogin onLogin={handleLogin} />;
  }

  return <MeshChat identity={identity} onLogout={handleLogout} />;
}

export default App;
