/**
 * Multi-format log parser.
 * Detects log format and parses entries into a normalized structure.
 */

// ─── Format Detection ─────────────────────────────────────
const SYSLOG_REGEX = /^(<\d{1,3}>)?(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s*(.*)$/;
const APACHE_REGEX = /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d{3})\s+(\d+|-)\s*("([^"]*)")?\s*("([^"]*)")?$/;
const NGINX_REGEX = /^(\S+)\s+-\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d{3})\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"$/;

/**
 * Detect the format of a log file based on content analysis.
 */
function detectFormat(content) {
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return 'unknown';

  // Try JSON
  try {
    const firstLine = lines[0].trim();
    if (firstLine.startsWith('{') || firstLine.startsWith('[')) {
      JSON.parse(firstLine.startsWith('[') ? firstLine : `[${lines.join(',')}]`);
      return 'json';
    }
  } catch (e) {
    // Not JSON
  }

  // Try CSV (check for comma-separated header)
  if (lines[0].includes(',') && lines.length > 1) {
    const headerFields = lines[0].split(',').length;
    const dataFields = lines[1].split(',').length;
    if (headerFields > 2 && headerFields === dataFields) {
      return 'csv';
    }
  }

  // Sample first 10 lines for pattern matching
  const sampleLines = lines.slice(0, 10);

  // Syslog
  const syslogMatches = sampleLines.filter((l) => SYSLOG_REGEX.test(l)).length;
  if (syslogMatches > sampleLines.length * 0.5) return 'syslog';

  // Apache
  const apacheMatches = sampleLines.filter((l) => APACHE_REGEX.test(l)).length;
  if (apacheMatches > sampleLines.length * 0.5) return 'apache';

  // Nginx
  const nginxMatches = sampleLines.filter((l) => NGINX_REGEX.test(l)).length;
  if (nginxMatches > sampleLines.length * 0.5) return 'nginx';

  // Windows Event Log (XML-based or JSON export)
  if (content.includes('<Event xmlns') || content.includes('EventID')) {
    return 'windows_event';
  }

  return 'unknown';
}

// ─── Parsers ──────────────────────────────────────────────

function parseSyslog(content) {
  const lines = content.split('\n').filter((l) => l.trim());
  const entries = [];

  for (const line of lines) {
    const match = line.match(SYSLOG_REGEX);
    if (match) {
      const [, priority, timestamp, hostname, process, pid, message] = match;
      const severity = classifySeverity(message, priority);

      entries.push({
        timestamp: parseSyslogTimestamp(timestamp),
        severity,
        sourceIP: extractIP(line) || hostname,
        message: message.trim(),
        eventType: classifyEvent(message),
        user: extractUser(message),
        rawLine: line,
      });
    } else {
      entries.push({
        timestamp: new Date(),
        severity: 'info',
        message: line.trim(),
        eventType: 'unknown',
        rawLine: line,
      });
    }
  }

  return entries;
}

function parseApache(content) {
  const lines = content.split('\n').filter((l) => l.trim());
  const entries = [];

  for (const line of lines) {
    const match = line.match(APACHE_REGEX);
    if (match) {
      const [, ip, , user, timestamp, request, statusCode, bytes] = match;
      const status = parseInt(statusCode, 10);

      let severity = 'info';
      if (status >= 500) severity = 'high';
      else if (status >= 400) severity = 'medium';
      else if (status >= 300) severity = 'low';

      entries.push({
        timestamp: parseApacheTimestamp(timestamp),
        severity,
        sourceIP: ip,
        message: `${request} → ${statusCode} (${bytes} bytes)`,
        eventType: classifyHTTPEvent(request, status),
        user: user !== '-' ? user : undefined,
        port: 80,
        protocol: 'HTTP',
        rawLine: line,
      });
    }
  }

  return entries;
}

