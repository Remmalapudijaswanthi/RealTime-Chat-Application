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
        const {
          roomId,
          content,
          type = 'text',
          fileName = '',
          fileSize = '',
          replyTo = null,
          metadata = null,
        } = data;

        // Check if sender is blocked by any room member
        const room = await ChatRoom.findById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // For private rooms, check block status
        if (room.type === 'private') {
          const otherMemberId = room.members.find(m => m.toString() !== userId);
          if (otherMemberId) {
            const otherUser = await User.findById(otherMemberId);
            if (otherUser && otherUser.blockedUsers?.includes(userId)) {
              socket.emit('error', { message: 'You cannot send messages to this user' });
              return;
            }
            // Check if current user blocked the other
            const currentUser = await User.findById(userId);
            if (currentUser && currentUser.blockedUsers?.includes(otherMemberId.toString())) {
              socket.emit('error', { message: 'You have blocked this user. Unblock to send messages.' });
              return;
            }
          }
        }

        // Build message data
        const messageData = {
          sender: userId,
          room: roomId,
          content: content || '',
          type,
          fileName,
          fileSize,
        };

        // Add replyTo if present
        if (replyTo && replyTo.messageId) {
          messageData.replyTo = {
            messageId: replyTo.messageId,
            content: replyTo.content || '',
            senderName: replyTo.senderName || '',
            type: replyTo.type || 'text',
          };
        }

        // Add metadata for voice/audio
        if (metadata) {
          messageData.metadata = {
            duration: metadata.duration || 0,
            waveform: metadata.waveform || [],
          };
        }

        // Create message
        const message = await Message.create(messageData);

        // Check delivery status (for private rooms)
        if (room.type === 'private') {
          const otherMemberId = room.members.find(m => m.toString() !== userId);
          if (otherMemberId && onlineUsers.has(otherMemberId.toString())) {
            message.delivered = true;
            await message.save();
          }
        } else {
          // Group chats reach the server and are emitted to all
          message.delivered = true;
          await message.save();
        }

        // Populate sender info
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar');

        // Update room's lastMessage
        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: message._id,
        });

        // Emit to all room members
        io.to(roomId).emit('receive_message', populatedMessage);

        // Notify room members who aren't in the room
        if (room) {
          room.members.forEach((memberId) => {
            const memberIdStr = memberId.toString();
            if (memberIdStr !== userId) {
              const memberSocketId = onlineUsers.get(memberIdStr);
              if (memberSocketId) {
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

    // --- REACTIONS ---
    socket.on('add_reaction', async ({ messageId, roomId, emoji }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // Find existing reaction for this emoji
        const existing = message.reactions.find(r => r.emoji === emoji);

        if (existing) {
          // If user already reacted with this emoji, remove it (toggle)
          if (existing.users.includes(userId)) {
            existing.users = existing.users.filter(u => u.toString() !== userId);
            if (existing.users.length === 0) {
              message.reactions = message.reactions.filter(r => r.emoji !== emoji);
            }
          } else {
            // Remove user from any other reaction on this message
            message.reactions.forEach(r => {
              r.users = r.users.filter(u => u.toString() !== userId);
            });
            message.reactions = message.reactions.filter(r => r.users.length > 0);
            // Re-find or create the reaction
            const refreshed = message.reactions.find(r => r.emoji === emoji);
            if (refreshed) {
              refreshed.users.push(userId);
            } else {
              message.reactions.push({ emoji, users: [userId] });
            }
          }
        } else {
          // Remove user from any other reaction
          message.reactions.forEach(r => {
            r.users = r.users.filter(u => u.toString() !== userId);
          });
          message.reactions = message.reactions.filter(r => r.users.length > 0);
          // Add new reaction
          message.reactions.push({ emoji, users: [userId] });
        }

        await message.save();

        io.to(roomId).emit('reaction_updated', {
          messageId,
          reactions: message.reactions,
        });
      } catch (error) {
        console.error('Add reaction error:', error);
      }
    });

    // --- PIN / UNPIN ---
    socket.on('pin_message', async ({ roomId, messageId }) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return;

        if (room.pinnedMessages.length >= 3) {
          socket.emit('error', { message: 'Maximum 3 pinned messages' });
          return;
        }

        room.pinnedMessages.push({
          message: messageId,
          pinnedBy: userId,
          pinnedAt: new Date(),
        });
        await room.save();

        const updatedRoom = await ChatRoom.findById(roomId)
          .populate({
            path: 'pinnedMessages.message',
            populate: { path: 'sender', select: 'username avatar' },
          });

        io.to(roomId).emit('message_pinned', {
          roomId,
          pinnedMessages: updatedRoom.pinnedMessages,
        });
      } catch (error) {
        console.error('Pin message error:', error);
      }
    });

    socket.on('unpin_message', async ({ roomId, messageId }) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return;

        room.pinnedMessages = room.pinnedMessages.filter(
          p => p.message.toString() !== messageId
        );
        await room.save();

        io.to(roomId).emit('message_unpinned', {
          roomId,
          pinnedMessages: room.pinnedMessages,
        });
      } catch (error) {
        console.error('Unpin message error:', error);
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

    // --- DISCONNECT ---
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);

      const user = await User.findById(userId);
      if (user && user.status !== 'Invisible') {
        await User.findByIdAndUpdate(userId, {
          status: 'Invisible',
          lastSeen: new Date(),
        });
        io.emit('user_status_change', { userId, status: 'Invisible' });
      }
    });
  });
};
