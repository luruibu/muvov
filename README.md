
# MUVOV  -  P2P WebRTC Secure Chat 

A peer-to-peer encrypted chat application built with WebRTC, supporting message caching, offline sync, and audio/video calls.

## 🎯 Build Your Own Secure Communication System

**MUVOV** leverages three powerful open-source technologies to help you rapidly build a complete, independent, and highly secure communication system:

- **🔗 MUVOV**: Complete P2P chat application framework
- **🌐 STUN**: NAT traversal for direct peer connections  
- **📡 PeerJS**: Simplified WebRTC implementation

With these three components, you can quickly deploy a **fully autonomous, self-controlled, secure, and convenient communication system** without relying on any third-party servers for message storage or processing.

## ✨ Features

### 💬 Messaging
- **End-to-end encryption**: Direct P2P communication with no server storage
- **Message caching**: Each client stores the last 100 messages locally
- **Offline sync**: Automatic message synchronization when users come back online
- **File sharing**: Send files directly between peers
- **Chat history**: Persistent local storage of conversations

### 📞 Audio/Video Calls
- **HD video calls**: High-quality video communication
- **Crystal clear audio**: Optimized audio transmission
- **Camera switching**: Front/back camera toggle during video calls
- **Call duration tracking**: Real-time call timer
- **Call history**: Local storage of call records

### 🔐 Security & Privacy
- **No server storage**: Messages never stored on servers
- **P2P encryption**: Direct encrypted communication
- **QR code sharing**: Secure friend addition via QR codes
- **Local data only**: All data stored locally on your device

### 🌐 Network Features
- **Auto-reconnection**: Automatic connection recovery
- **Mobile optimized**: Works seamlessly on mobile browsers
- **Network adaptation**: Adjusts to connection quality
- **Real-time status**: Live online/offline friend status

### 🌍 Universal Access
- **Browser-Only**: No client installation required - runs entirely in web browsers
- **Cross-Platform**: Works on Windows, Mac, Linux, iOS, Android, and any device with a modern browser
- **Instant Access**: Open any browser, visit the URL, and start communicating immediately
- **Zero Installation**: No app stores, no downloads, no system permissions required
- **Always Available**: Access from any device, anywhere, anytime with just a web browser
- **No Client Downloads**: Unlike traditional messaging apps that require installation, MUVOV works instantly in any modern browser

## 🔒 Security Architecture & Data Protection

### 🛡️ Zero-Server Data Storage
- **No Central Database**: Unlike traditional messaging apps, MUVOV stores zero communication data on any server
- **No Message Logs**: Your conversations exist only on your devices - no company, government, or hacker can access server-stored messages
- **No Metadata Collection**: No tracking of who you talk to, when, or how often
- **Complete Data Sovereignty**: You own and control 100% of your communication data

### 🔐 End-to-End P2P Encryption
- **Direct Peer Connection**: Messages travel directly between devices using WebRTC's built-in encryption (DTLS/SRTP)
- **No Intermediary Servers**: Data never passes through third-party servers that could intercept or log communications
- **Real-time Encryption**: All messages, files, and calls are encrypted in transit using industry-standard protocols
- **Perfect Forward Secrecy**: Each session uses unique encryption keys that cannot decrypt past communications

### 🏠 Local-First Data Model
- **Device-Only Storage**: All chat history, contacts, and settings stored exclusively on your local device
- **No Cloud Sync**: Your data never leaves your device unless you explicitly share it with a peer
- **Encrypted Local Storage**: Even local data can be encrypted with user-defined passwords
- **Selective Data Sharing**: You choose exactly what data to share and with whom

### 🚫 Privacy  Protection Features
- **No Phone Numbers Required**: Connect using anonymous Peer IDs instead of personal identifiers
- **No Account Registration**: No email, phone, or personal information required to use the system
- **Ephemeral Connections**: Peer connections can be temporary and leave no permanent traces
- **Network Traffic Obfuscation**: P2P traffic appears as standard WebRTC data, not identifiable as messaging

### 🔄 Decentralized Architecture Benefits
- **No Single Point of Failure**: No central server to be hacked, shut down, or compromised
- **Censorship Resistant**: Cannot be blocked by governments or ISPs targeting specific servers
- **Global Availability**: Works anywhere with internet access, no regional server dependencies
- **Self-Sovereign Network**: Each user contributes to and benefits from the decentralized network

### 📊 Privacy Comparison

| Feature | MUVOV | Traditional Apps | Encrypted Apps |
|---------|-------|------------------|----------------|
| Server Message Storage | ❌ Never | ✅ Always | ⚠️ Encrypted |
| Metadata Collection | ❌ None | ✅ Extensive | ⚠️ Limited |
| Account Registration | ❌ Optional | ✅ Required | ✅ Required |
| Central Authority | ❌ None | ✅ Company | ✅ Company |
| Data Ownership | ✅ User | ❌ Company | ⚠️ Shared |
| Censorship Resistance | ✅ High | ❌ Low | ⚠️ Medium |
| Network Surveillance | ❌ Minimal | ✅ Easy | ⚠️ Difficult |

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Modern web browser with WebRTC support

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/luruibu/muvov.git
   cd muvov
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) 

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📱 How to Use

### Adding Friends
1. **Manual Addition**: Enter friend's Peer ID and username
2. **QR Code**: Generate your QR code or scan a friend's QR code
3. **Auto-sync**: Friends are automatically notified when added

### Starting Conversations
1. Click on a friend from your friends list
2. Start typing in the chat input
3. Send files using the file attachment button

### Making Calls
1. Click the 🎤 button for audio calls
2. Click the 📹 button for video calls
3. Use 🔄 to switch cameras during video calls

### Viewing History
1. Click 📞 in the top toolbar to view call history
2. Chat history is automatically loaded when opening conversations

## 🛠️ Technical Stack

### Core Technologies
- **🔗 MUVOV**: Complete P2P communication framework
- **🌐 STUN**: NAT traversal servers for peer discovery
- **📡 PeerJS**: WebRTC abstraction layer

### Frontend Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Storage**: LocalStorage for persistent data
- **QR Codes**: qr-scanner for QR code functionality

## 🔧 Configuration

### Network Settings
The app includes configurable network optimization presets:
- **LOW_FREQUENCY**: Minimal network usage
- **MEDIUM_FREQUENCY**: Balanced performance (default)
- **HIGH_FREQUENCY**: Maximum responsiveness

### Storage Limits
- **Chat messages**: 500 messages per friend
- **Call records**: 100 most recent calls
- **File references**: Filename only (actual files not stored)

## 💝 Support This Project

If you find this project helpful, consider supporting its development:

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_paynowCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=66X23LVXDKZAN)

Your support helps with development and server costs. All donations are voluntary and greatly appreciated!

## 🤝 Contributing

We welcome contributions! 

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

### Core Open Source Technologies
- **[MUVOV](https://github.com/luruibu/muvov)** - Complete P2P communication framework
- **[STUN Servers](https://webrtc.org/getting-started/turn-server)** - NAT traversal infrastructure
- **[PeerJS](https://peerjs.com/)** - WebRTC abstraction layer

### Development Stack
- [React](https://reactjs.org/) for the UI framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) for build tooling

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/luruibu/p2p-webrtc-secure-chat/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

<div align="center">
<strong>MUVOV + STUN + PeerJS = Complete Autonomous Communication System</strong><br>
Made with ❤️ for secure, private communication
</div>