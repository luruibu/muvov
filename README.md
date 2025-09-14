<div align="center">
<img width="1200" height="475" alt="P2P WebRTC Secure Chat" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# P2P WebRTC Secure Chat

A peer-to-peer encrypted chat application built with WebRTC, supporting message caching, offline sync, and audio/video calls.

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

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Modern web browser with WebRTC support

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/p2p-webrtc-secure-chat.git
   cd p2p-webrtc-secure-chat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up Gemini API for enhanced features:
   ```bash
   echo "GEMINI_API_KEY=your_api_key_here" > .env.local
   ```

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

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **WebRTC**: PeerJS for simplified WebRTC implementation
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

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [PeerJS](https://peerjs.com/) for WebRTC abstraction
- [React](https://reactjs.org/) for the UI framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) for build tooling

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/yourusername/p2p-webrtc-secure-chat/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

<div align="center">
Made with ❤️ for secure, private communication
</div>