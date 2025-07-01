import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:3000';

export const initializeSocket = (token) => {
  const socket = io(SOCKET_URL, {
    auth: {
      token: token
    },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('🔌 Connected to server');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected from server:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 Connection error:', error.message);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔌 Reconnected to server (attempt:', attemptNumber, ')');
  });

  socket.on('reconnect_error', (error) => {
    console.error('🔌 Reconnection error:', error.message);
  });

  // Global error handler
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  return socket;
};

export const disconnectSocket = (socket) => {
  if (socket) {
    socket.disconnect();
  }
};