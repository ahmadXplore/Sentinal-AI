'use client';

import { useState } from 'react';

const SEVERITY_STYLES = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', dot: '#ef4444', label: 'CRITICAL' },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)', dot: '#f97316', label: 'HIGH' },
  medium:   { color: '#eab308', bg: 'rgba(234,179,8,0.08)',  dot: '#eab308', label: 'MEDIUM' },
  low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  dot: '#22c55e', label: 'LOW' },
  info:     { color: '#6b7280', bg: 'rgba(107,114,128,0.08)',dot: '#6b7280', label: 'INFO' },
};

function TimelineEvent({ event, index, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info;

  const formatTime = (ts) => {
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      return isNaN(d) ? String(ts) : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return String(ts); }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
  };

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '28px' }}>
        <div style={{
          width: '14px', height: '14px', borderRadius: '50%',
          background: sev.dot, border: `2px solid ${sev.dot}40`,
          boxShadow: `0 0 8px ${sev.dot}60`,
          flexShrink: 0, marginTop: '14px',
          transition: 'transform 0.2s',
          transform: expanded ? 'scale(1.3)' : 'scale(1)',
        }} />
        {!isLast && (
          <div style={{
            width: '2px', flex: 1, marginTop: '4px',
            background: `linear-gradient(to bottom, ${sev.dot}60, rgba(255,255,255,0.04))`,
            minHeight: '24px',
          }} />
        )}
      </div>

      {/* Event card */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '16px' }}>
        <div
          onClick={() => setExpanded(o => !o)}
          style={{
            background: expanded ? sev.bg : 'rgba(255,255,255,0.02)',
            border: `1px solid ${expanded ? sev.color + '30' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '10px', padding: '12px 14px',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700, color: sev.color,
                  background: sev.bg, border: `1px solid ${sev.color}30`,
                  padding: '2px 7px', borderRadius: '8px',
                }}>{sev.label}</span>
                {event.sourceIP && (
                  <span style={{
                    fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)',
                    padding: '2px 7px', borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    📡 {event.sourceIP}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.4' }}>
                {event.event || event.message || 'Event'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {formatTime(event.timestamp)}
              </div>
              {formatDate(event.timestamp) && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {formatDate(event.timestamp)}
                </div>
              )}
            </div>
          </div>

          {/* Expanded details */}
          {expanded && event.details && (
            <div style={{
              marginTop: '10px', padding: '10px 12px',
              background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
              fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.6',
              fontFamily: 'var(--font-mono)', wordBreak: 'break-all',
            }}>
              {event.details}
            </div>
          )}

          {(event.details || expanded) && (
            <div style={{ marginTop: '8px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {expanded ? '▲ Collapse' : '▼ Show details'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvestigationTimeline({ events = [], matchedEntries = [] }) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Merge and normalize events from both sources
  const allEvents = [
    ...events.map(e => ({
      ...e,
      _source: 'report',
    })),
    ...matchedEntries.map(e => ({
      timestamp: e.timestamp,
      event: e.message || e.rawLine || 'Log event',
      severity: e.severity || 'info',
      sourceIP: e.sourceIP,
      details: e.rawLine !== e.message ? e.rawLine : e.eventType,
      _source: 'log',
    })),
  ];

  // Sort by timestamp
  const sorted = [...allEvents].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return ta - tb;
  });

  const filtered = sorted.filter(e => {
    const sevMatch = filter === 'all' || e.severity === filter;
    const searchMatch = !searchTerm ||
      e.event?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.sourceIP?.includes(searchTerm) ||
      e.details?.toLowerCase().includes(searchTerm.toLowerCase());
    return sevMatch && searchMatch;
  });

  const severityCounts = sorted.reduce((acc, e) => {
    acc[e.severity] = (acc[e.severity] || 0) + 1;
    return acc;
  }, {});

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
        <h3 style={{ marginBottom: '8px', fontWeight: 700 }}>No Timeline Events</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Timeline will populate after generating the incident report or when matched log entries are available.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Events', count: sorted.length },
          ...Object.entries(severityCounts).map(([sev, count]) => ({ key: sev, label: sev.charAt(0).toUpperCase() + sev.slice(1), count })),
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            style={{
              padding: '6px 14px',
              background: filter === s.key ? (SEVERITY_STYLES[s.key]?.bg || 'rgba(99,102,241,0.1)') : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === s.key ? (SEVERITY_STYLES[s.key]?.color + '40' || 'rgba(99,102,241,0.4)') : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '20px', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: filter === s.key ? 700 : 500,
              color: filter === s.key ? (SEVERITY_STYLES[s.key]?.color || '#818cf8') : 'var(--text-muted)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {s.key !== 'all' && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: SEVERITY_STYLES[s.key]?.dot || '#6b7280', display: 'inline-block' }} />
            )}
            {s.label} <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.8 }}>({s.count})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          placeholder="Search events by message, IP, or details..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: '9px 14px', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', color: 'var(--text-primary)',
            fontSize: '0.82rem', outline: 'none',
          }}
        />
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
          No events match the current filter.
        </p>
      ) : (
        <div style={{ padding: '4px 0' }}>
          {filtered.map((event, i) => (
            <TimelineEvent key={i} event={event} index={i} isLast={i === filtered.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
