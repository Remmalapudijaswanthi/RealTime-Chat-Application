const express = require('express');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const User = require('../models/User');
const ScheduledMessage = require('../models/ScheduledMessage');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/chats/room/:roomId/messages — send a message (text, image, video, audio, document)
router.post('/room/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type, caption, replyTo, forwardedFrom } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const room = await ChatRoom.findOne({ _id: roomId, members: req.user._id });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const message = await Message.create({
      sender: req.user._id,
      room: roomId,
      content,
      type: type || 'text',
      caption: caption || '',
      replyTo: replyTo || null,
      forwardedFrom: forwardedFrom || null,
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'username displayName avatar');

    await ChatRoom.findByIdAndUpdate(roomId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    const io = req.app.get('io');
    if (io) {
      io.to(roomId.toString()).emit('receive_message', populated);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

// POST /api/chats/room — create or get existing private room
router.post('/room', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const existingRoom = await ChatRoom.findOne({
      type: 'private',
      members: { $all: [req.user._id, userId], $size: 2 },
    })
      .populate('members', 'username email avatar status lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username' },
      });

    if (existingRoom) {
      return res.json(existingRoom);
    }

    const room = await ChatRoom.create({
      type: 'private',
      members: [req.user._id, userId],
    });

    const populatedRoom = await ChatRoom.findById(room._id)
      .populate('members', 'username email avatar status lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username' },
      });

    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chats/group — create group room
