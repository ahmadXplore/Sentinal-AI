'use client';

export default function ActivityFeed({ alerts = [] }) {
  if (alerts.length === 0) {
    return (
      <div className="glass-card-static" style={{ padding: '22px' }}>
        <h3 style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          marginBottom: '16px',
          color: 'var(--text-primary)',
        }}>
          Recent Alerts
        </h3>
        <div className="empty-state" style={{ padding: '30px 0' }}>
          <div className="empty-state-icon">🔔</div>
          <h3>No alerts yet</h3>
          <p style={{ fontSize: '0.82rem' }}>Upload and analyze logs to detect suspicious activities</p>
        </div>
      </div>
    );
  }

  const severityIcons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  return (
    <div className="glass-card-static" style={{ padding: '22px' }}>
      <h3 style={{
        fontSize: '0.9rem',
        fontWeight: 700,
        marginBottom: '16px',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        Recent Alerts
        <span style={{
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.7rem',
          fontWeight: 700,
          background: 'var(--color-critical-bg)',
          color: 'var(--color-critical)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}>
          {alerts.length}
        </span>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
        {alerts.map((alert, index) => (
          <div
            key={index}
            className="animate-slide-left"
            style={{
              padding: '12px 14px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              borderLeft: `3px solid var(--color-${alert.severity || 'medium'})`,
              animationDelay: `${index * 80}ms`,
              transition: 'background var(--transition-fast)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}>
              <span>{severityIcons[alert.severity] || '⚪'}</span>
              <span className={`severity-badge severity-${alert.severity || 'medium'}`}>
                {alert.severity || 'medium'}
              </span>
              <span style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginLeft: 'auto',
                fontFamily: 'var(--font-mono)',
              }}>
                {alert.logName}
              </span>
            </div>
            <p style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}>
              {alert.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
