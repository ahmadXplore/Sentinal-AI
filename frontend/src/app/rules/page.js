'use client';

import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import ConfirmModal from '../../components/ConfirmModal';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const OPERATORS = [
  { value: 'equals', label: 'Equals (==)' },
  { value: 'contains', label: 'Contains (substring)' },
  { value: 'regex', label: 'Regex Match (pattern)' },
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'lt', label: 'Less Than (<)' },
];
const FIELDS = [
  { value: 'message', label: 'Message Text' },
  { value: 'sourceIP', label: 'Source IP' },
  { value: 'destinationIP', label: 'Destination IP' },
  { value: 'eventType', label: 'Event Category' },
  { value: 'severity', label: 'Severity' },
  { value: 'user', label: 'User Handle' },
  { value: 'port', label: 'Target Port' },
];

function RulesContent() {
  const { data, loading, error, execute: refresh } = useFetch(() => api.getRules(), []);

  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [techId, setTechId] = useState('');
  const [techName, setTechName] = useState('');
  const [conditions, setConditions] = useState([{ field: 'message', operator: 'contains', value: '' }]);
  const [isAggregation, setIsAggregation] = useState(false);
  const [timeWindowMinutes, setTimeWindowMinutes] = useState(5);
  const [minThreshold, setMinThreshold] = useState(10);
  const [groupBy, setGroupBy] = useState('sourceIP');

  // Deletion Modal State
  const [deleteModal, setDeleteModal] = useState({ open: false, ruleId: null, ruleName: '' });
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const rules = data?.data?.rules || [];

  // Toggle Rule
  const handleToggleRule = async (id) => {
    setActionLoading(id);
    try {
      await api.toggleRule(id);
      refresh();
    } catch (err) {
      alert(err.message || 'Failed to toggle rule');
    } finally {
      setActionLoading(null);
    }
  };

  // Conditions modification
  const handleAddCondition = () => {
    setConditions([...conditions, { field: 'message', operator: 'contains', value: '' }]);
  };

  const handleRemoveCondition = (idx) => {
    if (conditions.length === 1) return;
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const handleConditionChange = (idx, field, val) => {
    const updated = [...conditions];
    updated[idx][field] = val;
    setConditions(updated);
  };

  // Rule Creation Submission
  const handleCreateRule = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading('create');

    const payload = {
      name,
      description,
      severity,
      mitreAttack: techId ? { techniqueId: techId, techniqueName: techName } : undefined,
      conditions,
      ...(isAggregation && {
        timeWindowMinutes: parseInt(timeWindowMinutes, 10),
        minThreshold: parseInt(minThreshold, 10),
        groupBy,
      }),
    };

    try {
      await api.createRule(payload);
      setIsCreating(false);
      setName('');
      setDescription('');
      setSeverity('medium');
      setTechId('');
      setTechName('');
      setConditions([{ field: 'message', operator: 'contains', value: '' }]);
      setIsAggregation(false);
      refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to create detection rule');
    } finally {
      setActionLoading(null);
    }
  };

  // Deletion triggers
  const triggerDeleteRule = (id, ruleName) => {
    setDeleteModal({ open: true, ruleId: id, ruleName });
  };

  const confirmDeleteRule = async () => {
    const { ruleId } = deleteModal;
    setDeleteModal({ open: false, ruleId: null, ruleName: '' });
    try {
      await api.deleteRule(ruleId);
      refresh();
    } catch (err) {
      alert(err.message || 'Failed to delete rule');
    }
  };

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
      <div className="page-header">
        <h1>SIEM Detection Rules Registry</h1>
        <p>Define log patterns, thresholds, and sliding window correlations to trigger security alerts.</p>
      </div>

      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
        </span>
        {!isCreating && (
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
            + Create Detection Rule
          </button>
        )}
      </div>

      {/* Create Rule Form Card */}
      {isCreating && (
        <div className="glass-card-static animate-fade-in" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '18px' }}>Create Custom Rule</h3>
          {formError && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
              <span>⚠️</span>
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Rule Name *</label>
                <input
                  required
                  placeholder="e.g. Brute Force Attempts"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Severity Level *</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={inputStyle}>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                placeholder="Explain the threat vector this rule matches"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {/* MITRE ATT&CK Mappings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>MITRE ATT&CK ID (Optional)</label>
                <input
                  placeholder="e.g. T1110"
                  value={techId}
                  onChange={(e) => setTechId(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>MITRE Technique Name (Optional)</label>
                <input
                  placeholder="e.g. Brute Force"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Conditions Section */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Log Filter Conditions (Matches ALL criteria)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {conditions.map((cond, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                      value={cond.field}
                      onChange={(e) => handleConditionChange(idx, 'field', e.target.value)}
                      style={{ ...inputStyle, width: '160px' }}
                    >
                      {FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>

                    <select
                      value={cond.operator}
                      onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                      style={{ ...inputStyle, width: '160px' }}
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    <input
                      required
                      placeholder="Match value..."
                      value={cond.value}
                      onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />

                    {conditions.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ color: 'var(--color-critical)', padding: '6px 12px' }}
                        onClick={() => handleRemoveCondition(idx)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleAddCondition}
                style={{ marginTop: '12px' }}
              >
                + Add Criteria
              </button>
            </div>

            {/* Aggregation & Sliding Window Check */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isAggregation}
                  onChange={(e) => setIsAggregation(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Apply Time Window & Frequency Aggregation (SIEM Rules)
              </label>

              {isAggregation && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Min Trigger Occurrences</label>
                    <input
                      type="number"
                      min={1}
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Time Window (Minutes)</label>
                    <input
                      type="number"
                      min={1}
                      value={timeWindowMinutes}
                      onChange={(e) => setTimeWindowMinutes(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Group Detections By</label>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={inputStyle}>
                      <option value="sourceIP">Source IP</option>
                      <option value="user">User Handle</option>
                      <option value="eventType">Event Category</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={actionLoading === 'create'}
              >
                {actionLoading === 'create' ? 'Creating...' : 'Save Rule'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules Registry Table */}
      {loading ? (
        <div className="loading-center">
          <div className="spinner"></div>
          <p>Loading detection rules...</p>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : rules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛡️</div>
          <h3>No detection rules set</h3>
          <p style={{ fontSize: '0.85rem' }}>Create custom rules to begin identifying cyber threats.</p>
        </div>
      ) : (
        <div className="glass-card-static" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule Information</th>
                  <th>Severity</th>
                  <th>MITRE technique</th>
                  <th>Execution Model</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule._id} style={{ opacity: rule.isActive ? 1 : 0.6 }}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          {rule.name}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {rule.description || 'No description provided.'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`severity-badge ${getSeverityStyle(rule.severity)}`} style={{ fontSize: '0.66rem' }}>
                        {rule.severity}
                      </span>
                    </td>
                    <td>
                      {rule.mitreAttack?.techniqueId ? (
                        <span className="mono" style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {rule.mitreAttack.techniqueId} — {rule.mitreAttack.techniqueName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      {rule.minThreshold ? (
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          Threshold aggregation ({rule.minThreshold} hits / {rule.timeWindowMinutes}m by {rule.groupBy})
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          Single occurrence filter
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Toggle Switch */}
                        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px' }}>
                          <input
                            type="checkbox"
                            checked={rule.isActive}
                            disabled={actionLoading === rule._id}
                            onChange={() => handleToggleRule(rule._id)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: rule.isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                            borderRadius: '20px', transition: '0.2s',
                          }}>
                            <span style={{
                              position: 'absolute', height: '14px', width: '14px', left: rule.isActive ? '20px' : '3px', bottom: '3px',
                              backgroundColor: '#fff', borderRadius: '50%', transition: '0.2s',
                            }} />
                          </span>
                        </label>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: rule.isActive ? 'var(--color-low)' : 'var(--text-muted)' }}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {!rule.isDefault ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-critical)' }}
                          onClick={() => triggerDeleteRule(rule._id, rule.name)}
                        >
                          ✕ Delete
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                          System Rule
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm deletion popup modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Delete Detection Rule"
        message={`Are you sure you want to delete the detection rule '${deleteModal.ruleName}'? This will prevent any future logs from triggering this alert.`}
        type="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteRule}
        onCancel={() => setDeleteModal({ open: false, ruleId: null, ruleName: '' })}
      />
    </div>
  );
}

const labelStyle = {
  fontSize: '0.74rem',
  color: 'var(--text-muted)',
  fontWeight: 600,
};

const inputStyle = {
  padding: '8px 12px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: '0.82rem',
  outline: 'none',
};

export default function RulesPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'analyst']}>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <RulesContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
