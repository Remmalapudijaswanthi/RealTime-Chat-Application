const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [100, 'Bio cannot exceed 100 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['Online', 'Away', 'Busy', 'Invisible'],
      default: 'Online',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    mutedChats: [
      {
        room: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' },
        mutedUntil: { type: Date, default: null }, // null = forever
      },
    ],
    contacts: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        nickname: { type: String, default: '' },
      },
    ],
    settings: {
      showLastSeen: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
      notifications: { type: Boolean, default: true },
      theme: { type: String, default: 'dark-nebula' },
      appBackground: { type: String, default: '#0A0A0A' },
      chatWallpaper: { type: String, default: 'default' },
      chatWallpaper: { type: String, default: 'default' },
      messageTemplates: { type: [String], default: [] },
      chatLockPin: { type: String, default: null }, // Hashed PIN
      lockedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' }],
      chatBackgrounds: { type: Map, of: String, default: {} }, // roomId -> background
    },
    starredMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Generate avatar from initials before saving
userSchema.pre('save', async function (next) {
  if (!this.avatar || this.avatar === '') {
    this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      this.username
    )}&background=7c3aed&color=fff&bold=true&size=128`;
  }

  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
      return next(err);
    }
  }

  if (this.isModified('settings.chatLockPin') && this.settings.chatLockPin) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.settings.chatLockPin = await bcrypt.hash(this.settings.chatLockPin, salt);
    } catch (err) {
      return next(err);
    }
  }

  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.comparePin = async function (candidatePin) {
  if (!this.settings.chatLockPin) return false;
  return bcrypt.compare(candidatePin, this.settings.chatLockPin);
};

module.exports = mongoose.model('User', userSchema);