function parseNginx(content) {
  const lines = content.split('\n').filter((l) => l.trim());
  const entries = [];

  for (const line of lines) {
    const match = line.match(NGINX_REGEX);
    if (match) {
      const [, ip, user, timestamp, request, statusCode, bytes] = match;
      const status = parseInt(statusCode, 10);

      let severity = 'info';
      if (status >= 500) severity = 'high';
      else if (status >= 400) severity = 'medium';

      entries.push({
        timestamp: parseApacheTimestamp(timestamp),
        severity,
        sourceIP: ip,
        message: `${request} → ${statusCode} (${bytes} bytes)`,
        eventType: classifyHTTPEvent(request, status),
        user: user !== '-' ? user : undefined,
        protocol: 'HTTP',
        rawLine: line,
      });
    }
  }

  return entries;
}

function parseJSON(content) {
  const entries = [];

  try {
    const lines = content.split('\n').filter((l) => l.trim());
    for (const line of lines) {
      try {
        const obj = JSON.parse(line.trim());
        entries.push({
          timestamp: obj.timestamp || obj.time || obj.date ? new Date(obj.timestamp || obj.time || obj.date) : new Date(),
          severity: normalizeSeverity(obj.severity || obj.level || obj.priority || 'info'),
          sourceIP: obj.source_ip || obj.src_ip || obj.sourceIP || obj.ip || extractIP(JSON.stringify(obj)),
          destinationIP: obj.dest_ip || obj.dst_ip || obj.destinationIP,
          message: obj.message || obj.msg || obj.description || JSON.stringify(obj),
          eventType: obj.event_type || obj.type || obj.action || 'unknown',
          user: obj.user || obj.username || obj.account,
          protocol: obj.protocol || obj.proto,
          port: obj.port || obj.dest_port,
          rawLine: line,
        });
      } catch (e) {
        // Skip malformed JSON lines
      }
    }
  } catch (e) {
    // Try as array
    try {
      const arr = JSON.parse(content);
      if (Array.isArray(arr)) {
        for (const obj of arr) {
          entries.push({
            timestamp: obj.timestamp ? new Date(obj.timestamp) : new Date(),
            severity: normalizeSeverity(obj.severity || obj.level || 'info'),
            sourceIP: obj.source_ip || obj.sourceIP || extractIP(JSON.stringify(obj)),
            message: obj.message || obj.msg || JSON.stringify(obj),
            eventType: obj.event_type || obj.type || 'unknown',
            rawLine: JSON.stringify(obj),
          });
        }
      }
    } catch (e2) {
      // Not valid JSON at all
    }
  }

  return entries;
}

function parseCSV(content) {
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Detect whether the first line is a header or a data row.
  // A header row won't contain an IP address or an ISO-8601 timestamp.
  const firstValues = parseCSVLine(lines[0]);
  const firstLineHasIP = firstValues.some((v) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v.trim()));
  const firstLineHasISODate = firstValues.some((v) => /^\d{4}-\d{2}-\d{2}T/.test(v.trim()));
  const hasHeader = !firstLineHasIP && !firstLineHasISODate;

  let headers = null;
  let dataStart = 0;

  if (hasHeader) {
    headers = firstValues.map((h) => h.trim().toLowerCase().replace(/['\"/]/g, ''));
    dataStart = 1;
  }

  const entries = [];

  for (let i = dataStart; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    if (headers && values.length === headers.length) {
      // ── Header-based mapping ──
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = values[idx]; });

      entries.push({
        timestamp: findTimestamp(obj),
        severity: normalizeSeverity(obj.severity || obj.level || obj.priority || 'info'),
        sourceIP: obj.source_ip || obj.src_ip || obj.sourceip || obj.ip || extractIP(lines[i]),
        destinationIP: obj.dest_ip || obj.dst_ip || obj.destip,
        message: obj.message || obj.msg || obj.description || obj.event || lines[i],
        eventType: obj.event_type || obj.type || obj.action || classifyEvent(lines[i]),
        user: obj.user || obj.username,
        protocol: obj.protocol,
        port: obj.port ? parseInt(obj.port, 10) : undefined,
        rawLine: lines[i],
      });
    } else {
      // ── Headerless / positional mapping ──
      // Try to intelligently map each column by content pattern
      let timestamp = new Date();
      let sourceIP = null;
      let severity = 'info';
      let eventType = 'unknown';
      let user = null;
      const unmapped = [];

      for (const val of values) {
        const v = val.trim();
        if (!v) continue;

        if (/^\d{4}-\d{2}-\d{2}T/.test(v) || /^\d{4}-\d{2}-\d{2}\s/.test(v)) {
          // ISO timestamp
          const d = new Date(v);
          if (!isNaN(d.getTime())) timestamp = d;
        } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) {
          // IP address — first one is source
          if (!sourceIP) sourceIP = v;
        } else if (['critical','high','medium','low','info','warning','error','notice','emergency'].includes(v.toLowerCase())) {
          severity = normalizeSeverity(v);
        } else if (/^(LOGIN_|LOGOUT|PORT_SCAN|FILE_ACCESS|BRUTE_FORCE|AUTH_|INTRUSION|MALWARE|SSH_|FIREWALL)/i.test(v)) {
          eventType = v;
        } else {
          unmapped.push(v);
        }
      }

      // First unmapped token is likely the username
      if (unmapped.length > 0) user = unmapped.shift();

      entries.push({
        timestamp,
        severity,
        sourceIP,
        message: unmapped.length > 0 ? `${eventType} — ${unmapped.join(', ')}` : `${eventType}`,
        eventType: classifyEvent(eventType),
        user,
        rawLine: lines[i],
      });
    }
  }

  return entries;
}