router.post('/group', authMiddleware, async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || !members || members.length < 1) {
      return res
        .status(400)
        .json({ message: 'Group name and at least one member are required' });
    }

    const allMembers = [...new Set([req.user._id.toString(), ...members])];

    const room = await ChatRoom.create({
      name,
      type: 'group',
      members: allMembers,
    });

    const populatedRoom = await ChatRoom.findById(room._id)
      .populate('members', 'username email avatar status lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username' },
      });

    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats/rooms — get all rooms for logged-in user
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      members: req.user._id,
      $or: [
        { 'deletedBy.user': { $ne: req.user._id } },
        { deletedBy: { $size: 0 } }
      ]
    })
      .populate('members', 'username displayName avatar status lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username' },
      })
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats/room/:roomId/messages — paginated messages
router.get('/room/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const room = await ChatRoom.findOne({
      _id: roomId,
      members: req.user._id,
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ room: roomId });

    res.json({
      messages: messages.reverse(),
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalMessages: total,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/chats/message/:messageId — delete own message
router.delete('/message/:messageId', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    const lastMsg = await Message.findOne({ room: message.room })
      .sort({ createdAt: -1 });

    await ChatRoom.findByIdAndUpdate(message.room, {
      lastMessage: lastMsg ? lastMsg._id : null,
    });

    res.json({ message: 'Message deleted', messageId: req.params.messageId, roomId: message.room });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/chats/message/:messageId — edit own message
router.patch('/message/:messageId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    message.content = content.trim();
    message.edited = true;
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar');

    res.json(updatedMessage);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/chats/message/:messageId/react — add/remove reaction
router.patch('/message/:messageId/react', authMiddleware, async (req, res) => {
  try {
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const existing = message.reactions.find(r => r.emoji === emoji);

    if (existing) {
      if (existing.users.includes(userId)) {
        // Toggle off
        existing.users = existing.users.filter(u => u.toString() !== userId.toString());
        if (existing.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        // Add to this, remove from others
        message.reactions.forEach(r => {
          r.users = r.users.filter(u => u.toString() !== userId.toString());
        });
        message.reactions = message.reactions.filter(r => r.users.length > 0);
        
        const refreshed = message.reactions.find(r => r.emoji === emoji);
        if (refreshed) refreshed.users.push(userId);
        else message.reactions.push({ emoji, users: [userId] });
      }
    } else {
      // Remove from others, add new
      message.reactions.forEach(r => {
        r.users = r.users.filter(u => u.toString() !== userId.toString());
      });
      message.reactions = message.reactions.filter(r => r.users.length > 0);
      message.reactions.push({ emoji, users: [userId] });
    }

    await message.save();
    res.json(message.reactions);
  } catch (error) {
    console.error('Reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// === PIN MESSAGES ===

// POST /api/chats/room/:roomId/pin/:messageId
router.post('/room/:roomId/pin/:messageId', authMiddleware, async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    const room = await ChatRoom.findOne({ _id: roomId, members: req.user._id });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.pinnedMessages.length >= 3) {
      return res.status(400).json({ message: 'Maximum 3 messages can be pinned. Unpin one first.' });
    }

    const already = room.pinnedMessages.find(p => p.message.toString() === messageId);
    if (already) return res.status(400).json({ message: 'Message already pinned' });

    room.pinnedMessages.push({
      message: messageId,
      pinnedBy: req.user._id,
      pinnedAt: new Date(),
    });
    await room.save();

    const updatedRoom = await ChatRoom.findById(roomId)
      .populate({
        path: 'pinnedMessages.message',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .populate('pinnedMessages.pinnedBy', 'username');

    res.json(updatedRoom.pinnedMessages);
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/chats/room/:roomId/pin/:messageId
router.delete('/room/:roomId/pin/:messageId', authMiddleware, async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    const room = await ChatRoom.findOne({ _id: roomId, members: req.user._id });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    room.pinnedMessages = room.pinnedMessages.filter(
      p => p.message.toString() !== messageId
    );
    await room.save();

    res.json({ message: 'Message unpinned' });
  } catch (error) {
    console.error('Unpin message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats/room/:roomId/pinned
router.get('/room/:roomId/pinned', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findOne({ _id: req.params.roomId, members: req.user._id })
      .populate({
        path: 'pinnedMessages.message',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .populate('pinnedMessages.pinnedBy', 'username');

    if (!room) return res.status(404).json({ message: 'Room not found' });

    res.json(room.pinnedMessages);
  } catch (error) {
    console.error('Get pinned error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// === SCHEDULED MESSAGES ===

// POST /api/chats/schedule
router.post('/schedule', authMiddleware, async (req, res) => {
  try {
    const { roomId, content, type, scheduledAt } = req.body;

    if (!roomId || !content || !scheduledAt) {
      return res.status(400).json({ message: 'Room, content, and scheduled time are required' });
    }

    const schedDate = new Date(scheduledAt);
    if (schedDate <= new Date()) {
      return res.status(400).json({ message: 'Cannot schedule in the past' });
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    if (schedDate > maxDate) {
      return res.status(400).json({ message: 'Cannot schedule more than 7 days ahead' });
    }

    const scheduled = await ScheduledMessage.create({
      sender: req.user._id,
      room: roomId,
      content,
      type: type || 'text',
      scheduledAt: schedDate,
    });

    res.status(201).json(scheduled);
  } catch (error) {
    console.error('Schedule message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats/schedule
router.get('/schedule', authMiddleware, async (req, res) => {
  try {
    const scheduled = await ScheduledMessage.find({
      sender: req.user._id,
      sent: false,
    }).sort({ scheduledAt: 1 });

    res.json(scheduled);
  } catch (error) {
    console.error('Get scheduled error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/chats/schedule/:id
router.delete('/schedule/:id', authMiddleware, async (req, res) => {
  try {
    const scheduled = await ScheduledMessage.findOneAndDelete({
      _id: req.params.id,
      sender: req.user._id,
      sent: false,
    });

    if (!scheduled) {
      return res.status(404).json({ message: 'Scheduled message not found' });
    }

    res.json({ message: 'Scheduled message cancelled' });
  } catch (error) {
    console.error('Cancel scheduled error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// === MESSAGE FORWARD ===

// POST /api/chats/forward
router.post('/forward', authMiddleware, async (req, res) => {
  try {
    const { messageId, roomIds } = req.body;

    if (!messageId || !roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ message: 'Message ID and list of Room IDs are required' });
    }

    const originalMessage = await Message.findById(messageId).populate('sender', 'username');
    if (!originalMessage) {
      return res.status(404).json({ message: 'Original message not found' });
    }

    const results = [];
    const io = req.app.get('io');

    for (const roomId of roomIds) {
      // Create forwarded message
      const newMessage = await Message.create({
        sender: req.user._id,
        room: roomId,
        content: originalMessage.content,
        type: originalMessage.type,
        fileName: originalMessage.fileName,
        fileSize: originalMessage.fileSize,
        caption: originalMessage.caption,
        metadata: originalMessage.metadata,
        forwardedFrom: {
          senderName: originalMessage.sender.username,
          messageId: originalMessage._id,
        },
      });

      const populated = await Message.findById(newMessage._id)
        .populate('sender', 'username avatar');

      // Update room lastMessage
      await ChatRoom.findByIdAndUpdate(roomId, {
        lastMessage: newMessage._id,
        $set: { updatedAt: new Date() }
      });

      // Emit via socket
      if (io) {
        io.to(roomId.toString()).emit('receive_message', populated);
      }

      results.push(populated);
    }

    res.json({ success: true, count: results.length });
  } catch (error) {
    console.error('Forward message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// === STARRED MESSAGES ===

// POST /api/chats/message/:messageId/star
router.post('/message/:messageId/star', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = await User.findById(req.user._id);

    if (user.starredMessages.length >= 50) {
      return res.status(400).json({ 
        message: 'Maximum 50 starred messages reached. Unstar some messages first.' 
      });
    }

    if (!user.starredMessages.includes(messageId)) {
      user.starredMessages.push(messageId);
      await user.save();
    }

    res.json({ success: true, starred: true });
  } catch (error) {
    console.error('Star message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/chats/message/:messageId/star
router.delete('/message/:messageId/star', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = await User.findById(req.user._id);

    user.starredMessages = user.starredMessages.filter(
      id => id.toString() !== messageId
    );
    await user.save();

    res.json({ success: true, starred: false });
  } catch (error) {
    console.error('Unstar message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/chats/room/:roomId — logical delete room for user
router.delete('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    if (!room.members.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const alreadyDeleted = room.deletedBy.find(d => d.user.toString() === userId.toString());
    if (!alreadyDeleted) {
      await ChatRoom.findByIdAndUpdate(roomId, {
        $push: { deletedBy: { user: userId, deletedAt: new Date() } }
      });
    }

    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (err) {
    console.error('Delete chat error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete chat' });
  }
});

module.exports = router;
