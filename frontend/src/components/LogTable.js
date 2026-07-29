'use client';

import Link from 'next/link';

export default function LogTable({ logs = [], onDelete }) {
  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <h3>No logs found</h3>
        <p style={{ fontSize: '0.82rem' }}>Upload your first log file to get started</p>
      </div>
    );
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBadge = (format) => {
    const colors = {
      syslog: 'var(--accent-primary)',
      apache: 'var(--color-high)',
      nginx: 'var(--color-low)',
      json: 'var(--accent-secondary)',
      csv: 'var(--color-medium)',
      windows_event: 'var(--color-info)',
      unknown: 'var(--text-muted)',
    };
    return colors[format] || colors.unknown;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Log File</th>
            <th>Format</th>
            <th>Entries</th>
            <th>Severity</th>
            <th>AI Summary</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={log._id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
              <td>
                <Link
                  href={`/logs/${log._id}`}
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  {log.originalName}
                </Link>
              </td>
              <td>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  background: `${formatBadge(log.format)}15`,
                  color: formatBadge(log.format),
                  border: `1px solid ${formatBadge(log.format)}30`,
                  textTransform: 'uppercase',
                }}>
                  {log.format}
                </span>
              </td>
              <td>
                <span className="mono">{(log.totalEntries || 0).toLocaleString()}</span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {log.severityCounts?.critical > 0 && (
                    <span className="severity-badge severity-critical">{log.severityCounts.critical}</span>
                  )}
                  {log.severityCounts?.high > 0 && (
                    <span className="severity-badge severity-high">{log.severityCounts.high}</span>
                  )}
                  {log.severityCounts?.medium > 0 && (
                    <span className="severity-badge severity-medium">{log.severityCounts.medium}</span>
                  )}
                </div>
              </td>
              <td>
                {log.aiSummary?.status === 'completed' ? (
                  <span className="tag tag-accent">✓ Analyzed</span>
                ) : (
                  <span className="tag">Pending</span>
                )}
              </td>
              <td>
                <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                  {formatDate(log.createdAt)}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Link href={`/logs/${log._id}`} className="btn btn-ghost btn-sm">
                    View
                  </Link>
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(log._id); }}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--color-critical)' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
