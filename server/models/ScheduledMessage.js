const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'voice'],
      default: 'text',
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    sent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

scheduledMessageSchema.index({ scheduledAt: 1, sent: 1 });

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
