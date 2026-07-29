const mongoose = require('mongoose');

const aiSummarySchema = new mongoose.Schema(
  {
    logId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Log',
      required: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
    },
    highlights: [
      {
        type: { type: String }, // 'warning', 'critical', 'info'
        message: String,
      },
    ],
    suspiciousActivities: [
      {
        description: String,
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
        },
        indicators: [String],
        recommendation: String,
      },
    ],
    notableEvents: [
      {
        event: String,
        count: Number,
        significance: String,
      },
    ],
    recommendations: [String],
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    model: {
      type: String,
      default: 'qwen2.5:3b',
    },
    processingTime: {
      type: Number, // milliseconds
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'error'],
      default: 'pending',
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AISummary', aiSummarySchema);
