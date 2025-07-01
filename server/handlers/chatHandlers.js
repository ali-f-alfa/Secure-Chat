const { validateMessage } = require('../utils/validation');

module.exports = (socket, io, db, activeUsers, activeRooms) => {
  
  // Handle sending messages to a room
  socket.on('send_message', async (data) => {
    try {
      const { roomId, content, messageType = 'text', isEncrypted = false } = data;
      
      if (!roomId || !content) {
        socket.emit('error', { message: 'Room ID and content are required' });
        return;
      }

      if (!validateMessage(content)) {
        socket.emit('error', { message: 'Invalid message content' });
        return;
      }

      // Check if user is in the room
      const inRoom = await db.isUserInRoom(roomId, socket.userId);
      if (!inRoom) {
        socket.emit('error', { message: 'You are not a member of this room' });
        return;
      }

      // Save message to database
      const message = await db.saveMessage(
        roomId,
        socket.userId,
        socket.username,
        content,
        isEncrypted,
        messageType
      );

      // Broadcast to all users in the room
      io.to(roomId).emit('new_message', {
        ...message,
        timestamp: new Date().toISOString()
      });

      // Acknowledge message sent
      socket.emit('message_sent', { messageId: message.id });

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle private direct messages with E2E encryption
  socket.on('send_private_message', async (data) => {
    try {
      const { recipientId, content, encryptedKey, isEncrypted = true } = data;
      
      if (!recipientId || !content) {
        socket.emit('error', { message: 'Recipient ID and content are required' });
        return;
      }

      if (!validateMessage(content)) {
        socket.emit('error', { message: 'Invalid message content' });
        return;
      }

      // Find recipient's socket
      const recipient = activeUsers.get(recipientId);
      if (!recipient) {
        socket.emit('error', { message: 'Recipient is not online' });
        return;
      }

      // Create private room ID (consistent between users)
      const roomId = [socket.userId, recipientId].sort().join('_private_');

      // Save encrypted message
      const message = await db.saveMessage(
        roomId,
        socket.userId,
        socket.username,
        content,
        isEncrypted,
        'private'
      );

      // Send to recipient
      io.to(recipient.socketId).emit('new_private_message', {
        ...message,
        senderId: socket.userId,
        senderUsername: socket.username,
        encryptedKey,
        timestamp: new Date().toISOString()
      });

      // Acknowledge to sender
      socket.emit('private_message_sent', { 
        messageId: message.id,
        recipientId 
      });

    } catch (error) {
      console.error('Send private message error:', error);
      socket.emit('error', { message: 'Failed to send private message' });
    }
  });

  // Handle joining a room
  socket.on('join_room', async (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Add user to room in database
      const added = await db.addUserToRoom(roomId, socket.userId);
      
      if (added) {
        // Join socket room
        socket.join(roomId);
        
        // Update user's current room
        const user = activeUsers.get(socket.userId);
        if (user) {
          user.currentRoom = roomId;
        }

        // Notify other room members
        socket.to(roomId).emit('user_joined', {
          userId: socket.userId,
          username: socket.username
        });

        // Get room members
        const members = await db.getRoomMembers(roomId);
        socket.emit('room_joined', { roomId, members });

        // Send recent messages
        const recentMessages = await db.getMessages(roomId, 1, 20);
        socket.emit('room_messages', { roomId, messages: recentMessages });
      }

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle leaving a room
  socket.on('leave_room', async (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Remove user from room in database
      const removed = await db.removeUserFromRoom(roomId, socket.userId);
      
      if (removed) {
        // Leave socket room
        socket.leave(roomId);
        
        // Update user's current room
        const user = activeUsers.get(socket.userId);
        if (user) {
          user.currentRoom = null;
        }

        // Notify other room members
        socket.to(roomId).emit('user_left', {
          userId: socket.userId,
          username: socket.username
        });

        socket.emit('room_left', { roomId });
      }

    } catch (error) {
      console.error('Leave room error:', error);
      socket.emit('error', { message: 'Failed to leave room' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { roomId } = data;
    if (roomId) {
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping: true
      });
    }
  });

  socket.on('typing_stop', (data) => {
    const { roomId } = data;
    if (roomId) {
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping: false
      });
    }
  });

  // Handle getting room members
  socket.on('get_room_members', async (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      const members = await db.getRoomMembers(roomId);
      socket.emit('room_members', { roomId, members });

    } catch (error) {
      console.error('Get room members error:', error);
      socket.emit('error', { message: 'Failed to get room members' });
    }
  });

  // Handle getting message history
  socket.on('get_message_history', async (data) => {
    try {
      const { roomId, page = 1, limit = 50 } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Check if user is in the room
      const inRoom = await db.isUserInRoom(roomId, socket.userId);
      if (!inRoom) {
        socket.emit('error', { message: 'You are not a member of this room' });
        return;
      }

      const messages = await db.getMessages(roomId, page, limit);
      socket.emit('message_history', { roomId, messages, page });

    } catch (error) {
      console.error('Get message history error:', error);
      socket.emit('error', { message: 'Failed to get message history' });
    }
  });

  // Handle exchange of public keys for E2E encryption
  socket.on('exchange_public_key', (data) => {
    const { recipientId, publicKey } = data;
    
    if (!recipientId || !publicKey) {
      socket.emit('error', { message: 'Recipient ID and public key are required' });
      return;
    }

    const recipient = activeUsers.get(recipientId);
    if (recipient) {
      io.to(recipient.socketId).emit('public_key_received', {
        senderId: socket.userId,
        senderUsername: socket.username,
        publicKey
      });
    } else {
      socket.emit('error', { message: 'Recipient is not online' });
    }
  });

  // Handle user status updates
  socket.on('update_status', (data) => {
    const { status } = data; // 'online', 'away', 'busy'
    
    const user = activeUsers.get(socket.userId);
    if (user) {
      user.status = status;
      user.lastSeen = new Date();
      
      // Broadcast status update to all contacts/rooms
      socket.broadcast.emit('user_status_update', {
        userId: socket.userId,
        username: socket.username,
        status
      });
    }
  });

};