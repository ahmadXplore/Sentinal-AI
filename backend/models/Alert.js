const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rule',
      required: true,
      index: true,
    },
    ruleName: {
      type: String,
      required: true,
    },
    logId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Log',
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      default: 'medium',
      index: true,
    },
    mitreAttack: {
      techniqueId: {
        type: String,
        trim: true,
      },
      techniqueName: {
        type: String,
        trim: true,
      },
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'false_positive'],
      default: 'open',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    description: {
      type: String,
    },
    affectedIPs: [
      {
        type: String,
      },
    ],
    affectedUsers: [
      {
        type: String,
      },
    ],
    matchedEntries: [
      {
        timestamp: Date,
        severity: String,
        sourceIP: String,
        destinationIP: String,
        message: String,
        eventType: String,
        user: String,
        rawLine: String,
      },
    ],
    notes: [
      {
        text: {
          type: String,
          required: true,
        },
        addedBy: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
