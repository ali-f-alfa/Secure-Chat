const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    next(new Error('Authentication error: Invalid or expired token'));
  }
};

module.exports = socketAuth;