const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'under_review', 'finalized'],
      default: 'draft',
      index: true,
    },

    // AI-generated structured report
    report: {
      incidentSummary: { type: String },
      threatDescription: { type: String },
      attackVector: { type: String },
      affectedSystems: [String],
      mitreAttack: {
        tacticId: String,
        tacticName: String,
        techniqueId: String,
        techniqueName: String,
        explanation: String,
      },
      riskAssessment: {
        score: { type: Number, min: 0, max: 100 },
        level: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
        businessImpact: String,
        likelihood: String,
      },
      timeline: [
        {
          timestamp: Date,
          event: String,
          severity: String,
          sourceIP: String,
          details: String,
        },
      ],
      evidence: [
        {
          type: { type: String },
          description: String,
          value: String,
          significance: String,
        },
      ],
      recommendedActions: [
        {
          priority: { type: String, enum: ['immediate', 'short_term', 'long_term'] },
          action: String,
          rationale: String,
        },
      ],
      investigationFindings: { type: String },
      containmentStatus: { type: String },
    },

    // Analyst contributions
    analystNotes: { type: String },
    analystFindings: { type: String },

    // Metadata
    generatedBy: { type: String, default: 'llama-3.1-8b-instant' },
    processingTime: { type: Number },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    finalizedAt: { type: Date },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  { timestamps: true }
);

incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
