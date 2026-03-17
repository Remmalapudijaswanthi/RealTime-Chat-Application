const express = require('express');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/chats/room — create or get existing private room
router.post('/room', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if private room already exists between these two users
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

    // Create new private room
    const room = await ChatRoom.create({
      type: 'private',
      members: [req.user._id, userId],
    });

    // Auto-add mutual contacts
    const User = require('../models/User'); // ensure User model is available
    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user._id),
      User.findById(userId)
    ]);

    if (currentUser && targetUser) {
      if (!currentUser.contacts.includes(targetUser._id)) {
        currentUser.contacts.push(targetUser._id);
        await currentUser.save();
      }
      if (!targetUser.contacts.includes(currentUser._id)) {
        targetUser.contacts.push(currentUser._id);
        await targetUser.save();
      }
    }

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

    // Include the creator in members
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
      'deletedBy.user': { $ne: req.user._id }, // Filter out rooms deleted by this user
    })
      .populate('members', 'username email avatar status lastSeen')
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

    // Verify user is a member of the room
    const room = await ChatRoom.findOne({
      _id: roomId,
      members: req.user._id,
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Find the timestamp when the user deleted the chat (if they did and it was restored)
    const deletionRecord = room.deletedBy?.find(
      (d) => d.user.toString() === req.user._id.toString()
    );

    const messageQuery = { 
      room: roomId,
      deletedBy: { $ne: req.user._id } // Exclude messages deleted for me
    };

    if (deletionRecord) {
      messageQuery.createdAt = { $gt: deletionRecord.deletedAt };
    }

    const messages = await Message.find(messageQuery)
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments(messageQuery);

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

// DELETE /api/chats/room/:roomId — delete entire conversation for current user
router.delete('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await ChatRoom.findOne({ _id: roomId, members: req.user._id });

    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Remove any existing logical deletion for this user to avoid duplicates
    room.deletedBy = room.deletedBy.filter(d => d.user.toString() !== req.user._id.toString());
    
    // Add new deletion record
    room.deletedBy.push({ user: req.user._id, deletedAt: new Date() });
    await room.save();

    res.json({ success: true, message: 'Chat deleted', roomId });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/chats/message/:messageId — Delete for Me
router.delete('/message/:messageId', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // "Delete for me" only requires being a member of the room where the message is
    const room = await ChatRoom.findOne({ _id: message.room, members: req.user._id });
    if (!room) {
       return res.status(403).json({ message: 'Not authorized to view this message' });
    }

    // Add user to deletedBy array
    if (!message.deletedBy.includes(req.user._id)) {
      message.deletedBy.push(req.user._id);
      await message.save();
    }

    res.json({ message: 'Message deleted for you', messageId: req.params.messageId, roomId: message.room });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/chats/message/:messageId/delete — Delete for Everyone
router.patch('/message/:messageId/delete', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages for everyone' });
    }

    // Check if within 5 minutes
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinsAgo) {
      return res.status(400).json({ message: 'Messages can only be deleted for everyone within 5 minutes of sending' });
    }

    message.deletedForEveryone = true;
    await message.save();

    res.json({ success: true, messageId: message._id, roomId: message.room });
  } catch (error) {
    console.error('Delete for everyone error:', error);
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

module.exports = router;
