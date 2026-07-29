'use client';

export default function SeverityChart({ severity }) {
  if (!severity) return null;

  const total = Object.values(severity).reduce((a, b) => a + b, 0) || 1;

  const bars = [
    { key: 'critical', label: 'Critical', color: 'var(--color-critical)', count: severity.critical || 0 },
    { key: 'high', label: 'High', color: 'var(--color-high)', count: severity.high || 0 },
    { key: 'medium', label: 'Medium', color: 'var(--color-medium)', count: severity.medium || 0 },
    { key: 'low', label: 'Low', color: 'var(--color-low)', count: severity.low || 0 },
    { key: 'info', label: 'Info', color: 'var(--color-info)', count: severity.info || 0 },
  ];

  return (
    <div className="glass-card-static" style={{ padding: '22px' }}>
      <h3 style={{
        fontSize: '0.9rem',
        fontWeight: 700,
        marginBottom: '20px',
        color: 'var(--text-primary)',
      }}>
        Severity Distribution
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {bars.map((bar, index) => (
          <div key={bar.key} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: bar.color,
                  boxShadow: `0 0 6px ${bar.color}40`,
                }}></span>
                <span style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}>
                  {bar.label}
                </span>
              </div>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}>
                {bar.count.toLocaleString()}
              </span>
            </div>

            <div style={{
              width: '100%',
              height: '6px',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.max((bar.count / total) * 100, bar.count > 0 ? 2 : 0)}%`,
                background: bar.color,
                borderRadius: 'var(--radius-full)',
                transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: `0 0 8px ${bar.color}30`,
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        marginTop: '18px',
        paddingTop: '14px',
        borderTop: '1px solid var(--border-primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total Events</span>
        <span style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
