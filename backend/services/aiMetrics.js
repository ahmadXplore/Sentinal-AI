/**
 * AI Performance Metrics — SentinelAI Performance Optimization
 *
 * Tracks and logs every Ollama request:
 *   • Prompt size (chars + estimated tokens)
 *   • Response size (chars + estimated tokens)
 *   • Request duration (ms)
 *   • Cache hit/miss
 *   • Timeout events
 *
 * Provides aggregated stats via getStats().
 */

// ── Token estimator ────────────────────────────────────────────
// Rough heuristic: ~3.5 chars per token for English/code mixed text
const CHARS_PER_TOKEN = 3.5;

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ── Metrics store ──────────────────────────────────────────────
const MAX_HISTORY = 200; // keep last N request records

const _history = [];
const _counters = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  timeouts: 0,
  errors: 0,
};

/**
 * Log a single AI request.
 *
 * @param {Object} opts
 * @param {string} opts.type          — 'chat' | 'report_stage' | 'log_analysis' | 'mitre' | 'report'
 * @param {number} opts.promptChars   — total characters in the prompt (system + user)
 * @param {number} opts.responseChars — total characters in the response
 * @param {number} opts.durationMs    — wall-clock time for the request
 * @param {boolean} [opts.cached]     — true if served from cache
 * @param {boolean} [opts.timedOut]   — true if the request timed out
 * @param {boolean} [opts.error]      — true if the request errored
 * @param {string} [opts.model]       — model name
 * @param {Object} [opts.ollamaOpts]  — options sent to Ollama (num_ctx, num_predict, etc.)
 */
function logRequest(opts) {
  const record = {
    timestamp: new Date().toISOString(),
    type: opts.type || 'unknown',
    promptChars: opts.promptChars || 0,
    promptTokens: estimateTokens({ length: opts.promptChars || 0 }),
    responseChars: opts.responseChars || 0,
    responseTokens: estimateTokens({ length: opts.responseChars || 0 }),
    durationMs: opts.durationMs || 0,
    cached: !!opts.cached,
    timedOut: !!opts.timedOut,
    error: !!opts.error,
    model: opts.model || '',
  };

  // Fix token estimation — estimateTokens expects a string, use char count directly
  record.promptTokens = Math.ceil((opts.promptChars || 0) / CHARS_PER_TOKEN);
  record.responseTokens = Math.ceil((opts.responseChars || 0) / CHARS_PER_TOKEN);

  _counters.totalRequests++;
  if (opts.cached) _counters.cacheHits++;
  else _counters.cacheMisses++;
  if (opts.timedOut) _counters.timeouts++;
  if (opts.error) _counters.errors++;

  // Push to history (ring buffer)
  if (_history.length >= MAX_HISTORY) _history.shift();
  _history.push(record);

  // Console log for observability
  const emoji = opts.cached ? '⚡' : opts.error ? '❌' : '🤖';
  const durationStr = opts.cached ? '<1ms (cached)' : `${opts.durationMs}ms`;
  console.log(
    `${emoji} [AI:${record.type}] prompt=${record.promptChars}ch (~${record.promptTokens}tok) → response=${record.responseChars}ch (~${record.responseTokens}tok) | ${durationStr}` +
    (opts.timedOut ? ' [TIMEOUT]' : '') +
    (opts.error ? ' [ERROR]' : '')
  );

  return record;
}

/**
 * Get aggregated performance statistics.
 */
function getStats() {
  const nonCached = _history.filter(r => !r.cached && !r.error && !r.timedOut);

  const avgDuration = nonCached.length > 0
    ? Math.round(nonCached.reduce((s, r) => s + r.durationMs, 0) / nonCached.length)
    : 0;

  const p95Duration = (() => {
    if (nonCached.length === 0) return 0;
    const sorted = nonCached.map(r => r.durationMs).sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)];
  })();

  const avgPromptTokens = nonCached.length > 0
    ? Math.round(nonCached.reduce((s, r) => s + r.promptTokens, 0) / nonCached.length)
    : 0;

  // Per-type breakdown
  const byType = {};
  for (const r of _history) {
    if (!byType[r.type]) {
      byType[r.type] = { count: 0, totalDuration: 0, totalPromptChars: 0, cached: 0 };
    }
    byType[r.type].count++;
    byType[r.type].totalDuration += r.durationMs;
    byType[r.type].totalPromptChars += r.promptChars;
    if (r.cached) byType[r.type].cached++;
  }

  for (const type of Object.keys(byType)) {
    const t = byType[type];
    const nonCachedCount = t.count - t.cached;
    t.avgDurationMs = nonCachedCount > 0 ? Math.round(t.totalDuration / nonCachedCount) : 0;
    t.avgPromptChars = t.count > 0 ? Math.round(t.totalPromptChars / t.count) : 0;
    delete t.totalDuration;
    delete t.totalPromptChars;
  }

  return {
    summary: {
      totalRequests: _counters.totalRequests,
      cacheHits: _counters.cacheHits,
      cacheMisses: _counters.cacheMisses,
      cacheHitRate: _counters.totalRequests > 0
        ? ((_counters.cacheHits / _counters.totalRequests) * 100).toFixed(1) + '%'
        : 'N/A',
      timeouts: _counters.timeouts,
      errors: _counters.errors,
      avgDurationMs: avgDuration,
      p95DurationMs: p95Duration,
      avgPromptTokens,
    },
    byType,
    recentRequests: _history.slice(-10),
  };
}

module.exports = {
  estimateTokens,
  logRequest,
  getStats,
  CHARS_PER_TOKEN,
};
