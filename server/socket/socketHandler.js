const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

// Map of userId -> socketId for online tracking
const onlineUsers = new Map();

module.exports = (io) => {
  // Middleware: authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${socket.user.username} (${userId})`);

    // Track online user
    onlineUsers.set(userId, socket.id);

    // Update user status to online
    await User.findByIdAndUpdate(userId, { status: 'Online' });

    // Broadcast status change to all
    io.emit('user_status_change', { userId, status: 'Online' });

    // --- JOIN ROOM ---
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`${socket.user.username} joined room: ${roomId}`);
    });

    // --- SEND MESSAGE ---
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, type = 'text', fileName = '', fileSize = '' } = data;

        // Create message
        const message = await Message.create({
          sender: userId,
          room: roomId,
          content,
          type,
          fileName,
          fileSize,
        });

        // Populate sender info
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar');

        // Update room's lastMessage and clear deletedBy array so it reappears for users
        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: message._id,
          $set: { deletedBy: [] }
        });

        // Emit to all room members
        io.to(roomId).emit('receive_message', populatedMessage);

        // Notify room members who aren't in the room
        const room = await ChatRoom.findById(roomId);
        if (room) {
          room.members.forEach((memberId) => {
            const memberIdStr = memberId.toString();
            if (memberIdStr !== userId) {
              const memberSocketId = onlineUsers.get(memberIdStr);
              if (memberSocketId) {
                // Notice the new_room event will trigger a refetch if user doesn't have it
                io.to(memberSocketId).emit('new_room', {
                  roomId,
                  message: populatedMessage,
                });
              }
            }
          });
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // --- TYPING ---
    socket.on('typing', ({ roomId }) => {
      socket.to(roomId).emit('user_typing', {
        userId,
        username: socket.user.username,
        roomId,
      });
    });

    // --- STOP TYPING ---
    socket.on('stop_typing', ({ roomId }) => {
      socket.to(roomId).emit('user_stop_typing', {
        userId,
        roomId,
      });
    });

    // --- MARK READ ---
    socket.on('mark_read', async ({ roomId }) => {
      try {
        await Message.updateMany(
          {
            room: roomId,
            sender: { $ne: userId },
            read: false,
          },
          { read: true }
        );

        socket.to(roomId).emit('message_read', {
          roomId,
          readBy: userId,
        });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // --- MESSAGE DELETED FOR EVERYONE ---
    socket.on('message_deleted_everyone', ({ roomId, messageId }) => {
      socket.to(roomId).emit('message_deleted_everyone', { roomId, messageId });
    });

    // --- DISCONNECT ---
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);

      // Fetch user to check their settings before updating status
      const user = await User.findById(userId);
      if (user && user.status !== 'Invisible') {
        // Only update to Invisible if they were actually online/away/busy
        await User.findByIdAndUpdate(userId, {
          status: 'Invisible',
          lastSeen: new Date(),
        });
        io.emit('user_status_change', { userId, status: 'Invisible' });
      }
    });
  });
};
