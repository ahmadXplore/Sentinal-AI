const Rule = require('../models/Rule');
const Alert = require('../models/Alert');

const defaultRules = [
  {
    name: 'SSH Brute Force Detection',
    description: 'Detects a high volume of failed SSH or authentication attempts from a single source IP.',
    severity: 'high',
    mitreAttack: { techniqueId: 'T1110', techniqueName: 'Brute Force' },
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'authentication' },
      { field: 'message', operator: 'contains', value: 'Failed' },
    ],
    timeWindowMinutes: 5,
    minThreshold: 10,
    groupBy: 'sourceIP',
    isDefault: true,
  },
  {
    name: 'Privilege Escalation Detection',
    description: 'Detects attempts to execute commands with administrative/root privileges or exploit privilege escalation routes.',
    severity: 'critical',
    mitreAttack: { techniqueId: 'T1068', techniqueName: 'Exploitation for Privilege Escalation' },
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'privilege_escalation' },
    ],
    isDefault: true,
  },
  {
    name: 'Port Scan Detection',
    description: 'Detects network scanning activity or connection drops indicating a port sweep from a single source IP.',
    severity: 'high',
    mitreAttack: { techniqueId: 'T1046', techniqueName: 'Network Service Discovery' },
    conditions: [
      { field: 'message', operator: 'contains', value: 'PORT_SCAN' },
    ],
    timeWindowMinutes: 5,
    minThreshold: 10,
    groupBy: 'sourceIP',
    isDefault: true,
  },
  {
    name: 'Suspicious PowerShell Activity',
    description: 'Detects usage of suspicious PowerShell flags, commands, or download strings.',
    severity: 'high',
    mitreAttack: { techniqueId: 'T1059.001', techniqueName: 'PowerShell' },
    conditions: [
      { field: 'message', operator: 'regex', value: 'powershell|pwsh|-enc|-encodedcommand|bypass|downloadstring|iex\\(|invoke-expression' },
    ],
    isDefault: true,
  },
  {
    name: 'Malware Process Execution Detection',
    description: 'Detects presence of malware, trojan signatures, credential dumpers, or intrusion agent strings.',
    severity: 'critical',
    mitreAttack: { techniqueId: 'T1204', techniqueName: 'User Execution' },
    conditions: [
      { field: 'message', operator: 'regex', value: 'malware|trojan|ransomware|virus|mimikatz|cobalt strike|meterpreter|backdoor|rootkit' },
    ],
    isDefault: true,
  },
  {
    name: 'Data Exfiltration Detection',
    description: 'Detects anomalous outbound data transfer, large logs, or exfiltration indicators.',
    severity: 'high',
    mitreAttack: { techniqueId: 'T1048', techniqueName: 'Exfiltration Over Alternative Protocol' },
    conditions: [
      { field: 'message', operator: 'regex', value: 'exfiltration|exfiltrate|ftp upload|large upload' },
    ],
    isDefault: true,
  },
];

/**
 * Seed default rules if Rules collection is empty.
 */
async function seedDefaultRules() {
  try {
    const count = await Rule.countDocuments();
    if (count === 0) {
      await Rule.create(defaultRules);
      console.log('🛡️  Default threat detection rules seeded successfully.');
    }
  } catch (error) {
    console.error('❌ Error seeding default rules:', error.message);
  }
}

/**
 * Check if a single field condition is matched.
 */
function matchCondition(entry, condition) {
  const fieldValue = entry[condition.field];
  if (fieldValue === undefined || fieldValue === null) return false;

  const entryVal = String(fieldValue).toLowerCase();
  const condVal = String(condition.value).toLowerCase();

  switch (condition.operator) {
    case 'equals':
      return entryVal === condVal;
    case 'contains':
      return entryVal.includes(condVal);
    case 'regex':
      try {
        const regex = new RegExp(condition.value, 'i');
        return regex.test(String(fieldValue));
      } catch (e) {
        return false;
      }
    case 'gt':
      return Number(fieldValue) > Number(condition.value);
    case 'lt':
      return Number(fieldValue) < Number(condition.value);
    default:
      return false;
  }
}

/**
 * Calculate dynamic risk score based on rule severity and matched count.
 */
