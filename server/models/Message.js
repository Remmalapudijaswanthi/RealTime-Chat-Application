const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'voice', 'file'],
      default: 'text',
    },
    fileName: {
      type: String,
      default: '',
    },
    fileSize: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    // Message reactions
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    // Reply to another message
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
      content: { type: String, default: '' },
      senderName: { type: String, default: '' },
      type: { type: String, default: 'text' },
    },
    metadata: {
      duration: { type: Number, default: 0 },
      waveform: { type: [Number], default: [] },
    },
    // Forwarded message info
    forwardedFrom: {
      senderName: { type: String, default: null },
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model('Message', messageSchema);
