const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('rate-limiter-flexible');
require('dotenv').config();

const Database = require('./database');
const authMiddleware = require('./middleware/auth');
const socketAuth = require('./middleware/socketAuth');
const chatHandlers = require('./handlers/chatHandlers');
const roomHandlers = require('./handlers/roomHandlers');
const { validateMessage, validateRoomName, validateUsername } = require('./utils/validation');

const app = express();
const server = http.createServer(app);

// Initialize database
const db = new Database();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(compression());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const rateLimiter = new rateLimit.RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({ error: 'Too many requests' });
  }
});

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store active users and rooms
const activeUsers = new Map();
const activeRooms = new Map();

// Socket authentication middleware
io.use(socketAuth);

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.id})`);
  
  // Initialize user session
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    username: socket.username,
    connectedAt: new Date(),
    currentRoom: null
  });

  // Handle chat events
  chatHandlers(socket, io, db, activeUsers, activeRooms);
  
  // Handle room events
  roomHandlers(socket, io, db, activeUsers, activeRooms);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    
    const user = activeUsers.get(socket.userId);
    if (user && user.currentRoom) {
      socket.to(user.currentRoom).emit('user_left', {
        userId: socket.userId,
        username: user.username
      });
    }
    
    activeUsers.delete(socket.userId);
  });
});

// REST API Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Invalid username' });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await db.createUser(username, password);
    res.json({ success: true, token: result.token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.authenticateUser(username, password);
    res.json({ success: true, token: result.token, user: result.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await db.getRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/rooms', authMiddleware, async (req, res) => {
  try {
    const { name, isPrivate = false } = req.body;
    
    if (!validateRoomName(name)) {
      return res.status(400).json({ error: 'Invalid room name' });
    }

    const room = await db.createRoom(name, req.userId, isPrivate);
    res.json(room);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/rooms/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await db.getMessages(roomId, parseInt(page), parseInt(limit));
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Admin CLI endpoint
app.post('/api/admin/settings', async (req, res) => {
  try {
    const { adminPassword, settings } = req.body;
    
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Update settings in database
    await db.updateSettings(settings);
    res.json({ success: true });
  } catch (error) {
    console.error('Admin settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await db.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Secure Chatroom server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});