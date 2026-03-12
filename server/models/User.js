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
      type: String, // Will store base64 string or URL
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
    settings: {
      showLastSeen: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
      notifications: { type: Boolean, default: true },
      theme: { type: String, default: 'dark-nebula' }
    }
  },
  {
    timestamps: true,
  }
);

// Generate avatar from initials before saving
userSchema.pre('save', async function (next) {
  // Generate avatar from initials if not set
  if (!this.avatar || this.avatar === '') {
    const initials = this.username
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      this.username
    )}&background=7c3aed&color=fff&bold=true&size=128`;
  }

  // Hash password only if modified
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