function parseWindowsEvent(content) {
  const entries = [];

  // Try JSON format first
  try {
    const events = JSON.parse(content);
    const eventArray = Array.isArray(events) ? events : [events];

    for (const event of eventArray) {
      const eventId = event.EventID || event.Id;
      entries.push({
        timestamp: event.TimeCreated ? new Date(event.TimeCreated) : new Date(),
        severity: windowsEventSeverity(event.Level || event.LevelDisplayName, eventId),
        sourceIP: extractIP(JSON.stringify(event)),
        message: `EventID ${eventId}: ${event.Message || event.TaskDisplayName || 'Windows Event'}`,
        eventType: event.TaskDisplayName || event.LogName || 'windows_event',
        user: event.UserId || event.UserName,
        rawLine: JSON.stringify(event),
      });
    }
  } catch (e) {
    // Fallback: treat as text
    const lines = content.split('\n').filter((l) => l.trim());
    for (const line of lines) {
      entries.push({
        timestamp: new Date(),
        severity: 'info',
        message: line.trim(),
        eventType: 'windows_event',
        rawLine: line,
      });
    }
  }

  return entries;
}

// ─── Helpers ──────────────────────────────────────────────

function extractIP(text) {
  const match = text.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
  return match ? match[1] : null;
}

function extractUser(message) {
  const patterns = [
    /user[=:\s]+(\S+)/i,
    /for\s+(\S+)\s+from/i,
    /account\s+(\S+)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseSyslogTimestamp(timestamp) {
  const currentYear = new Date().getFullYear();
  const dateStr = `${timestamp} ${currentYear}`;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseApacheTimestamp(timestamp) {
  // Format: 10/Oct/2000:13:55:36 -0700
  const cleaned = timestamp.replace(':', ' ');
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function findTimestamp(obj) {
  const keys = ['timestamp', 'time', 'date', 'datetime', 'created', 'logged'];
  for (const key of keys) {
    if (obj[key]) {
      const parsed = new Date(obj[key]);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  return new Date();
}

function normalizeSeverity(level) {
  const l = String(level).toLowerCase();
  if (['critical', 'fatal', 'emergency', 'emerg', '0', '1'].includes(l)) return 'critical';
  if (['high', 'error', 'err', 'alert', '2', '3'].includes(l)) return 'high';
  if (['medium', 'warning', 'warn', '4'].includes(l)) return 'medium';
  if (['low', 'notice', '5'].includes(l)) return 'low';
  return 'info';
}

function classifySeverity(message, priority) {
  const msg = message.toLowerCase();

  // Critical indicators
  if (/failed.*password|authentication.*fail|brute.?force|unauthorized|intrusion|exploit|malware|rootkit/i.test(msg)) {
    return 'high';
  }
  if (/critical|emergency|fatal|panic/i.test(msg)) return 'critical';
  if (/error|denied|refused|reject|attack|violation/i.test(msg)) return 'high';
  if (/warning|warn|suspicious|unusual|invalid/i.test(msg)) return 'medium';
  if (/notice|accepted|success/i.test(msg)) return 'low';

  // Use syslog priority if available
  if (priority) {
    const p = parseInt(priority.replace(/[<>]/g, ''), 10);
    const severity = p % 8;
    if (severity <= 1) return 'critical';
    if (severity <= 3) return 'high';
    if (severity <= 4) return 'medium';
    if (severity <= 5) return 'low';
  }

  return 'info';
}

function classifyEvent(message) {
  const msg = message.toLowerCase();
  if (/login|logon|auth|password|session/i.test(msg)) return 'authentication';
  if (/firewall|iptables|blocked|denied|drop/i.test(msg)) return 'firewall';
  if (/ssh|sshd/i.test(msg)) return 'ssh';
  if (/sudo|su:/i.test(msg)) return 'privilege_escalation';
  if (/kernel|system/i.test(msg)) return 'system';
  if (/cron|scheduled/i.test(msg)) return 'scheduled_task';
  if (/dns|resolve/i.test(msg)) return 'dns';
  if (/http|web|apache|nginx/i.test(msg)) return 'web';
  return 'other';
}

function classifyHTTPEvent(request, statusCode) {
  if (statusCode === 401 || statusCode === 403) return 'access_denied';
  if (statusCode >= 500) return 'server_error';
  if (statusCode === 404) return 'not_found';
  if (/\.(php|asp|jsp|cgi)/.test(request)) return 'dynamic_request';
  if (/admin|login|passwd|config|\.env/i.test(request)) return 'sensitive_path';
  if (/\.\.|\/etc\/|cmd=|exec|union.*select/i.test(request)) return 'attack_attempt';
  return 'web_request';
}

function windowsEventSeverity(level, eventId) {
  const l = String(level).toLowerCase();
  if (l === 'critical' || l === '1') return 'critical';
  if (l === 'error' || l === '2') return 'high';
  if (l === 'warning' || l === '3') return 'medium';

  // Known security event IDs
  const criticalEvents = [4625, 4648, 4719, 4765, 4766, 4794, 4897];
  const highEvents = [4624, 4634, 4672, 4720, 4722, 4732, 4756];
  if (criticalEvents.includes(eventId)) return 'high';
  if (highEvents.includes(eventId)) return 'medium';

  return 'info';
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Main Parse Function ──────────────────────────────────

/**
 * Parse log content into structured entries.
 * @param {string} content - Raw log content
 * @param {string} [formatHint] - Optional format hint
 * @returns {{ format: string, entries: Array }}
 */
function parseLog(content, formatHint) {
  const format = formatHint || detectFormat(content);
  let entries = [];

  switch (format) {
    case 'syslog':
      entries = parseSyslog(content);
      break;
    case 'apache':
      entries = parseApache(content);
      break;
    case 'nginx':
      entries = parseNginx(content);
      break;
    case 'json':
      entries = parseJSON(content);
      break;
    case 'csv':
      entries = parseCSV(content);
      break;
    case 'windows_event':
      entries = parseWindowsEvent(content);
      break;
    default:
      // Fallback: treat each line as a log entry
      entries = content
        .split('\n')
        .filter((l) => l.trim())
        .map((line) => ({
          timestamp: new Date(),
          severity: classifySeverity(line, null),
          sourceIP: extractIP(line),
          message: line.trim(),
          eventType: classifyEvent(line),
          rawLine: line,
        }));
      break;
  }

  return { format, entries };
}

module.exports = { parseLog, detectFormat };
