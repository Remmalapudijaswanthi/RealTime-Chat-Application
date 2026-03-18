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

    // Get user's blocked contacts to exclude from search
    const currentUser = await User.findById(req.user._id).select('blockedContacts');

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // exclude self
        { _id: { $nin: currentUser.blockedContacts } }, // exclude blocked
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        },
      ],
    })
      .select('username email avatar status lastSeen')
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      'username email avatar status lastSeen createdAt'
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
    
    // Check if new username is already taken by someone else
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
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ message: 'Settings required' });
    }

    const updateQuery = {};
    for (const key in settings) {
      updateQuery[`settings.${key}`] = settings[key];
    }

    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { $set: updateQuery },
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

// GET /api/users/contacts — get all contacts
router.get('/contacts', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'contacts',
      select: 'username email avatar status lastSeen bio createdAt',
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out blocked contacts implicitly just in case
    const blockedStrings = user.blockedContacts.map(id => id.toString());
    const validContacts = user.contacts.filter(
      c => !blockedStrings.includes(c._id.toString())
    );

    res.json(validContacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Server error fetching contacts' });
  }
});

// DELETE /api/users/contacts/:userId — remove a contact
router.delete('/contacts/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    // Validate target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Contact user not found' });
    }

    const currentUser = await User.findById(req.user._id);

    // Remove each other from contacts
    currentUser.contacts = currentUser.contacts.filter(id => id.toString() !== targetUserId);
    targetUser.contacts = targetUser.contacts.filter(id => id.toString() !== currentUser._id.toString());

    // Add each other to blockedContacts if not already there
    if (!currentUser.blockedContacts.includes(targetUserId)) {
      currentUser.blockedContacts.push(targetUserId);
    }
    if (!targetUser.blockedContacts.includes(currentUser._id)) {
      targetUser.blockedContacts.push(currentUser._id);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ success: true, message: 'Contact removed' });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({ message: 'Server error removing contact' });
  }
});

module.exports = router;
