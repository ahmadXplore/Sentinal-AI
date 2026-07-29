/**
 * AI Response Cache — SentinelAI Performance Optimization
 *
 * In-memory LRU-style cache with per-entry TTL.
 * Designed for drop-in Redis replacement later.
 *
 * Cache categories & default TTLs:
 *   mitre:{techniqueId}         — 24 hours
 *   chat:{contextId}:{hash}     — 1 hour
 *   report:{alertId}:{stage}    — 4 hours
 *   logsummary:{logId}          — 2 hours
 */

const crypto = require('crypto');

// Default TTLs in milliseconds
const DEFAULT_TTLS = {
  mitre: 24 * 60 * 60 * 1000,       // 24 hours
  chat: 60 * 60 * 1000,             // 1 hour
  report: 4 * 60 * 60 * 1000,       // 4 hours
  logsummary: 2 * 60 * 60 * 1000,   // 2 hours
  default: 60 * 60 * 1000,          // 1 hour fallback
};

const MAX_ENTRIES = 500;

class AICache {
  constructor() {
    /** @type {Map<string, {value: any, expiresAt: number}>} */
    this._store = new Map();
    this._hits = 0;
    this._misses = 0;

    // Periodic cleanup every 5 minutes
    this._cleanupTimer = setInterval(() => this._evictExpired(), 5 * 60 * 1000);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
  }

  /**
   * Get a cached value. Returns `undefined` on miss or expiry.
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) {
      this._misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      this._misses++;
      return undefined;
    }
    this._hits++;
    return entry.value;
  }

  /**
   * Store a value with an explicit TTL (ms) or infer from key prefix.
   */
  set(key, value, ttlMs) {
    // Infer TTL from key prefix if not provided
    if (!ttlMs) {
      const prefix = key.split(':')[0];
      ttlMs = DEFAULT_TTLS[prefix] || DEFAULT_TTLS.default;
    }

    // Evict oldest entry if at capacity
    if (this._store.size >= MAX_ENTRIES) {
      const oldest = this._store.keys().next().value;
      this._store.delete(oldest);
    }

    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a specific key.
   */
  del(key) {
    return this._store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   * Example: invalidate('report:abc123') removes report:abc123:stage1, report:abc123:stage2, etc.
   */
  invalidate(prefix) {
    let count = 0;
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) {
        this._store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear() {
    this._store.clear();
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Generate a short hash for use in cache keys.
   */
  static hash(input) {
    return crypto.createHash('md5').update(input).digest('hex').slice(0, 12);
  }

  /**
   * Return cache statistics.
   */
  getStats() {
    const total = this._hits + this._misses;
    return {
      entries: this._store.size,
      maxEntries: MAX_ENTRIES,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? ((this._hits / total) * 100).toFixed(1) + '%' : 'N/A',
    };
  }

  /** @private */
  _evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now > entry.expiresAt) {
        this._store.delete(key);
      }
    }
  }

  /** Clean up timer on process exit. */
  destroy() {
    clearInterval(this._cleanupTimer);
  }
}

// Singleton instance
const aiCache = new AICache();

module.exports = aiCache;
