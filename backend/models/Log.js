const mongoose = require('mongoose');

const parsedEntrySchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      default: 'info',
    },
    sourceIP: {
      type: String,
    },
    destinationIP: {
      type: String,
    },
    message: {
      type: String,
    },
    eventType: {
      type: String,
    },
    protocol: {
      type: String,
    },
    port: {
      type: Number,
    },
    user: {
      type: String,
    },
    rawLine: {
      type: String,
    },
  },
  { _id: true }
);

const logSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: ['syslog', 'apache', 'nginx', 'windows_event', 'json', 'csv', 'unknown'],
      default: 'unknown',
    },
    rawContent: {
      type: String,
      required: true,
    },
    parsedEntries: [parsedEntrySchema],
    totalEntries: {
      type: Number,
      default: 0,
    },
    severityCounts: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      info: { type: Number, default: 0 },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: {
      fileSize: Number,
      mimeType: String,
      sourceIPs: [String],
      dateRange: {
        start: Date,
        end: Date,
      },
    },
    status: {
      type: String,
      enum: ['processing', 'parsed', 'error'],
      default: 'processing',
    },
    aiSummary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AISummary',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
logSchema.index({ createdAt: -1 });
logSchema.index({ 'parsedEntries.severity': 1 });
logSchema.index({ 'parsedEntries.sourceIP': 1 });
logSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);
