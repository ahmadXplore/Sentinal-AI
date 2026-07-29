'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useFetch } from '../../../hooks/useFetch';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Sidebar from '../../../components/Sidebar';
import Navbar from '../../../components/Navbar';

// ─── MITRE Technique Reference ───────────────────────────
const MITRE_REFERENCE = {
  'T1110': { name: 'Brute Force', tactic: 'Credential Access', url: 'https://attack.mitre.org/techniques/T1110/', description: 'Adversaries use brute force techniques to gain access to accounts when passwords are unknown or when password hashes are obtained.' },
  'T1068': { name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation', url: 'https://attack.mitre.org/techniques/T1068/', description: 'Adversaries may exploit software vulnerabilities in an attempt to elevate privileges.' },
  'T1046': { name: 'Network Service Discovery', tactic: 'Discovery', url: 'https://attack.mitre.org/techniques/T1046/', description: 'Adversaries attempt to get a listing of services running on remote hosts and local network infrastructure devices.' },
  'T1059': { name: 'Command and Scripting Interpreter', tactic: 'Execution', url: 'https://attack.mitre.org/techniques/T1059/', description: 'Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.' },
  'T1059.001': { name: 'PowerShell', tactic: 'Execution', url: 'https://attack.mitre.org/techniques/T1059/001/', description: 'Adversaries may abuse PowerShell commands and scripts for execution.' },
  'T1204': { name: 'User Execution', tactic: 'Execution', url: 'https://attack.mitre.org/techniques/T1204/', description: 'An adversary may rely upon specific actions by a user in order to gain execution.' },
  'T1048': { name: 'Exfiltration Over Alternative Protocol', tactic: 'Exfiltration', url: 'https://attack.mitre.org/techniques/T1048/', description: 'Adversaries may steal data by exfiltrating it over a different protocol than that of the existing command and control channel.' },
};

// ─── Incident Playbook Auto-Generation ───────────────────
function generatePlaybook(alert) {
  const base = [
    { step: 1, action: 'Verify Alert Validity', detail: 'Review the matched log entries to confirm they represent genuine malicious activity, not routine operations or false positives.' },
    { step: 2, action: 'Isolate Affected Endpoints', detail: `Consider isolating the following IPs if compromise is suspected: ${(alert.affectedIPs || []).join(', ') || 'N/A'}.` },
  ];

  const techId = alert.mitreAttack?.techniqueId || '';

  if (techId === 'T1110') {
    base.push(
      { step: 3, action: 'Lock Affected Accounts', detail: `Reset passwords and enforce MFA for affected users: ${(alert.affectedUsers || []).join(', ') || 'N/A'}.` },
      { step: 4, action: 'Block Source IP', detail: 'Add offending source IPs to the firewall deny list and IDS blocklist.' },
      { step: 5, action: 'Audit Auth Logs', detail: 'Search for successful logins from the same source IP to identify potential compromised sessions.' },
    );
  } else if (techId === 'T1068' || techId === 'T1548') {
    base.push(
      { step: 3, action: 'Patch Vulnerable Systems', detail: 'Identify the exploit vector and apply patches to vulnerable software.' },
      { step: 4, action: 'Revoke Elevated Privileges', detail: 'Remove any unauthorized privilege escalations and audit admin accounts.' },
    );
  } else if (techId === 'T1046') {
    base.push(
      { step: 3, action: 'Block Scanning IP', detail: 'Add scanning source IP to firewall deny list to prevent further reconnaissance.' },
      { step: 4, action: 'Harden Exposed Services', detail: 'Disable unnecessary services on discovered ports and tighten firewall rules.' },
    );
  } else if (techId.startsWith('T1059')) {
    base.push(
      { step: 3, action: 'Quarantine Payload', detail: 'Isolate the suspicious script or binary for malware analysis.' },
      { step: 4, action: 'Enable PowerShell Logging', detail: 'Configure ScriptBlock and Module Logging for enhanced PowerShell visibility.' },
    );
  } else if (techId === 'T1204') {
    base.push(
      { step: 3, action: 'Scan for Malware', detail: 'Run a full antivirus and EDR scan on affected endpoints.' },
      { step: 4, action: 'Block Malicious Hashes', detail: 'Add known bad file hashes to endpoint protection deny lists.' },
    );
  } else if (techId === 'T1048') {
    base.push(
      { step: 3, action: 'Inspect Outbound Traffic', detail: 'Review firewall and proxy logs for large or unusual outbound data transfers.' },
      { step: 4, action: 'Revoke Access', detail: 'Disable compromised accounts and API keys used in exfiltration.' },
    );
  } else {
    base.push(
      { step: 3, action: 'Conduct Deeper Analysis', detail: 'Use SIEM and EDR tools to correlate this alert with other indicators of compromise.' },
    );
  }

  base.push({ step: base.length + 1, action: 'Document Findings', detail: 'Record all observations, evidence, and remediation actions in the investigation notes below.' });

  return base;
}

function InvestigationContent() {
  const params = useParams();
  const { user } = useAuth();
  const alertId = params.id;

  const { data, loading, error, execute: refresh } = useFetch(() => api.getAlert(alertId), [alertId]);
  const { data: corrData } = useFetch(() => api.getCorrelatedAlerts(alertId), [alertId]);

  const alert = data?.data?.alert;
  const correlations = corrData?.data?.correlations || [];

  // State for actions
  const [newStatus, setNewStatus] = useState('');
  const [noteText, setNoteText] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'analyst')) {
      api.getUsers()
        .then((res) => setUsers(res.data?.users || []))
        .catch((err) => console.error('Failed to load users', err));
    }
  }, [user]);

  const handleAssignChange = async (userId) => {
    setActionLoading('assign');
    try {
      await api.assignAlert(alertId, userId);
      refresh();
    } catch (err) {
      window.alert(err.message || 'Failed to assign alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setActionLoading('status');
    try {
      await api.updateAlertStatus(alertId, newStatus);
      setNewStatus('');
      refresh();
    } catch (err) {
      window.alert(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setActionLoading('note');
    try {
      await api.addAlertNote(alertId, noteText.trim());
      setNoteText('');
      refresh();
    } catch (err) {
      window.alert(err.message || 'Failed to add note');
    } finally {
      setActionLoading(null);
    }
  };

  const getSeverityStyle = (sev = '') => {
    const map = { critical: 'severity-critical', high: 'severity-high', medium: 'severity-medium', low: 'severity-low', info: 'severity-info' };
    return map[sev.toLowerCase()] || '';
  };

  const getStatusColor = (status = '') => {
    const map = { open: '#ef4444', investigating: '#f59e0b', resolved: '#22c55e', false_positive: '#6b7280' };
    return map[status] || '#6b7280';
  };

  const getStatusLabel = (status = '') => {
    const map = { open: 'Open', investigating: 'Investigating', resolved: 'Resolved', false_positive: 'False Positive' };
    return map[status] || status;
  };

  const getRiskColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#eab308';
    if (score >= 20) return '#3b82f6';
    return '#6b7280';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (loading) {
    return (
      <div className="page-container animate-fade-in">
        <div className="loading-center">
          <div className="spinner"></div>
          <p>Loading investigation workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="page-container animate-fade-in">
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error || 'Alert not found'}</span>
        </div>
        <Link href="/alerts" className="btn btn-ghost" style={{ marginTop: '12px', textDecoration: 'none' }}>
          ← Back to Alerts
        </Link>
      </div>
    );
  }

  const mitreRef = MITRE_REFERENCE[alert.mitreAttack?.techniqueId] || null;
  const playbook = generatePlaybook(alert);

  return (
    <div className="page-container animate-fade-in">
      {/* Back link + Header */}
      <Link href="/alerts" style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
        ← Back to Alerts Command Center
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>{alert.ruleName}</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '600px' }}>{alert.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`severity-badge ${getSeverityStyle(alert.severity)}`}>{alert.severity}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '0.76rem', fontWeight: 600,
            color: getStatusColor(alert.status),
            background: `${getStatusColor(alert.status)}15`,
            border: `1px solid ${getStatusColor(alert.status)}30`,
            padding: '4px 12px', borderRadius: 'var(--radius-full)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(alert.status) }} />
            {getStatusLabel(alert.status)}
          </span>
          <span style={{
            fontSize: '1.1rem', fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: getRiskColor(alert.riskScore),
            background: `${getRiskColor(alert.riskScore)}12`,
            border: `1px solid ${getRiskColor(alert.riskScore)}30`,
            padding: '4px 14px', borderRadius: 'var(--radius-md)',
          }}>
            {alert.riskScore}/100
          </span>
          <Link
            href={`/investigate/${alertId}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 18px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: '10px', color: '#fff',
              fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              transition: 'all 0.2s',
            }}
          >
            🔍 AI Investigate
          </Link>
        </div>
      </div>

      {/* ─── Two-Column Layout ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ── MITRE ATT&CK Technique Card ──────────────── */}
          {alert.mitreAttack?.techniqueId && (
            <div className="glass-card-static" style={{
              padding: '20px',
              borderLeft: '4px solid var(--accent-primary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>MITRE ATT&CK® Mapping</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Adversary Technique Classification</span>
                </div>
                {mitreRef?.url && (
                  <a
                    href={mitreRef.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.7rem', textDecoration: 'none', color: 'var(--accent-primary)' }}
                  >
                    View on MITRE →
                  </a>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: 'rgba(0,0,0,0.15)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Technique ID</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-primary-hover)', marginTop: '2px' }}>
                    {alert.mitreAttack.techniqueId}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Technique Name</span>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {alert.mitreAttack.techniqueName || mitreRef?.name || '—'}
                  </div>
                </div>
                {mitreRef?.tactic && (
                  <div>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tactic Category</span>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{mitreRef.tactic}</div>
                  </div>
                )}
              </div>
              {mitreRef?.description && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.5 }}>{mitreRef.description}</p>
              )}
            </div>
          )}

          {/* ── Event Timeline / Matched Entries ─────────── */}
          <div className="glass-card-static" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '16px' }}>
              📜 Event Timeline ({(alert.matchedEntries || []).length} matched entries)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute', left: '11px', top: '12px', bottom: '12px', width: '2px',
                background: 'linear-gradient(180deg, var(--accent-primary), var(--accent-secondary), transparent)',
              }} />

              {(alert.matchedEntries || []).map((entry, idx) => (
                <div key={idx} style={{
                  display: 'flex', gap: '16px', padding: '12px 0', position: 'relative',
                  borderBottom: idx < (alert.matchedEntries || []).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  {/* Dot */}
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--bg-primary)', border: '2px solid var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1, flexShrink: 0,
                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)',
                  }}>
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {entry.eventType || 'Event'}
                        {entry.severity && (
                          <span className={`severity-badge ${getSeverityStyle(entry.severity)}`} style={{ fontSize: '0.58rem', marginLeft: '8px' }}>
                            {entry.severity}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>

                    {/* Entry details */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '6px', fontSize: '0.74rem', color: 'var(--text-secondary)',
                    }}>
                      {entry.sourceIP && (
                        <span><strong style={{ color: 'var(--text-muted)' }}>SRC:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.sourceIP}</span></span>
                      )}
                      {entry.destinationIP && (
                        <span><strong style={{ color: 'var(--text-muted)' }}>DST:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.destinationIP}</span></span>
                      )}
                      {entry.user && (
                        <span><strong style={{ color: 'var(--text-muted)' }}>User:</strong> {entry.user}</span>
                      )}
                    </div>

                    {entry.message && (
                      <div style={{
                        marginTop: '6px', padding: '8px 10px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        wordBreak: 'break-word',
                      }}>
                        {entry.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {(!alert.matchedEntries || alert.matchedEntries.length === 0) && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '16px 0', textAlign: 'center' }}>
                  No matched log entries recorded.
                </p>
              )}
            </div>
          </div>

          {/* ── Incident Response Playbook ────────────────── */}
          <div className="glass-card-static" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '16px' }}>
              📋 Incident Response Playbook
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {playbook.map((item) => (
                <div key={item.step} style={{
                  display: 'flex', gap: '14px', padding: '14px',
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      {item.action}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {item.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ── Alert Info ────────────────────────────────── */}
          <div className="glass-card-static" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Alert Details
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Alert ID</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{alert._id?.slice(-8)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Triggered</span>
                <span style={{ color: 'var(--text-secondary)' }}>{formatDate(alert.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Source Log</span>
                {alert.logId ? (
                  <Link href={`/logs/${alert.logId._id || alert.logId}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.76rem' }}>
                    {alert.logId.originalName || 'View Log'}
                  </Link>
                ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned To</span>
                <span style={{ color: 'var(--text-secondary)' }}>{alert.assignedTo?.username || 'Unassigned'}</span>
              </div>

              {/* Affected IPs */}
              {(alert.affectedIPs || []).length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>AFFECTED IPs</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {alert.affectedIPs.map((ip, i) => (
                      <span key={i} style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '2px 8px', borderRadius: '4px',
                        color: 'var(--text-secondary)',
                      }}>{ip}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected Users */}
              {(alert.affectedUsers || []).length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>AFFECTED USERS</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {alert.affectedUsers.map((u, i) => (
                      <span key={i} style={{
                        fontSize: '0.72rem',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        padding: '2px 8px', borderRadius: '4px',
                        color: 'var(--text-secondary)',
                      }}>{u}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Status Update Actions ────────────────────── */}
          <div className="glass-card-static" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Actions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 10px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem', outline: 'none',
                  }}
                >
                  <option value="">Change Status...</option>
                  <option value="open">🔴 Open</option>
                  <option value="investigating">🟡 Investigating</option>
                  <option value="resolved">🟢 Resolved</option>
                  <option value="false_positive">⚪ False Positive</option>
                </select>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleStatusChange}
                  disabled={!newStatus || actionLoading === 'status'}
                >
                  {actionLoading === 'status' ? '...' : 'Apply'}
                </button>
              </div>

              {(user?.role === 'admin' || user?.role === 'analyst') && (
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
                  <select
                    value={alert.assignedTo?._id || ''}
                    onChange={(e) => handleAssignChange(e.target.value)}
                    disabled={actionLoading === 'assign'}
                    style={{
                      flex: 1, padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem', outline: 'none',
                    }}
                  >
                    <option value="">Unassign Alert</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        👤 {u.username} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── Correlated Alerts ────────────────────────── */}
          <div className="glass-card-static" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              🔗 Correlated Alerts ({correlations.length})
            </h4>
            {correlations.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No correlated alerts found.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {correlations.slice(0, 5).map((corr) => (
                  <Link
                    key={corr._id}
                    href={`/alerts/${corr._id}`}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.015)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-primary-hover)' }}>{corr.ruleName}</span>
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                        Risk: {corr.riskScore} · {formatDate(corr.createdAt)}
                      </span>
                    </div>
                    <span className={`severity-badge ${getSeverityStyle(corr.severity)}`} style={{ fontSize: '0.58rem' }}>
                      {corr.severity}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Investigation Notes Feed ─────────────────── */}
          <div className="glass-card-static" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              📝 Investigation Notes ({(alert.notes || []).length})
            </h4>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                placeholder="Add a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                style={{
                  flex: 1, padding: '8px 10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem', outline: 'none',
                }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!noteText.trim() || actionLoading === 'note'}
              >
                {actionLoading === 'note' ? '...' : 'Add'}
              </button>
            </form>

            {/* Notes list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {(alert.notes || []).slice().reverse().map((note, idx) => (
                <div key={idx} style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-primary-hover)' }}>{note.addedBy}</span>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{formatDate(note.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{note.text}</p>
                </div>
              ))}
              {(!alert.notes || alert.notes.length === 0) && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                  No notes yet. Add one above.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'analyst', 'viewer']}>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <InvestigationContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
