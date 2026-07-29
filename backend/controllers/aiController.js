const Log = require('../models/Log');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const AISummary = require('../models/AISummary');
const { analyzeLogs, checkHealth, explainDecision } = require('../services/groqService');
const { buildReportContext } = require('../services/AIContextBuilder');
const metrics = require('../services/aiMetrics');
const aiCache = require('../services/aiCache');

/**
 * @desc    Generate AI summary for a log
 * @route   POST /api/ai/summarize/:logId
 */
exports.summarizeLog = async (req, res) => {
  const { logId } = req.params;

  // Find the log
  const log = await Log.findById(logId);
  if (!log) {
    return res.status(404).json({
      success: false,
      message: 'Log not found',
    });
  }

  // Check if summary already exists
  const existingSummary = await AISummary.findOne({ logId, status: 'completed' });
  if (existingSummary && !req.query.regenerate) {
    return res.json({
      success: true,
      message: 'AI summary already exists. Use ?regenerate=true to regenerate.',
      data: { summary: existingSummary },
    });
  }

  // Create or update summary with pending status
  let aiSummary;
  if (existingSummary) {
    existingSummary.status = 'pending';
    await existingSummary.save();
    aiSummary = existingSummary;
  } else {
    aiSummary = await AISummary.create({
      logId,
      summary: 'Analyzing...',
      status: 'pending',
    });
  }

  // Update log reference
  log.aiSummary = aiSummary._id;
  await log.save();

  try {
    // Run AI analysis — now uses AIContextBuilder internally for compact context
    const analysis = await analyzeLogs(log);

    // Update the summary with results
    aiSummary.summary = analysis.summary || 'Analysis completed.';
    aiSummary.highlights = analysis.highlights || [];
    aiSummary.suspiciousActivities = analysis.suspiciousActivities || [];
    aiSummary.notableEvents = analysis.notableEvents || [];
    aiSummary.recommendations = analysis.recommendations || [];
    aiSummary.riskScore = analysis.riskScore || 0;
    aiSummary.model = analysis.model;
    aiSummary.processingTime = analysis.processingTime;
    aiSummary.status = 'completed';
    aiSummary.error = null;

    await aiSummary.save();

    res.json({
      success: true,
      message: 'AI analysis completed successfully',
      data: { summary: aiSummary },
    });
  } catch (error) {
    // Update summary with error
    aiSummary.status = 'error';
    aiSummary.error = error.message;
    await aiSummary.save();

    res.status(500).json({
      success: false,
      message: `AI analysis failed: ${error.message}`,
      data: { summary: aiSummary },
    });
  }
};

/**
 * @desc    Get AI summary for a log
 * @route   GET /api/ai/summary/:logId
 */
exports.getSummary = async (req, res) => {
  const summary = await AISummary.findOne({ logId: req.params.logId });

  if (!summary) {
    return res.status(404).json({
      success: false,
      message: 'No AI summary found for this log',
    });
  }

  res.json({
    success: true,
    data: { summary },
  });
};

/**
 * @desc    Check AI API health
 * @route   GET /api/ai/health
 */
exports.getHealth = async (req, res) => {
  const health = await checkHealth();

  res.json({
    success: true,
    data: health,
  });
};

/**
 * @desc    Get AI performance metrics
 * @route   GET /api/ai/metrics
 */
exports.getMetrics = async (req, res) => {
  const stats = metrics.getStats();
  const cacheStats = aiCache.getStats();

  res.json({
    success: true,
    data: {
      ai: stats,
      cache: cacheStats,
    },
  });
};

/**
 * @desc    Get AI explainability analysis for an alert
 * @route   GET /api/ai/explain/:alertId
 */
exports.getExplainability = async (req, res) => {
  const { alertId } = req.params;

  const alert = await Alert.findById(alertId).lean();
  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }

  // Get incident analystNotes if exists
  const incident = await Incident.findOne({ alertId }).lean();
  const analystNotes = incident?.analystNotes || '';

  // Get log summary if exists
  const aiSummary = await AISummary.findOne({ logId: alert.logId }).lean();

  const contextSummary = buildReportContext(alert, aiSummary, analystNotes);

  const cacheKey = `explain:${alertId}`;
  let explanation = aiCache.get(cacheKey);

  if (!explanation) {
    explanation = await explainDecision(contextSummary);
    if (!explanation.error) {
      aiCache.set(cacheKey, explanation, 4 * 60 * 60 * 1000); // 4 hour cache
    }
  }

  res.json({
    success: true,
    data: {
      explanation,
      contextSummary,
      rawPromptTemplate: `You are a Principal Security Architect specializing in Explainable AI (XAI) for cybersecurity. ...`,
      model: explanation.model || 'llama-3.1-8b-instant',
    },
  });
};
