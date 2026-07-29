const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const chatSessionSchema = new mongoose.Schema(
  {
    contextType: {
      type: String,
      enum: ['alert', 'log'],
      required: true,
    },
    contextId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'AI Investigation Chat',
    },
    messages: [messageSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    model: {
      type: String,
      default: 'qwen2.5:3b',
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

chatSessionSchema.index({ contextId: 1, contextType: 1 });
chatSessionSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
