'use client';

import { useState, useCallback, useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import Link from 'next/link';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';

function IncidentsContent() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.getUsers().then(res => setUsers(res.data?.users || [])).catch(() => {});
    }
  }, [user]);

  const handleAssign = async (id, userId) => {
    try {
      await api.assignIncident(id, userId);
      refresh();
    } catch (err) {
      alert(`Failed to assign incident: ${err.message}`);
    }
  };

  const fetchIncidents = useCallback(
    () => api.listIncidentReports(page, 20, {
      ...(statusFilter && { status: statusFilter }),
    }),
    [page, statusFilter]
  );

  const { data, loading, error, execute: refresh } = useFetch(fetchIncidents, [page, statusFilter]);

  const incidents = data?.data?.incidents || [];
  const pagination = data?.data?.pagination || {};

  const getStatusColor = (status = '') => {
    const map = {
      draft: '#6b7280',
      under_review: '#f59e0b',
      finalized: '#22c55e',
    };
    return map[status] || '#6b7280';
  };

  const getStatusLabel = (status = '') => {
    const map = {
      draft: 'Draft',
      under_review: 'Under Review',
      finalized: 'Finalized',
    };
    return map[status] || status;
  };

  const getSeverityStyle = (sev = '') => {
    const map = {
      critical: 'severity-critical',
      high: 'severity-high',
      medium: 'severity-medium',
      low: 'severity-low',
      info: 'severity-info',
    };
    return map[sev.toLowerCase()] || 'severity-info';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const downloadReportJson = async (alertId, title) => {
    try {
      const res = await api.getIncidentReport(alertId);
      const report = res.data?.incident;
      if (!report) return alert('Report not found');
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_report.json`;
      a.click();
    } catch (err) {
      alert(`Failed to download report: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this incident report? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.request(`/incidents/${id}`, { method: 'DELETE' });
      refresh();
    } catch (err) {
      alert(`Failed to delete report: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1>Incident Reports Center</h1>
        <p>Manage, review, and export AI-generated SOC investigation reports mapped to MITRE ATT&CK.</p>
      </div>

      {/* Filter Controls */}
      <div className="glass-card-static" style={{
        padding: '16px 20px',
        marginBottom: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Filter status:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="under_review">Under Review</option>
            <option value="finalized">Finalized</option>
          </select>
        </div>
        
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Showing {incidents.length} of {pagination.total || 0} reports
        </span>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="loading-center">
          <div className="spinner"></div>
          <p>Loading incident reports...</p>
        </div>
      ) : error ? (
        <div className="glass-card-static" style={{ padding: '24px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p style={{ color: 'var(--color-critical)', fontWeight: 600 }}>Error loading incident reports</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>{error.message || 'Unknown error occurred.'}</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="glass-card-static" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
          <h3>No Incident Reports</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px', maxWidth: '400px', marginInline: 'auto' }}>
            Incident reports are generated inside the Alert Investigation Workspace. Go to Threat Alerts and choose an alert to investigate.
          </p>
          <Link href="/alerts" className="btn btn-primary btn-sm" style={{ marginTop: '16px', display: 'inline-block', textDecoration: 'none' }}>
            Go to Threat Alerts
          </Link>
        </div>
      ) : (
        <div className="glass-card-static" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Incident / Title</th>
                  <th>Status</th>
                  <th>Source Alert</th>
                  <th>Severity</th>
                  <th>Risk Score</th>
                  <th>MITRE ATT&CK</th>
                  <th>Generated</th>
                  <th>Assigned To</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => {
                  const alert = incident.alertId || {};
                  return (
                    <tr key={incident._id}>
                      {/* Incident Title */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <Link
                            href={`/investigate/${incident.alertId?._id || incident.alertId}`}
                            style={{
                              fontWeight: 600,
                              fontSize: '0.86rem',
                              color: 'var(--accent-primary-hover)',
                              textDecoration: 'none',
                            }}
                          >
                            {incident.title}
                          </Link>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ID: {incident._id}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: `${getStatusColor(incident.status)}15`,
                          border: `1px solid ${getStatusColor(incident.status)}30`,
                          color: getStatusColor(incident.status),
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(incident.status) }} />
                          {getStatusLabel(incident.status)}
                        </span>
                      </td>

                      {/* Source Alert */}
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {alert.ruleName || 'Unknown Alert'}
                        </span>
                      </td>

                      {/* Severity */}
                      <td>
                        <span className={`severity-badge ${getSeverityStyle(alert.severity || 'info')}`} style={{ fontSize: '0.66rem' }}>
                          {alert.severity || 'info'}
                        </span>
                      </td>

                      {/* Risk Score */}
                      <td>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: alert.riskScore >= 80 ? 'var(--color-critical)' : alert.riskScore >= 50 ? '#f59e0b' : 'var(--text-secondary)'
                        }}>
                          {alert.riskScore || 0}/100
                        </span>
                      </td>

                      {/* MITRE ATT&CK */}
                      <td>
                        {alert.mitreAttack?.techniqueId ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                              {alert.mitreAttack.techniqueId}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {alert.mitreAttack.techniqueName}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>

                      {/* Generated Time */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {formatDate(incident.createdAt)}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            by {incident.createdBy?.username || 'System'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned To */}
                      <td>
                        {user?.role === 'admin' ? (
                          <select
                            value={incident.assignedTo?._id || ''}
                            onChange={(e) => handleAssign(incident._id, e.target.value)}
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-primary)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '0.78rem',
                              padding: '4px 8px',
                              outline: 'none',
                              cursor: 'pointer',
                              width: '120px'
                            }}
                          >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                              <option key={u._id} value={u._id}>{u.username}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: incident.assignedTo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {incident.assignedTo?.username || 'Unassigned'}
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Link
                            href={`/investigate/${incident.alertId?._id || incident.alertId}`}
                            className="btn btn-ghost btn-xs"
                            style={{ textDecoration: 'none', padding: '4px 8px' }}
                            title="Investigate Workspace"
                          >
                            🔍 Investigate
                          </Link>
                          
                          <button
                            onClick={() => downloadReportJson(incident.alertId?._id || incident.alertId, incident.title)}
                            className="btn btn-ghost btn-xs"
                            style={{ padding: '4px 8px', color: '#06b6d4' }}
                            title="Download Report JSON"
                          >
                            ⬇ Export JSON
                          </button>

                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(incident._id)}
                              disabled={deletingId === incident._id}
                              className="btn btn-ghost btn-xs"
                              style={{ padding: '4px 8px', color: 'var(--color-critical)' }}
                              title="Delete Report"
                            >
                              {deletingId === incident._id ? 'Deleting...' : '🗑'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderTop: '1px solid var(--border-primary)',
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Page {pagination.page} of {pagination.pages} ({pagination.total} reports)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'analyst', 'viewer']}>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <IncidentsContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
