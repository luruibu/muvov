import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';
import { Identity } from '../types';
import { InputSanitizer } from '../utils/sanitizer';
import { MobileCompatibility } from '../utils/mobileCompatibility';

// Set QR Scanner worker path with fallback
try {
  QrScanner.WORKER_PATH = new URL('/qr-scanner-worker.min.js', window.location.origin).href;
} catch {
  // Fallback for environments where URL constructor fails
  QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';
}

interface QRCodeModalProps {
  isVisible: boolean;
  mode: 'generate' | 'scan';
  identity: Identity;
  onClose: () => void;
  onFriendScanned: (peerId: string, username: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isVisible,
  mode,
  identity,
  onClose,
  onFriendScanned
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [scanError, setScanError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Generate QR code
  useEffect(() => {
    if (mode === 'generate' && isVisible) {
      const friendData = `meshchat://add?peerId=${identity.peerId}&username=${encodeURIComponent(identity.username)}`;
      console.log('Generating QR code with data:', friendData);
      
      QRCode.toDataURL(friendData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#f8fafc'
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('Failed to generate QR code:', err);
      });
    }
  }, [mode, isVisible, identity]);

  // 检测移动端和摄像头支持
  useEffect(() => {
    const checkMobileAndCamera = async () => {
      const mobile = MobileCompatibility.isMobile();
      setIsMobile(mobile);
      
      if (mode === 'scan' && isVisible) {
        const hasCamera = await MobileCompatibility.checkCameraSupport();
        if (!hasCamera) {
          setScanError('No camera found on this device');
          return;
        }
        
        const permission = await MobileCompatibility.requestCameraPermission();
        setCameraPermission(permission);
        
        if (!permission) {
          setScanError('Camera permission denied. Please allow camera access and try again.');
        }
      }
    };
    
    checkMobileAndCamera();
  }, [mode, isVisible]);

  // Setup QR scanner
  useEffect(() => {
    if (mode === 'scan' && isVisible && videoRef.current && !qrScannerRef.current && cameraPermission) {
      const scannerConfig = {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        // 移动端优化配置
        ...(isMobile && {
          preferredCamera: 'environment', // 后置摄像头
          maxScansPerSecond: 5 // 降低扫描频率以提高性能
        })
      };
      
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          try {
            const data = typeof result === 'string' ? result : result.data;
            console.log('Scanned QR data:', data.substring(0, 50) + '...');
            
            // Handle meshchat protocol
            if (data.startsWith('meshchat://add?')) {
              const url = new URL(data);
              
              const peerId = url.searchParams.get('peerId');
              const username = url.searchParams.get('username');
              
              if (peerId && username && InputSanitizer.isValidPeerId(peerId)) {
                console.log('Valid friend QR code, adding friend');
                onFriendScanned(peerId, decodeURIComponent(username));
                onClose();
              } else {
                console.log('Invalid QR code params');
                setScanError('Invalid friend QR code format');
              }
            } else {
              console.log('Not a meshchat QR code');
              setScanError('Not a MeshChat friend QR code');
            }
          } catch (error) {
            console.error('QR scan error:', error);
            setScanError('Failed to parse QR code');
          }
        },
        scannerConfig
      );

      qrScannerRef.current.start().catch(err => {
        console.error('Failed to start QR scanner:', err);
        setScanError('Camera access failed. Please refresh and allow camera access.');
        qrScannerRef.current = null;
      });
    }
    
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [mode, isVisible, onFriendScanned, onClose, cameraPermission, isMobile]);

  // Cleanup on close or mode change
  useEffect(() => {
    if (!isVisible) {
      setScanError('');
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
        } catch (error) {
          console.warn('QR scanner cleanup error:', error);
        } finally {
          qrScannerRef.current = null;
        }
      }
    } else if (mode === 'generate' && qrScannerRef.current) {
      // Stop scanner when switching to generate mode
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      } catch (error) {
        console.warn('QR scanner mode switch error:', error);
      } finally {
        qrScannerRef.current = null;
      }
    }
  }, [isVisible, mode]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-lg max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-100 font-medium">
            {mode === 'generate' ? 'My QR Code' : 'Scan Friend QR Code'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        {mode === 'generate' ? (
          <div className="text-center">
            {qrCodeUrl ? (
              <>
                <img 
                  src={qrCodeUrl} 
                  alt="Friend QR Code" 
                  className="mx-auto mb-3 bg-white p-2 rounded"
                />
                <p className="text-slate-300 text-sm mb-3">
                  Let your friend scan this QR code to add you
                </p>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `meshchat-${identity.username}.png`;
                    link.href = qrCodeUrl;
                    link.click();
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm"
                >
                  Save QR Code
                </button>
              </>
            ) : (
              <div className="text-slate-400">Generating QR code...</div>
            )}
          </div>
        ) : (
          <div className="text-center">
            {cameraPermission === false ? (
              <div className="p-4">
                <div className="text-red-400 text-sm mb-3">
                  Camera permission is required to scan QR codes
                </div>
                <button
                  onClick={async () => {
                    const permission = await MobileCompatibility.requestCameraPermission();
                    setCameraPermission(permission);
                    if (!permission) {
                      setScanError('Please allow camera access in your browser settings');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm"
                >
                  Grant Camera Access
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-slate-700 rounded mb-3"
                  playsInline
                  muted
                />
                {scanError && (
                  <div className="text-red-400 text-sm mb-3">{scanError}</div>
                )}
                <p className="text-slate-300 text-sm">
                  {isMobile ? 'Point your camera at the QR code' : 'Point camera at friend\'s QR code'}
                </p>
                {isMobile && (
                  <p className="text-slate-400 text-xs mt-2">
                    Tip: Use the back camera for better scanning
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};