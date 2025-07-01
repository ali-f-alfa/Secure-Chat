const { validateRoomName } = require('../utils/validation');

module.exports = (socket, io, db, activeUsers, activeRooms) => {

  // Handle creating a new room
  socket.on('create_room', async (data) => {
    try {
      const { name, isPrivate = false } = data;
      
      if (!validateRoomName(name)) {
        socket.emit('error', { message: 'Invalid room name' });
        return;
      }

      const room = await db.createRoom(name, socket.userId, isPrivate);
      
      // Join the creator to the room
      socket.join(room.id);
      
      // Update user's current room
      const user = activeUsers.get(socket.userId);
      if (user) {
        user.currentRoom = room.id;
      }

      socket.emit('room_created', room);
      
      // If it's a public room, broadcast to all users
      if (!isPrivate) {
        socket.broadcast.emit('new_room_available', room);
      }

    } catch (error) {
      console.error('Create room error:', error);
      socket.emit('error', { message: error.message || 'Failed to create room' });
    }
  });

  // Handle getting list of available rooms
  socket.on('get_rooms', async () => {
    try {
      const rooms = await db.getRooms();
      socket.emit('rooms_list', rooms);
    } catch (error) {
      console.error('Get rooms error:', error);
      socket.emit('error', { message: 'Failed to get rooms list' });
    }
  });

  // Handle getting user's joined rooms
  socket.on('get_my_rooms', async () => {
    try {
      const rooms = await db.getUserRooms(socket.userId);
      socket.emit('my_rooms_list', rooms);
    } catch (error) {
      console.error('Get my rooms error:', error);
      socket.emit('error', { message: 'Failed to get your rooms list' });
    }
  });

  // Handle room search
  socket.on('search_rooms', async (data) => {
    try {
      const { query } = data;
      
      if (!query || query.trim().length < 2) {
        socket.emit('error', { message: 'Search query must be at least 2 characters' });
        return;
      }

      // This is a simple search - in production you might want more sophisticated search
      const allRooms = await db.getRooms();
      const filteredRooms = allRooms.filter(room => 
        room.name.toLowerCase().includes(query.toLowerCase())
      );

      socket.emit('search_results', filteredRooms);

    } catch (error) {
      console.error('Search rooms error:', error);
      socket.emit('error', { message: 'Failed to search rooms' });
    }
  });

  // Handle inviting user to private room
  socket.on('invite_to_room', async (data) => {
    try {
      const { roomId, inviteeUsername } = data;
      
      if (!roomId || !inviteeUsername) {
        socket.emit('error', { message: 'Room ID and invitee username are required' });
        return;
      }

      // Check if the inviter is an admin of the room
      const members = await db.getRoomMembers(roomId);
      const inviter = members.find(m => m.id === socket.userId);
      
      if (!inviter || inviter.role !== 'admin') {
        socket.emit('error', { message: 'You do not have permission to invite users to this room' });
        return;
      }

      // Find the invitee
      const invitee = Array.from(activeUsers.values()).find(u => u.username === inviteeUsername);
      
      if (!invitee) {
        socket.emit('error', { message: 'User not found or not online' });
        return;
      }

      // Send invitation
      const inviteeSocket = io.sockets.sockets.get(invitee.socketId);
      if (inviteeSocket) {
        inviteeSocket.emit('room_invitation', {
          roomId,
          roomName: 'Room', // You might want to get the actual room name
          inviterUsername: socket.username,
          inviterId: socket.userId
        });

        socket.emit('invitation_sent', { 
          inviteeUsername,
          roomId 
        });
      }

    } catch (error) {
      console.error('Invite to room error:', error);
      socket.emit('error', { message: 'Failed to send invitation' });
    }
  });

  // Handle accepting room invitation
  socket.on('accept_room_invitation', async (data) => {
    try {
      const { roomId, inviterId } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Add user to room
      const added = await db.addUserToRoom(roomId, socket.userId);
      
      if (added) {
        // Join the socket room
        socket.join(roomId);
        
        // Update user's current room
        const user = activeUsers.get(socket.userId);
        if (user) {
          user.currentRoom = roomId;
        }

        // Notify room members
        socket.to(roomId).emit('user_joined', {
          userId: socket.userId,
          username: socket.username
        });

        // Notify the inviter
        if (inviterId) {
          const inviter = activeUsers.get(inviterId);
          if (inviter) {
            io.to(inviter.socketId).emit('invitation_accepted', {
              acceptedBy: socket.username,
              roomId
            });
          }
        }

        // Get room info and recent messages
        const members = await db.getRoomMembers(roomId);
        const recentMessages = await db.getMessages(roomId, 1, 20);
        
        socket.emit('room_joined', { 
          roomId, 
          members,
          messages: recentMessages 
        });
      }

    } catch (error) {
      console.error('Accept invitation error:', error);
      socket.emit('error', { message: 'Failed to accept invitation' });
    }
  });

  // Handle declining room invitation
  socket.on('decline_room_invitation', (data) => {
    try {
      const { roomId, inviterId } = data;
      
      // Notify the inviter
      if (inviterId) {
        const inviter = activeUsers.get(inviterId);
        if (inviter) {
          io.to(inviter.socketId).emit('invitation_declined', {
            declinedBy: socket.username,
            roomId
          });
        }
      }

      socket.emit('invitation_declined_sent', { roomId });

    } catch (error) {
      console.error('Decline invitation error:', error);
      socket.emit('error', { message: 'Failed to decline invitation' });
    }
  });

  // Handle getting room info
  socket.on('get_room_info', async (data) => {
    try {
      const { roomId } = data;
      
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

      const members = await db.getRoomMembers(roomId);
      
      socket.emit('room_info', {
        roomId,
        members: members.map(member => ({
          ...member,
          isOnline: activeUsers.has(member.id)
        }))
      });

    } catch (error) {
      console.error('Get room info error:', error);
      socket.emit('error', { message: 'Failed to get room info' });
    }
  });

  // Handle updating room settings (admin only)
  socket.on('update_room_settings', async (data) => {
    try {
      const { roomId, settings } = data;
      
      if (!roomId || !settings) {
        socket.emit('error', { message: 'Room ID and settings are required' });
        return;
      }

      // Check if user is admin of the room
      const members = await db.getRoomMembers(roomId);
      const userMember = members.find(m => m.id === socket.userId);
      
      if (!userMember || userMember.role !== 'admin') {
        socket.emit('error', { message: 'You do not have permission to update room settings' });
        return;
      }

      // Update settings in database (you'd need to implement this method)
      // await db.updateRoomSettings(roomId, settings);

      // Notify all room members about settings change
      io.to(roomId).emit('room_settings_updated', {
        roomId,
        settings,
        updatedBy: socket.username
      });

    } catch (error) {
      console.error('Update room settings error:', error);
      socket.emit('error', { message: 'Failed to update room settings' });
    }
  });

  // Handle kicking user from room (admin only)
  socket.on('kick_user', async (data) => {
    try {
      const { roomId, userId } = data;
      
      if (!roomId || !userId) {
        socket.emit('error', { message: 'Room ID and user ID are required' });
        return;
      }

      // Check if requester is admin
      const members = await db.getRoomMembers(roomId);
      const requester = members.find(m => m.id === socket.userId);
      
      if (!requester || requester.role !== 'admin') {
        socket.emit('error', { message: 'You do not have permission to kick users' });
        return;
      }

      // Don't allow kicking other admins or self
      const target = members.find(m => m.id === userId);
      if (!target) {
        socket.emit('error', { message: 'User not found in room' });
        return;
      }

      if (target.role === 'admin') {
        socket.emit('error', { message: 'Cannot kick room administrators' });
        return;
      }

      // Remove user from room
      await db.removeUserFromRoom(roomId, userId);

      // If user is online, remove them from socket room and notify
      const targetUser = activeUsers.get(userId);
      if (targetUser) {
        const targetSocket = io.sockets.sockets.get(targetUser.socketId);
        if (targetSocket) {
          targetSocket.leave(roomId);
          targetSocket.emit('kicked_from_room', {
            roomId,
            kickedBy: socket.username
          });
        }
        targetUser.currentRoom = null;
      }

      // Notify room members
      io.to(roomId).emit('user_kicked', {
        userId,
        username: target.username,
        kickedBy: socket.username
      });

    } catch (error) {
      console.error('Kick user error:', error);
      socket.emit('error', { message: 'Failed to kick user' });
    }
  });

};