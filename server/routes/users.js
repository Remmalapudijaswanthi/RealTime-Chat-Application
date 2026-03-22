const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/users/search?q=
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { username: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username avatar status')
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/blocked
router.get('/blocked', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'username avatar');
    res.json(user.blockedUsers || []);
  } catch (error) {
    console.error('Get blocked error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/starred
router.get('/starred', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'starredMessages',
      populate: [
        { path: 'sender', select: 'username avatar' },
        { path: 'room', select: 'name type' }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out nulls if any message was deleted but still in starred array
    const starred = (user.starredMessages || [])
      .filter(msg => msg !== null)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(starred);
  } catch (error) {
    console.error('Get starred error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      'username avatar status lastSeen createdAt bio'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/status
router.patch('/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Online', 'Away', 'Busy', 'Invisible'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { status };
    if (status === 'Invisible') {
      updateData.lastSeen = new Date();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
    }).select('username email avatar bio status lastSeen settings');

    res.json(user);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, bio, avatar, status } = req.body;
    
    if (username && username !== req.user.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio.substring(0, 100);
    if (avatar) updateData.avatar = avatar;
    if (status && ['Online', 'Away', 'Busy', 'Invisible'].includes(status)) {
      updateData.status = status;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// PATCH /api/users/settings
router.patch('/settings', authMiddleware, async (req, res) => {
  try {
    const allowedFields = [
      'theme', 'colorMode',
      'chatWallpaper',
      'showLastSeen',
      'showOnlineStatus',
      'readReceipts',
      'notifications'
    ];

    const updates = {};
    
    // Check direct fields from req.body
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[`settings.${field}`] = req.body[field];
      }
    });

    // Also support nested settings object just in case any client uses it
    if (req.body.settings) {
      allowedFields.forEach(field => {
        if (req.body.settings[field] !== undefined) {
          updates[`settings.${field}`] = req.body.settings[field];
        }
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid settings fields provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json(user.settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error updating settings' });
  }
});

// POST /api/users/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new passwords are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
});

// === BLOCK / UNBLOCK ===

// POST /api/users/block/:userId
router.post('/block/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userId },
    });

    res.json({ message: 'User blocked' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/block/:userId
router.delete('/block/:userId', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.userId },
    });

    res.json({ message: 'User unblocked' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// === MUTE / UNMUTE ===

// PATCH /api/users/mute/:roomId
router.patch('/mute/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { mutedUntil } = req.body; // null = forever, or ISO date

    // Remove existing mute for this room first
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { mutedChats: { room: roomId } },
    });

    // Add new mute
    await User.findByIdAndUpdate(req.user._id, {
      $push: { mutedChats: { room: roomId, mutedUntil: mutedUntil || null } },
    });

    res.json({ message: 'Chat muted' });
  } catch (error) {
    console.error('Mute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/mute/:roomId
router.delete('/mute/:roomId', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { mutedChats: { room: req.params.roomId } },
    });

    res.json({ message: 'Chat unmuted' });
  } catch (error) {
    console.error('Unmute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// === CONTACT NICKNAME ===

// PATCH /api/users/contacts/:userId/nickname
router.patch('/contacts/:userId/nickname', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { nickname } = req.body;

    const user = await User.findById(req.user._id);
    const contactIndex = user.contacts.findIndex(
      c => c.user.toString() === userId
    );

    if (contactIndex >= 0) {
      if (nickname) {
        user.contacts[contactIndex].nickname = nickname;
      } else {
        user.contacts.splice(contactIndex, 1);
      }
    } else if (nickname) {
      user.contacts.push({ user: userId, nickname });
    }

    await user.save();
    res.json(user.contacts);
  } catch (error) {
    console.error('Set nickname error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// === CHAT LOCK / PIN ===

// POST /api/users/profile/chat-lock/pin
router.post('/profile/chat-lock/pin', authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length !== 4) {
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    const user = await User.findById(req.user._id);
    user.settings.chatLockPin = pin;
    await user.save();

    res.json({ message: 'Chat lock PIN set successfully' });
  } catch (error) {
    console.error('Set PIN error:', error);
    res.status(500).json({ message: 'Server error setting PIN' });
  }
});

// POST /api/users/profile/chat-lock/verify
router.post('/profile/chat-lock/verify', authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id).select('+settings.chatLockPin');
    
    if (!user.settings.chatLockPin) {
      return res.status(400).json({ message: 'No PIN set' });
    }

    const isMatch = await user.comparePin(pin);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect PIN' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Verify PIN error:', error);
    res.status(500).json({ message: 'Server error verifying PIN' });
  }
});

// PATCH /api/users/profile/chat-lock/:roomId/toggle
router.patch('/profile/chat-lock/:roomId/toggle', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const user = await User.findById(req.user._id);

    const index = user.settings.lockedChats.indexOf(roomId);
    if (index > -1) {
      user.settings.lockedChats.splice(index, 1);
    } else {
      user.settings.lockedChats.push(roomId);
    }

    await user.save();
    res.json(user.settings.lockedChats);
  } catch (error) {
    console.error('Toggle lock error:', error);
    res.status(500).json({ message: 'Server error toggling lock' });
  }
});

// POST /api/users/chat-lock/reset — change PIN
router.post('/chat-lock/reset', authMiddleware, async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    if (!oldPin || !newPin || newPin.length !== 4) {
      return res.status(400).json({ message: 'Valid old and new PIN required' });
    }

    const user = await User.findById(req.user._id);
    if (!user.settings.chatLockPin) {
      return res.status(400).json({ message: 'No PIN set' });
    }

    const isMatch = await user.comparePin(oldPin);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current PIN' });
    }

    user.settings.chatLockPin = newPin;
    await user.save();
    res.json({ message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Reset PIN error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/chat-lock/pin — remove PIN and unlock all
router.delete('/chat-lock/pin', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.settings.chatLockPin = null;
    user.settings.lockedChats = [];
    await user.save();
    res.json({ message: 'PIN removed and all chats unlocked' });
  } catch (error) {
    console.error('Remove PIN error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/profile/chat-background
router.patch('/profile/chat-background', authMiddleware, async (req, res) => {
  try {
    const { roomId, background } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.settings.chatBackgrounds) {
      user.settings.chatBackgrounds = new Map();
    }

    user.settings.chatBackgrounds.set(roomId, background);
    await user.save();

    res.json(user.settings.chatBackgrounds);
  } catch (error) {
    console.error('Update chat background error:', error);
    res.status(500).json({ message: 'Server error updating chat background' });
  }
});

module.exports = router;
