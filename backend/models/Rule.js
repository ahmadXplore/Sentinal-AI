const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
    },
    operator: {
      type: String,
      required: true,
      enum: ['equals', 'contains', 'regex', 'gt', 'lt'],
    },
    value: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const ruleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Rule name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      default: 'medium',
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
    conditions: {
      type: [conditionSchema],
      required: true,
      validate: [
        (val) => val.length > 0,
        'At least one condition is required',
      ],
    },
    timeWindowMinutes: {
      type: Number, // Optional: window size for aggregation
    },
    minThreshold: {
      type: Number, // Optional: minimum occurrences for aggregation
    },
    groupBy: {
      type: String, // Optional: field to group occurrences by (e.g., sourceIP, user)
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Rule', ruleSchema);
