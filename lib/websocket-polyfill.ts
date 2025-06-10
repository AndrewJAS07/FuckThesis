import { Platform } from 'react-native';

// Ensure WebSocket is properly configured for React Native
if (Platform.OS !== 'web') {
  try {
    // Polyfill WebSocket for React Native
    const WebSocket = require('react-native').WebSocket;
    
    if (WebSocket) {
      // Override the global WebSocket
      (global as any).WebSocket = WebSocket;
      
      // Add WebSocket constants first
      WebSocket.CONNECTING = 0;
      WebSocket.OPEN = 1;
      WebSocket.CLOSING = 2;
      WebSocket.CLOSED = 3;

      // Safely add prototype properties
      const prototype = WebSocket.prototype;
      if (prototype) {
        if (!prototype.binaryType) {
          Object.defineProperty(prototype, 'binaryType', {
            get: function() {
              return this._binaryType || 'blob';
            },
            set: function(value) {
              this._binaryType = value;
            }
          });
        }

        if (!prototype.readyState) {
          Object.defineProperty(prototype, 'readyState', {
            get: function() {
              return this._readyState || WebSocket.CONNECTING;
            }
          });
        }
      }
    }
  } catch (error) {
    console.warn('WebSocket polyfill initialization failed:', error);
  }
}

export {}; 