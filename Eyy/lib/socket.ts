import { io } from 'socket.io-client';
import Constants from 'expo-constants';

// Get the server URL from environment variables or use a default
const SOCKET_URL = Constants.expoConfig?.extra?.serverUrl || 'http://localhost:3000';

// Create socket instance with configuration
const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const createSocket = () => {
  return socket;
};

export default socket; 