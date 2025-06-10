import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import createSocket from './socket-config';
import Constants from 'expo-constants';

// Define the context type
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
}

// Create the context
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  error: null,
});

// Create the provider component
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the server URL from environment variables or use a default
    const serverUrl = Constants.expoConfig?.extra?.serverUrl || 'http://localhost:3000';
    
    try {
      // Create socket connection
      const socketInstance = createSocket(serverUrl);

      // Set up event listeners
      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        setError(null);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (err: Error) => {
        console.error('Socket connection error:', err);
        setError(err.message);
        setIsConnected(false);
      });

      // Store the socket instance
      setSocket(socketInstance);

      // Connect the socket
      socketInstance.connect();

      // Cleanup on unmount
      return () => {
        if (socketInstance.connected) {
          socketInstance.disconnect();
        }
      };
    } catch (err) {
      console.error('Error creating socket:', err);
      setError(err instanceof Error ? err.message : 'Failed to create socket connection');
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook to use the socket context
export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
} 