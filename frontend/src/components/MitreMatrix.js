'use client';

const MITRE_TACTICS = [
  {
    name: 'Initial Access',
    description: 'Entry points into the network',
    techniques: [
      { id: 'T1190', name: 'Exploit Public App' },
      { id: 'T1133', name: 'External Services' },
      { id: 'T1566', name: 'Phishing' },
    ],
  },
  {
    name: 'Execution',
    description: 'Running malicious code',
    techniques: [
      { id: 'T1059', name: 'Command Interpreter' },
      { id: 'T1059.001', name: 'PowerShell Abuse' },
      { id: 'T1204', name: 'User Execution' },
    ],
  },
  {
    name: 'Privilege Escalation',
    description: 'Gaining higher permissions',
    techniques: [
      { id: 'T1068', name: 'Exploitation for PrivEsc' },
      { id: 'T1548', name: 'Abuse Elevation Control' },
      { id: 'T1078', name: 'Valid Accounts' },
    ],
  },
  {
    name: 'Discovery',
    description: 'Scanning and exploration',
    techniques: [
      { id: 'T1046', name: 'Port Scan / Network discovery' },
      { id: 'T1082', name: 'System Info Discovery' },
    ],
  },
  {
    name: 'Credential Access',
    description: 'Stealing usernames/passwords',
    techniques: [
      { id: 'T1110', name: 'Brute Force' },
      { id: 'T1003', name: 'OS Credential Dumping' },
    ],
  },
  {
    name: 'Exfiltration',
    description: 'Stealing sensitive data',
    techniques: [
      { id: 'T1048', name: 'Exfiltration Over Protocol' },
      { id: 'T1567', name: 'Exfiltration to Web Service' },
    ],
  },
];

export default function MitreMatrix({ alerts = [] }) {
  // Aggregate alert counts by technique ID
  const counts = {};
  const severities = {};

  for (const alert of alerts) {
    const techId = alert.mitreAttack?.techniqueId;
    if (techId) {
      counts[techId] = (counts[techId] || 0) + 1;
      
      // Keep track of highest severity for coloring
      const sevWeight = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      const currentSev = alert.severity?.toLowerCase() || 'info';
      const maxSev = severities[techId] || 'info';
      if (sevWeight[currentSev] > sevWeight[maxSev]) {
        severities[techId] = currentSev;
      }
    }
  }

  const getSeverityGlow = (sev = '') => {
    const map = {
      critical: '0 0 12px rgba(239, 68, 68, 0.4)',
      high: '0 0 10px rgba(249, 115, 22, 0.35)',
      medium: '0 0 8px rgba(234, 179, 8, 0.25)',
      low: '0 0 6px rgba(59, 130, 246, 0.2)',
    };
    return map[sev] || 'none';
  };

  const getSeverityBorder = (sev = '') => {
    const map = {
      critical: '1px solid rgba(239, 68, 68, 0.5)',
      high: '1px solid rgba(249, 115, 22, 0.45)',
      medium: '1px solid rgba(234, 179, 8, 0.35)',
      low: '1px solid rgba(59, 130, 246, 0.3)',
      info: '1px solid rgba(255, 255, 255, 0.08)',
    };
    return map[sev] || '1px solid rgba(255, 255, 255, 0.08)';
  };

  const getSeverityBg = (sev = '') => {
    const map = {
      critical: 'rgba(239, 68, 68, 0.08)',
      high: 'rgba(249, 115, 22, 0.06)',
      medium: 'rgba(234, 179, 8, 0.04)',
      low: 'rgba(59, 130, 246, 0.04)',
    };
    return map[sev] || 'rgba(255, 255, 255, 0.01)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>MITRE ATT&CK® Threat Vector Matrix</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Visual mapping of active detections to standard adversary tactics and techniques.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        alignItems: 'start',
      }}>
        {MITRE_TACTICS.map((tactic) => (
          <div
            key={tactic.name}
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Tactic Header */}
            <div style={{
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid var(--border-primary)',
            }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {tactic.name}
              </h4>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                {tactic.description}
              </span>
            </div>

            {/* Techniques List */}
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tactic.techniques.map((tech) => {
                const count = counts[tech.id] || 0;
                const maxSev = severities[tech.id];
                const active = count > 0;

                return (
                  <div
                    key={tech.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: getSeverityBg(maxSev),
                      border: getSeverityBorder(maxSev),
                      boxShadow: getSeverityGlow(maxSev),
                      transition: 'all 0.25s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: active ? 'var(--accent-primary-hover)' : 'var(--text-muted)',
                      }}>
                        {tech.id}
                      </span>
                      {active && (
                        <span style={{
                          background: 'var(--color-critical)',
                          color: '#fff',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          lineHeight: 1.1,
                        }}>
                          🚨 {count}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '0.74rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      lineHeight: '1.3',
                    }}>
                      {tech.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
