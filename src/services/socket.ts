import { io } from 'socket.io-client';

// Match the API_BASE_URL (strip /api)
const SOCKET_URL = 'https://pullup-backend-w17o.onrender.com';
// For local development, use: 'http://10.0.2.2:4000'

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('[SOCKET] Connected to server');
});

socket.on('disconnect', () => {
  console.log('[SOCKET] Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('[SOCKET] Connection error:', error.message);
});

export default socket;
