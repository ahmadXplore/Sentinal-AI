/**
 * Log normalizer service.
 * Computes aggregate statistics from parsed entries.
 */

/**
 * Normalize parsed entries and compute metadata.
 * @param {Array} entries - Array of parsed log entries
 * @returns {{ entries, severityCounts, sourceIPs, dateRange, totalEntries }}
 */
function normalizeEntries(entries) {
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const sourceIPSet = new Set();
  let earliestDate = null;
  let latestDate = null;

  for (const entry of entries) {
    // Count severities
    if (severityCounts[entry.severity] !== undefined) {
      severityCounts[entry.severity]++;
    } else {
      severityCounts.info++;
    }

    // Collect unique source IPs
    if (entry.sourceIP) {
      sourceIPSet.add(entry.sourceIP);
    }

    // Track date range
    if (entry.timestamp) {
      const ts = new Date(entry.timestamp);
      if (!earliestDate || ts < earliestDate) earliestDate = ts;
      if (!latestDate || ts > latestDate) latestDate = ts;
    }
  }

  return {
    entries,
    severityCounts,
    sourceIPs: Array.from(sourceIPSet),
    dateRange: {
      start: earliestDate,
      end: latestDate,
    },
    totalEntries: entries.length,
  };
}

module.exports = { normalizeEntries };
