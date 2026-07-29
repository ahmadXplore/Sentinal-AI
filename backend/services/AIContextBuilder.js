/**
 * AI Context Builder — SentinelAI Performance Optimization
 *
 * Produces compact, structured summaries from Alerts / Logs / AISummaries
 * so the LLM receives only pre-aggregated intelligence instead of raw
 * log lines.  Every public method returns a plain string ≤ budget chars
 * ready to embed directly as the "CONTEXT" block in a system prompt.
 */
const Alert = require('../models/Alert');
const Log = require('../models/Log');
const AISummary = require('../models/AISummary');

// ── Budget constants (characters) ──────────────────────────────
const CHAT_CONTEXT_BUDGET = 800;   // ~230 tokens
const REPORT_CONTEXT_BUDGET = 1800; // ~515 tokens
const LOG_ANALYSIS_BUDGET = 1400;  // ~400 tokens

// ── Helpers ────────────────────────────────────────────────────

/**
 * Pick the top-N most frequent values from an array.
 */
function topN(arr, n = 5) {
  const freq = {};
  for (const v of arr) {
    if (v) freq[v] = (freq[v] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([val, count]) => ({ value: val, count }));
}

/**
 * Truncate a string to `max` characters, adding an ellipsis if trimmed.
 */
function trunc(str, max = 120) {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Build a compact context string for AI chat sessions.
 *
 * @param {'alert'|'log'} contextType
 * @param {string} contextId  — Mongo ObjectId string
 * @returns {Promise<string>} Plain-text context block (≤ CHAT_CONTEXT_BUDGET chars)
 */
async function buildChatContext(contextType, contextId) {
  if (contextType === 'alert') {
    const alert = await Alert.findById(contextId).lean();
    if (!alert) throw new Error('Alert not found');

    const aiSummary = await AISummary.findOne({ logId: alert.logId }).lean();

    const parts = [
      `Alert: ${alert.ruleName}`,
      `Severity: ${alert.severity} | Risk Score: ${alert.riskScore}/100 | Status: ${alert.status}`,
      `MITRE: ${alert.mitreAttack?.techniqueId || 'N/A'} – ${alert.mitreAttack?.techniqueName || 'N/A'}`,
    ];

    if (alert.affectedIPs?.length) {
      parts.push(`Source IPs: ${alert.affectedIPs.slice(0, 5).join(', ')}`);
    }
    if (alert.affectedUsers?.length) {
      parts.push(`Affected Users: ${alert.affectedUsers.slice(0, 5).join(', ')}`);
    }
    if (alert.description) {
      parts.push(`Description: ${trunc(alert.description, 200)}`);
    }

    // Aggregate matched-entry stats instead of raw lines
    const entries = alert.matchedEntries || [];
    if (entries.length > 0) {
      const sevCounts = {};
      const eventTypes = {};
      for (const e of entries) {
        if (e.severity) sevCounts[e.severity] = (sevCounts[e.severity] || 0) + 1;
        if (e.eventType) eventTypes[e.eventType] = (eventTypes[e.eventType] || 0) + 1;
      }
      parts.push(`Matched Events: ${entries.length} total | Severity: ${Object.entries(sevCounts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
      if (Object.keys(eventTypes).length > 0) {
        parts.push(`Event Types: ${Object.entries(eventTypes).map(([k, v]) => `${k}=${v}`).join(', ')}`);
      }
    }

    if (aiSummary?.summary) {
      parts.push(`AI Log Summary: ${trunc(aiSummary.summary, 200)}`);
    }

    return parts.join('\n').slice(0, CHAT_CONTEXT_BUDGET);
  }

  if (contextType === 'log') {
    const log = await Log.findById(contextId).lean();
    if (!log) throw new Error('Log not found');

    const aiSummary = await AISummary.findOne({ logId: contextId }).lean();

    const parts = [
      `Log File: ${log.originalName} | Format: ${log.format}`,
      `Total Entries: ${log.totalEntries}`,
      `Severity: critical=${log.severityCounts?.critical || 0} high=${log.severityCounts?.high || 0} medium=${log.severityCounts?.medium || 0} low=${log.severityCounts?.low || 0}`,
      `Unique Source IPs: ${log.metadata?.sourceIPs?.length || 0}`,
    ];

    // Top source IPs
    if (log.metadata?.sourceIPs?.length > 0) {
      parts.push(`Top IPs: ${log.metadata.sourceIPs.slice(0, 5).join(', ')}`);
    }

    if (aiSummary?.summary) {
      parts.push(`AI Summary: ${trunc(aiSummary.summary, 200)}`);
    }

    return parts.join('\n').slice(0, CHAT_CONTEXT_BUDGET);
  }

  throw new Error('Invalid context type');
}

/**
 * Build structured context for staged incident-report generation.
 *
 * @param {Object} alertDoc  — plain alert document (lean)
 * @param {Object|null} aiSummary — AISummary document (lean) or null
 * @param {string} analystNotes
 * @returns {string} Plain-text context block (≤ REPORT_CONTEXT_BUDGET chars)
 */
function buildReportContext(alertDoc, aiSummary, analystNotes = '') {
  const entries = alertDoc.matchedEntries || [];

  // Aggregate stats from matched entries
  const ipFreq = topN(entries.map(e => e.sourceIP).filter(Boolean), 5);
  const userFreq = topN(entries.map(e => e.user).filter(Boolean), 5);
  const eventTypeCounts = {};
  const sevCounts = {};
  for (const e of entries) {
    if (e.eventType) eventTypeCounts[e.eventType] = (eventTypeCounts[e.eventType] || 0) + 1;
    if (e.severity) sevCounts[e.severity] = (sevCounts[e.severity] || 0) + 1;
  }

  const parts = [
    `ALERT: ${alertDoc.ruleName}`,
    `SEVERITY: ${alertDoc.severity} | RISK SCORE: ${alertDoc.riskScore}/100 | STATUS: ${alertDoc.status}`,
    `MITRE: ${alertDoc.mitreAttack?.techniqueId || 'Unknown'} – ${alertDoc.mitreAttack?.techniqueName || 'Unknown'}`,
    `DESCRIPTION: ${trunc(alertDoc.description || 'No description', 250)}`,
    `MATCHED EVENTS: ${entries.length} total`,
    `SEVERITY BREAKDOWN: ${Object.entries(sevCounts).map(([k, v]) => `${k}=${v}`).join(' ')}`,
    `EVENT TYPES: ${Object.entries(eventTypeCounts).map(([k, v]) => `${k}=${v}`).join(', ') || 'N/A'}`,
    `TOP SOURCE IPs: ${ipFreq.map(i => `${i.value}(${i.count})`).join(', ') || 'None'}`,
    `AFFECTED USERS: ${userFreq.map(u => `${u.value}(${u.count})`).join(', ') || 'None'}`,
  ];

  if (aiSummary?.summary) {
    parts.push(`AI LOG ANALYSIS: ${trunc(aiSummary.summary, 250)}`);
  }
  if (analystNotes) {
    parts.push(`ANALYST NOTES: ${trunc(analystNotes, 200)}`);
  }

  // Include up to 3 critical/high sample entries as brief examples
  const topEntries = entries
    .filter(e => e.severity === 'critical' || e.severity === 'high')
    .slice(0, 3);
  if (topEntries.length > 0) {
    parts.push('KEY EVIDENCE (top 3):');
    for (const e of topEntries) {
      parts.push(`  [${(e.severity || '').toUpperCase()}] IP:${e.sourceIP || '-'} | ${trunc(e.message || e.rawLine || '', 100)}`);
    }
  }

  return parts.join('\n').slice(0, REPORT_CONTEXT_BUDGET);
}

/**
 * Build a statistical summary for log analysis — replaces raw-entry dumping.
 *
 * @param {Object} logDoc — full log document with parsedEntries
 * @returns {string} Plain-text summary (≤ LOG_ANALYSIS_BUDGET chars)
 */
function buildLogAnalysisContext(logDoc) {
  const entries = logDoc.parsedEntries || [];

  const ipFreq = topN(entries.map(e => e.sourceIP).filter(Boolean), 10);
  const eventTypeCounts = {};
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const userFreq = {};

  for (const e of entries) {
    if (e.severity) sevCounts[e.severity] = (sevCounts[e.severity] || 0) + 1;
    if (e.eventType) eventTypeCounts[e.eventType] = (eventTypeCounts[e.eventType] || 0) + 1;
    if (e.user) userFreq[e.user] = (userFreq[e.user] || 0) + 1;
  }

  const parts = [
    `TOTAL ENTRIES: ${entries.length}`,
    `SEVERITY: critical=${sevCounts.critical} high=${sevCounts.high} medium=${sevCounts.medium} low=${sevCounts.low} info=${sevCounts.info}`,
    `UNIQUE SOURCE IPs: ${ipFreq.length}`,
    `TOP SOURCE IPs: ${ipFreq.map(i => `${i.value}(${i.count})`).join(', ')}`,
    `EVENT TYPES: ${Object.entries(eventTypeCounts).map(([k, v]) => `${k}=${v}`).join(', ') || 'N/A'}`,
  ];

  const topUsers = Object.entries(userFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topUsers.length > 0) {
    parts.push(`TOP USERS: ${topUsers.map(([u, c]) => `${u}(${c})`).join(', ')}`);
  }

  // Include up to 5 critical entries as brief samples
  const criticalSamples = entries
    .filter(e => e.severity === 'critical' || e.severity === 'high')
    .slice(0, 5);
  if (criticalSamples.length > 0) {
    parts.push('HIGH-SEVERITY SAMPLES (top 5):');
    for (const e of criticalSamples) {
      parts.push(`  [${(e.severity || '').toUpperCase()}] IP:${e.sourceIP || '-'} | ${trunc(e.message || '', 80)}`);
    }
  }

  return parts.join('\n').slice(0, LOG_ANALYSIS_BUDGET);
}

module.exports = {
  buildChatContext,
  buildReportContext,
  buildLogAnalysisContext,
  CHAT_CONTEXT_BUDGET,
  REPORT_CONTEXT_BUDGET,
  LOG_ANALYSIS_BUDGET,
};
