const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const User = require('../models/User');
const AISummary = require('../models/AISummary');
const { generateIncidentReport, explainMitreTechnique } = require('../services/groqService');
const { buildReportContext } = require('../services/AIContextBuilder');
const aiCache = require('../services/aiCache');
const metrics = require('../services/aiMetrics');

/**
 * @desc  Generate an AI incident report for an alert (staged generation)
 * @route POST /api/incidents/generate/:alertId
 */
exports.generateReport = async (req, res) => {
  const { alertId } = req.params;
  const { analystNotes } = req.body;

  const alert = await Alert.findById(alertId).lean();
  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }

  // Check for existing report — allow regeneration if requested
  const existing = await Incident.findOne({ alertId });
  if (existing && !req.query.regenerate) {
    return res.json({
      success: true,
      message: 'Incident report already exists. Use ?regenerate=true to regenerate.',
      data: { incident: existing },
    });
  }

  // Get existing AI summary if available
  const aiSummary = await AISummary.findOne({ logId: alert.logId }).lean();

  // Build compact report context via AIContextBuilder
  const reportContext = buildReportContext(alert, aiSummary, analystNotes || '');

  const startTime = Date.now();
  let reportData;
  try {
    // Staged generation: 5 small Ollama calls instead of 1 massive one
    reportData = await generateIncidentReport(reportContext);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Report generation failed: ${error.message}`,
    });
  }

  const processingTime = Date.now() - startTime;

  // Build timeline from matchedEntries if AI didn't provide one
  const timeline =
    reportData.timeline?.length > 0
      ? reportData.timeline
      : (alert.matchedEntries || []).slice(0, 20).map((e) => ({
          timestamp: e.timestamp,
          event: e.message || e.rawLine || 'Log event',
          severity: e.severity,
          sourceIP: e.sourceIP,
          details: e.eventType || '',
        }));

  // Build evidence from affectedIPs if not provided
  const evidence =
    reportData.evidence?.length > 0
      ? reportData.evidence
      : (alert.affectedIPs || []).map((ip) => ({
          type: 'IP Address',
          description: 'Affected source IP',
          value: ip,
          significance: 'Observed in matched alert events',
        }));

  const incidentData = {
    alertId,
    title: `Incident Report: ${alert.ruleName}`,
    status: 'draft',
    report: {
      ...reportData,
      timeline,
      evidence,
    },
    analystNotes: analystNotes || '',
    generatedBy: reportData.model || 'qwen2.5:3b',
    processingTime,
    createdBy: req.user._id,
  };

  let incident;
  if (existing) {
    Object.assign(existing, incidentData);
    await existing.save();
    incident = existing;
  } else {
    incident = await Incident.create(incidentData);
  }


  res.json({
    success: true,
    message: 'Incident report generated successfully',
    data: { incident },
  });
};

/**
 * @desc  Get incident report for an alert
 * @route GET /api/incidents/:alertId
 */
exports.getReport = async (req, res) => {
  const incident = await Incident.findOne({ alertId: req.params.alertId })
    .populate('createdBy', 'username email')
    .populate('assignedTo', 'username email')
    .lean();

  if (!incident) {
    return res.status(404).json({ success: false, message: 'No incident report found for this alert' });
  }

  res.json({ success: true, data: { incident } });
};

/**
 * @desc  Update incident report (analyst edits)
 * @route PUT /api/incidents/:id
 */
exports.updateReport = async (req, res) => {
  const { analystNotes, analystFindings, status } = req.body;

  const incident = await Incident.findById(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, message: 'Incident report not found' });
  }

  if (analystNotes !== undefined) incident.analystNotes = analystNotes;
  if (analystFindings !== undefined) incident.analystFindings = analystFindings;
  if (status) {
    incident.status = status;
    if (status === 'finalized') {
      incident.finalizedBy = req.user._id;
      incident.finalizedAt = new Date();
    }
  }

  await incident.save();


  res.json({ success: true, message: 'Incident report updated', data: { incident } });
};

/**
 * @desc  List all incident reports
 * @route GET /api/incidents
 */
exports.listReports = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;

  const [incidents, total] = await Promise.all([
    Incident.find(filter)
      .populate('alertId', 'ruleName severity riskScore status mitreAttack')
      .populate('createdBy', 'username')
      .populate('assignedTo', 'username email')
      .select('-report.timeline -report.evidence') // exclude heavy fields from list
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Incident.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      incidents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
};

/**
 * @desc  Explain a MITRE ATT&CK technique via AI (with caching)
 * @route GET /api/incidents/mitre/:techniqueId
 */
exports.explainMitre = async (req, res) => {
  const { techniqueId } = req.params;
  const { techniqueName } = req.query;

  if (!techniqueId) {
    return res.status(400).json({ success: false, message: 'techniqueId is required' });
  }

  // Check cache first
  const cacheKey = `mitre:${techniqueId}`;
  const cached = aiCache.get(cacheKey);
  if (cached) {
    metrics.logRequest({
      type: 'mitre',
      promptChars: 0,
      responseChars: JSON.stringify(cached).length,
      durationMs: 0,
      cached: true,
    });
    return res.json({ success: true, data: { explanation: cached, cached: true } });
  }

  try {
    const explanation = await explainMitreTechnique(techniqueId, techniqueName || techniqueId);

    // Cache the result (24h TTL)
    if (!explanation.error) {
      aiCache.set(cacheKey, explanation);
    }

    res.json({ success: true, data: { explanation } });
  } catch (error) {
    res.status(500).json({ success: false, message: `MITRE explanation failed: ${error.message}` });
  }
};

/**
 * @desc  Assign incident to analyst (admin only)
 * @route PUT /api/incidents/:id/assign
 */
exports.assignIncident = async (req, res) => {
  const { userId } = req.body;
  const incident = await Incident.findById(req.params.id);

  if (!incident) {
    return res.status(404).json({ success: false, message: 'Incident report not found' });
  }

  incident.assignedTo = userId || null;

  // Add audit info via analystNotes append
  let assignMsg = 'Incident unassigned';
  if (userId) {
    const assignee = await User.findById(userId).select('username');
    if (assignee) {
      assignMsg = `Incident assigned to ${assignee.username}`;
    }
  }

  // Append to analystNotes for audit trail
  const timestamp = new Date().toISOString();
  const noteEntry = `[${timestamp}] ${assignMsg} (by ${req.user.username})`;
  incident.analystNotes = incident.analystNotes
    ? `${incident.analystNotes}\n${noteEntry}`
    : noteEntry;

  await incident.save();

  const populated = await Incident.findById(incident._id)
    .populate('assignedTo', 'username email')
    .populate('createdBy', 'username');

  res.json({
    success: true,
    message: assignMsg,
    data: { incident: populated },
  });
};

/**
 * @desc  Delete an incident report
 * @route DELETE /api/incidents/:id
 */
exports.deleteReport = async (req, res) => {
  await Incident.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Incident report deleted' });
};
