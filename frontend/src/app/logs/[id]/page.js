'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFetch } from '../../../hooks/useFetch';
import api from '../../../lib/api';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Sidebar from '../../../components/Sidebar';
import Navbar from '../../../components/Navbar';
import AISummaryPanel from '../../../components/AISummaryPanel';
import Link from 'next/link';

function LogDetailContent() {
  const params = useParams();
  const router = useRouter();
  const logId = params.id;

  const { data, loading, error, execute: refreshLog } = useFetch(() => api.getLog(logId), [logId]);

  // Client side filtering & pagination for parsed entries
  const [filterText, setFilterText] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  const log = data?.data?.log;

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [filterText, filterSeverity]);

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg"></div>
        <p>Loading security audit record...</p>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error || 'Log audit file not found'}</span>
        </div>
        <Link href="/logs" className="btn btn-secondary btn-sm">
          ◀ Back to Registry
        </Link>
      </div>
    );
  }

  // Format File Size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formattedSize = log.metadata?.fileSize ? formatBytes(log.metadata.fileSize) : 'N/A';
  
  // Normalize date range
  const startDate = log.metadata?.dateRange?.start ? new Date(log.metadata.dateRange.start).toLocaleString() : 'N/A';
  const endDate = log.metadata?.dateRange?.end ? new Date(log.metadata.dateRange.end).toLocaleString() : 'N/A';

  // Apply filters on client-side
  const entries = log.parsedEntries || [];
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = filterText
      ? (entry.message?.toLowerCase().includes(filterText.toLowerCase()) ||
         entry.sourceIP?.toLowerCase().includes(filterText.toLowerCase()) ||
         entry.eventType?.toLowerCase().includes(filterText.toLowerCase()))
      : true;

    const matchesSeverity = filterSeverity
      ? entry.severity?.toLowerCase() === filterSeverity.toLowerCase()
      : true;

    return matchesSearch && matchesSeverity;
  });

  // Pagination calculation
  const totalEntries = filteredEntries.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const paginatedEntries = filteredEntries.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getSeverityStyle = (sev = '') => {
    const map = {
      critical: 'severity-critical',
      high: 'severity-high',
      medium: 'severity-medium',
      low: 'severity-low',
      info: 'severity-info',
    };
    return map[sev.toLowerCase()] || '';
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Page Header / Navigation */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Link href="/logs" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>◀</span> Back to Registry
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Audit Details</span>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{log.originalName}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            ID: <span className="mono" style={{ color: 'var(--text-secondary)' }}>{log._id}</span> • Format: <span style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 600 }}>{log.format}</span>
          </p>
        </div>
      </div>

      {/* Columns: Left (Metadata + AI) & Right (Parsed Table) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '400px 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left Side: Metadata Card & AI assessment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '92px' }}>
          {/* Metadata Card */}
          <div className="glass-card-static" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '14px' }}>Log Audit Metadata</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ingestion Time</span>
                <span className="mono">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>File Size</span>
                <span className="mono">{formattedSize}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Uploader IP/Handle</span>
                <span>{log.uploadedBy?.username || 'System Seed'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Parsed Entries Count</span>
                <span className="mono" style={{ fontWeight: 600 }}>{log.totalEntries?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Telemetry Chronology</span>
                <div className="mono" style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', marginTop: '4px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  Start: {startDate}<br/>
                  End: {endDate}
                </div>
              </div>
            </div>
          </div>

          {/* AI Threat Assessment Section */}
          <AISummaryPanel
            logId={log._id}
            initialSummary={log.aiSummary}
            onSummaryGenerated={refreshLog}
          />
        </div>

        {/* Right Side: Parsed Entries Table */}
        <div className="glass-card-static" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Parsed Security Records ({totalEntries.toLocaleString()} of {log.totalEntries?.toLocaleString()})</h3>

            {/* In-table filter search */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search entries..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  outline: 'none',
                  minWidth: '180px',
                }}
              />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>

          {paginatedEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No matching entries found</h3>
              <p style={{ fontSize: '0.8rem' }}>Try clearing the filters or search keywords</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '160px' }}>Timestamp</th>
                      <th style={{ width: '100px' }}>Severity</th>
                      <th style={{ width: '120px' }}>Source IP</th>
                      <th>Log Entry Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEntries.map((entry, idx) => (
                      <tr key={idx} style={{ cursor: 'default' }}>
                        <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td>
                          <span className={`severity-badge ${getSeverityStyle(entry.severity)}`} style={{ fontSize: '0.65rem', padding: '1px 8px' }}>
                            {entry.severity}
                          </span>
                        </td>
                        <td className="mono" style={{ color: entry.sourceIP ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {entry.sourceIP || 'N/A'}
                        </td>
                        <td style={{
                          wordBreak: 'break-all',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.74rem',
                          lineHeight: '1.4',
                          color: 'var(--text-primary)',
                        }}>
                          {entry.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Client Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="pagination-btn"
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 8px' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="pagination-btn"
                  >
                    ▶
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LogDetailPage() {
  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <LogDetailContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
