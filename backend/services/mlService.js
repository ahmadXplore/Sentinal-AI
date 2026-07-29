const axios = require('axios');

const ML_TIMEOUT = 10000; // 10 seconds

class MLService {
  constructor() {
    this.mlEndpoint = process.env.ML_ENGINE_URL || 'http://localhost:5001';
  }

  /**
   * Send an array of log objects to the Python ML engine.
   * Returns per-log: { is_anomaly, risk_score, threat_level, model_scores }
   */
  async detectAnomalies(logs) {
    if (!logs || logs.length === 0) return [];
    try {
      const response = await axios.post(
        `${this.mlEndpoint}/predict/anomaly`,
        { logs },
        { timeout: ML_TIMEOUT }
      );
      return response.data.results;
    } catch (error) {
      console.error('[ML Service] detectAnomalies error:', error.message);
      // Graceful fallback — never crash the Node server
      return logs.map(() => ({
        is_anomaly: false,
        risk_score: 0,
        threat_level: 'low',
        model_scores: { isolation_forest: null, random_forest: null, xgboost: null }
      }));
    }
  }

  /**
   * Classify a single log record for detailed threat scoring.
   * Returns: { is_threat, confidence, risk_score, rf_confidence, xgb_confidence }
   */
  async classifyThreat(log) {
    try {
      const response = await axios.post(
        `${this.mlEndpoint}/predict/classify`,
        log,
        { timeout: ML_TIMEOUT }
      );
      return response.data;
    } catch (error) {
      console.error('[ML Service] classifyThreat error:', error.message);
      return { is_threat: false, confidence: 0, risk_score: 0 };
    }
  }

  /**
   * Check the health of the ML engine.
   */
  async health() {
    try {
      const response = await axios.get(`${this.mlEndpoint}/health`, { timeout: 3000 });
      return response.data;
    } catch {
      return { status: 'unreachable', models_loaded: [] };
    }
  }
}

module.exports = new MLService();
