const mlService = require('../services/mlService');

/**
 * GET /api/ml/health
 * Returns health status of the Python ML engine
 */
exports.getHealth = async (req, res) => {
  try {
    const health = await mlService.health();
    res.json({ success: true, data: health });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/ml/analyze
 * Body: { logs: [ { duration, protocol_type, service, flag, bytes_in, bytes_out, ... } ] }
 * Runs anomaly detection on the supplied log array
 */
exports.analyzeAnomaly = async (req, res) => {
  try {
    const { logs } = req.body;
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide a non-empty logs array.' });
    }
    const results = await mlService.detectAnomalies(logs);
    res.json({ success: true, data: { results, total: results.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/ml/classify
 * Body: single log object
 * Returns detailed threat classification from RF + XGBoost
 */
exports.classifyThreat = async (req, res) => {
  try {
    const log = req.body;
    if (!log || Object.keys(log).length === 0) {
      return res.status(400).json({ success: false, message: 'Provide a log object.' });
    }
    const result = await mlService.classifyThreat(log);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

