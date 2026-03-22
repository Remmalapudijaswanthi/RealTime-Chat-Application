const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['private', 'group'],
      default: 'private',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    pinnedMessages: [
      {
        message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
        pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        pinnedAt: { type: Date, default: Date.now },
      },
    ],
    deletedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deletedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient member lookup
chatRoomSchema.index({ members: 1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