function calculateRiskScore(rule, count, sampleEntry) {
  let score = 0;

  // 1. Base Severity
  switch (rule.severity) {
    case 'critical': score = 80; break;
    case 'high':     score = 60; break;
    case 'medium':   score = 40; break;
    case 'low':      score = 20; break;
    default:         score = 5;
  }

  // 2. Frequency modifier
  score += Math.min(20, count * 2);

  // 3. Threat Intel / External IP heuristic
  const ip = sampleEntry?.sourceIP;
  if (ip) {
    const isPrivate = /^(127\.)|(10\.)|(172\.16\.)|(192\.168\.)/.test(ip);
    if (!isPrivate) {
      score += 10; // Extra risk for external traffic source
    }
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Core Threat Detection Runner
 * Evaluates parsed log entries against active rules and saves triggered Alerts.
 */
async function runDetectionEngine(log) {
  const activeRules = await Rule.find({ isActive: true });
  const entries = log.parsedEntries || [];

  if (entries.length === 0 || activeRules.length === 0) return [];

  const createdAlerts = [];

  for (const rule of activeRules) {
    // 1. Find all log entries matching the rule's conditions
    const matchedEntries = entries.filter((entry) =>
      rule.conditions.every((cond) => matchCondition(entry, cond))
    );

    if (matchedEntries.length === 0) continue;

    // 2. Separate sliding-window aggregation rules from simple ones
    if (rule.timeWindowMinutes && rule.minThreshold && rule.groupBy) {
      // ── Group and Slide Window Evaluation ──
      const groupField = rule.groupBy;
      
      // Group matched entries
      const grouped = {};
      for (const entry of matchedEntries) {
        const key = entry[groupField] || 'unknown';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(entry);
      }

      const windowMs = rule.timeWindowMinutes * 60 * 1000;

      for (const key of Object.keys(grouped)) {
        // Sort entries chronologically
        const groupEntries = grouped[key].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );

        let left = 0;
        for (let right = 0; right < groupEntries.length; right++) {
          while (
            new Date(groupEntries[right].timestamp) - new Date(groupEntries[left].timestamp) >
            windowMs
          ) {
            left++;
          }

          const count = right - left + 1;
          if (count >= rule.minThreshold) {
            // Trigger threshold alert!
            const evidence = groupEntries.slice(left, right + 1);

            const affectedIPs = Array.from(new Set(evidence.map((e) => e.sourceIP).filter(Boolean)));
            const affectedUsers = Array.from(new Set(evidence.map((e) => e.user).filter(Boolean)));

            const alert = await Alert.create({
              ruleId: rule._id,
              ruleName: rule.name,
              logId: log._id,
              severity: rule.severity,
              mitreAttack: rule.mitreAttack,
              riskScore: calculateRiskScore(rule, count, evidence[0]),
              status: 'open',
              description: `${rule.name} triggered: ${count} events matched for '${key}' in a ${rule.timeWindowMinutes}-minute window.`,
              affectedIPs,
              affectedUsers,
              matchedEntries: evidence.map((e) => ({
                timestamp: e.timestamp,
                severity: e.severity,
                sourceIP: e.sourceIP,
                destinationIP: e.destinationIP,
                message: e.message,
                eventType: e.eventType,
                user: e.user,
                rawLine: e.rawLine,
              })),
            });

            createdAlerts.push(alert);

            // Skip past this trigger window to consolidate overlapping alarms
            left = right + 1;
          }
        }
      }
    } else {
      // ── Consolidated Single-Event Rule ──
      const affectedIPs = Array.from(new Set(matchedEntries.map((e) => e.sourceIP).filter(Boolean)));
      const affectedUsers = Array.from(new Set(matchedEntries.map((e) => e.user).filter(Boolean)));

      const alert = await Alert.create({
        ruleId: rule._id,
        ruleName: rule.name,
        logId: log._id,
        severity: rule.severity,
        mitreAttack: rule.mitreAttack,
        riskScore: calculateRiskScore(rule, matchedEntries.length, matchedEntries[0]),
        status: 'open',
        description: `${rule.name} triggered: ${matchedEntries.length} security anomaly events identified.`,
        affectedIPs,
        affectedUsers,
        matchedEntries: matchedEntries.map((e) => ({
          timestamp: e.timestamp,
          severity: e.severity,
          sourceIP: e.sourceIP,
          destinationIP: e.destinationIP,
          message: e.message,
          eventType: e.eventType,
          user: e.user,
          rawLine: e.rawLine,
        })),
      });

      createdAlerts.push(alert);
    }
  }

  return createdAlerts;
}

module.exports = { seedDefaultRules, runDetectionEngine };
