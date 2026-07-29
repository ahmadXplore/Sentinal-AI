'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

// ─── Preset test log templates ────────────────────────────────────────────────
const PRESETS = [
  {
    label: '🟢 Normal HTTP Traffic',
    color: '#22c55e',
    data: {
      duration: 0, protocol_type: 'tcp', service: 'http', flag: 'SF',
      bytes_in: 181, bytes_out: 5450, num_failed_logins: 0, logged_in: 1,
      count: 8, srv_count: 8, serror_rate: 0, rerror_rate: 0,
      same_srv_rate: 1.0, diff_srv_rate: 0.0, dst_host_count: 9,
      dst_host_srv_count: 9, dst_host_same_srv_rate: 1.0,
    },
  },
  {
    label: '🔴 SYN Flood / DOS Attack',
    color: '#ef4444',
    data: {
      duration: 0, protocol_type: 'tcp', service: 'http', flag: 'S0',
      bytes_in: 0, bytes_out: 0, num_failed_logins: 0, logged_in: 0,
      count: 511, srv_count: 511, serror_rate: 1.0, srv_serror_rate: 1.0,
      rerror_rate: 0.0, same_srv_rate: 1.0, diff_srv_rate: 0.0,
      dst_host_count: 255, dst_host_srv_count: 255,
      dst_host_same_srv_rate: 1.0, dst_host_serror_rate: 1.0,
    },
  },
  {
    label: '🟠 SSH Brute Force',
    color: '#f59e0b',
    data: {
      duration: 0, protocol_type: 'tcp', service: 'ftp', flag: 'REJ',
      bytes_in: 0, bytes_out: 0, num_failed_logins: 5, logged_in: 0,
      count: 150, srv_count: 150, serror_rate: 0.0, rerror_rate: 1.0,
      same_srv_rate: 1.0, diff_srv_rate: 0.0,
      dst_host_count: 255, dst_host_srv_count: 254,
      dst_host_same_srv_rate: 1.0, dst_host_rerror_rate: 1.0,
    },
  },
  {
    label: '🔴 Port Scan / Probe',
    color: '#a855f7',
    data: {
      duration: 1, protocol_type: 'tcp', service: 'private', flag: 'REJ',
      bytes_in: 0, bytes_out: 0, num_failed_logins: 0, logged_in: 0,
      count: 1, srv_count: 1, serror_rate: 0.0, rerror_rate: 1.0,
      same_srv_rate: 0.06, diff_srv_rate: 0.07,
      dst_host_count: 255, dst_host_srv_count: 9,
      dst_host_same_srv_rate: 0.04, dst_host_diff_srv_rate: 0.06,
    },
  },
];

const THREAT_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: '#ef4444', icon: '🔴' },
  high:     { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', text: '#f59e0b', icon: '🟠' },
  medium:   { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.4)',  text: '#eab308', icon: '🟡' },
  low:      { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)',  text: '#22c55e', icon: '🟢' },
};

function RiskBar({ score, label }) {
  const color = score >= 75 ? '#ef4444' : score >= 50 ? '#f59e0b' : score >= 25 ? '#eab308' : '#22c55e';
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{score ?? 'N/A'}</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${score ?? 0}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: '4px',
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
}

function ResultCard({ result, index }) {
  const level = result.threat_level || 'low';
  const cfg   = THREAT_COLORS[level] || THREAT_COLORS.low;
  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: '12px',
      padding: '18px',
      marginBottom: '12px',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          {cfg.icon} Log Record #{index + 1}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
            background: cfg.border, color: cfg.text, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {level}
          </span>
          {result.is_anomaly && (
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
              background: 'rgba(239,68,68,0.2)', color: '#ef4444',
            }}>
              ⚠️ ANOMALY
            </span>
          )}
        </div>
      </div>
      <RiskBar score={result.risk_score} label="Ensemble Risk Score" />
      {result.model_scores && (
        <div style={{ marginTop: '10px' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Per-Model Breakdown
          </p>
          <RiskBar score={result.model_scores.isolation_forest} label="Isolation Forest" />
          <RiskBar score={result.model_scores.random_forest}    label="Random Forest" />
          <RiskBar score={result.model_scores.xgboost}          label="XGBoost" />
        </div>
      )}
    </div>
  );
}

function HuntingContent() {
  const [mlStatus, setMlStatus]       = useState(null);
  const [logs, setLogs]               = useState([JSON.stringify(PRESETS[0].data, null, 2)]);
  const [results, setResults]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState('analyze'); // 'analyze' | 'classify'
  const [classifyLog, setClassifyLog] = useState(JSON.stringify(PRESETS[1].data, null, 2));
  const [classifyResult, setClassifyResult] = useState(null);
  const [classifyLoading, setClassifyLoading] = useState(false);

  // Fetch ML engine health on mount
  useEffect(() => {
    api.request('/ml/health').then(r => setMlStatus(r.data)).catch(() => setMlStatus({ status: 'unreachable' }));
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const parsed = logs.map((logStr, i) => {
        try { return JSON.parse(logStr); }
        catch { throw new Error(`Log #${i + 1} is not valid JSON`); }
      });
      const res = await api.request('/ml/analyze', { method: 'POST', body: JSON.stringify({ logs: parsed }) });
      setResults(res.data.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClassify = async () => {
    setClassifyLoading(true);
    setError('');
    setClassifyResult(null);
    try {
      const parsed = JSON.parse(classifyLog);
      const res = await api.request('/ml/classify', { method: 'POST', body: JSON.stringify(parsed) });
      setClassifyResult(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setClassifyLoading(false);
    }
  };

  const addLog = () => setLogs(prev => [...prev, '{\n  \n}']);
  const removeLog = (i) => setLogs(prev => prev.filter((_, idx) => idx !== i));
  const updateLog = (i, val) => setLogs(prev => { const n = [...prev]; n[i] = val; return n; });

  const mlOnline = mlStatus?.status === 'ok';

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #0070f3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}>🔬</div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>ML Threat Analysis Engine</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Ensemble anomaly detection powered by Isolation Forest, Random Forest & XGBoost
            </p>
          </div>
          {/* ML Engine Status Badge */}
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '20px',
            background: mlOnline ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${mlOnline ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: mlOnline ? '#22c55e' : '#ef4444',
              animation: mlOnline ? 'glow 2s infinite' : 'none',
            }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: mlOnline ? '#22c55e' : '#ef4444' }}>
              ML Engine {mlOnline ? 'Online' : 'Offline'}
            </span>
            {mlOnline && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                · {mlStatus.total_models} models
              </span>
            )}
          </div>
        </div>
      </div>

      {!mlOnline && mlStatus && (
        <div className="animate-fade-in-up" style={{
          padding: '14px 18px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#ef4444', fontSize: '0.85rem',
        }}>
          ⚠️ ML Engine is not reachable. Make sure <code>python app.py</code> is running in the <code>ml-engine</code> folder on port 5001.
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px', width: 'fit-content', border: '1px solid var(--border-primary)' }}>
        {[{ key: 'analyze', label: '📊 Batch Anomaly Detection' }, { key: 'classify', label: '🎯 Single Log Classification' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 18px', borderRadius: '8px', fontSize: '0.83rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: activeTab === tab.key ? 'linear-gradient(135deg, #6366f1, #0070f3)' : 'transparent',
            color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── Preset Buttons ───────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
          Quick Test Presets
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PRESETS.map((preset, i) => (
            <button key={i} onClick={() => {
              if (activeTab === 'analyze') updateLog(0, JSON.stringify(preset.data, null, 2));
              else setClassifyLog(JSON.stringify(preset.data, null, 2));
            }} style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
              background: `${preset.color}15`, border: `1px solid ${preset.color}40`,
              color: preset.color, cursor: 'pointer', transition: 'all 0.2s',
            }}>{preset.label}</button>
          ))}
        </div>
      </div>


      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── BATCH ANALYZE TAB ────────────────────────────────── */}
      {activeTab === 'analyze' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Log Records to Analyze</h3>
              <button onClick={addLog} style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', cursor: 'pointer' }}>
                + Add Log
              </button>
            </div>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '12px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Log #{i + 1}</span>
                  {logs.length > 1 && (
                    <button onClick={() => removeLog(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>✕ Remove</button>
                  )}
                </div>
                <textarea
                  value={log}
                  onChange={e => updateLog(i, e.target.value)}
                  rows={12}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
                    resize: 'vertical', outline: 'none', lineHeight: 1.6,
                  }}
                />
              </div>
            ))}
            <button onClick={handleAnalyze} disabled={loading || !mlOnline} className="btn btn-primary" style={{
              width: '100%', padding: '13px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #0070f3)',
              border: 'none', cursor: loading || !mlOnline ? 'not-allowed' : 'pointer', opacity: loading || !mlOnline ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {loading ? <span className="animate-pulse">⚙️ Analyzing...</span> : '🔬 Run ML Analysis'}
            </button>
          </div>

          {/* Results */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Detection Results</h3>
            {!results && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-primary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔬</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Select a preset or paste a log record and click<br /><strong>Run ML Analysis</strong> to see results
                </p>
              </div>
            )}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '12px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="animate-pulse" style={{ fontSize: '2rem', marginBottom: '10px' }}>⚙️</div>
                <p style={{ color: '#818cf8', fontSize: '0.85rem' }}>
                  Querying Isolation Forest, Random Forest & XGBoost...
                </p>
              </div>
            )}
            {results && results.map((r, i) => <ResultCard key={i} result={r} index={i} />)}
          </div>
        </div>
      )}

      {/* ── CLASSIFY TAB ─────────────────────────────────────── */}
      {activeTab === 'classify' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Input */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Single Log Deep Classification</h3>
            <textarea
              value={classifyLog}
              onChange={e => setClassifyLog(e.target.value)}
              rows={20}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
                resize: 'vertical', outline: 'none', lineHeight: 1.6, marginBottom: '12px',
              }}
            />
            <button onClick={handleClassify} disabled={classifyLoading || !mlOnline} className="btn btn-primary" style={{
              width: '100%', padding: '13px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              border: 'none', cursor: classifyLoading || !mlOnline ? 'not-allowed' : 'pointer', opacity: classifyLoading || !mlOnline ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {classifyLoading ? <span className="animate-pulse">🎯 Classifying...</span> : '🎯 Classify Threat'}
            </button>
          </div>

          {/* Classify Results */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Classification Report</h3>
            {!classifyResult && !classifyLoading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-primary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎯</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Paste a log and click<br /><strong>Classify Threat</strong> for deep analysis
                </p>
              </div>
            )}
            {classifyLoading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '12px', background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <div className="animate-pulse" style={{ fontSize: '2rem', marginBottom: '10px' }}>🎯</div>
                <p style={{ color: '#c084fc', fontSize: '0.85rem' }}>
                  Running Random Forest & XGBoost classification...
                </p>
              </div>
            )}
            {classifyResult && (() => {
              const risk = classifyResult.risk_score || 0;
              const isT  = classifyResult.is_threat;
              const cfg  = isT ? THREAT_COLORS.critical : THREAT_COLORS.low;
              return (
                <div className="animate-fade-in-up" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '14px', padding: '24px' }}>
                  {/* Verdict */}
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>{isT ? '🚨' : '✅'}</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: cfg.text, margin: '0 0 4px' }}>
                      {isT ? 'THREAT DETECTED' : 'CLEAN TRAFFIC'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                      Ensemble model confidence verdict
                    </p>
                  </div>

                  {/* Big risk score */}
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: cfg.text, lineHeight: 1 }}>{risk}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Risk Score / 100</div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${risk}%`, background: `linear-gradient(90deg, ${cfg.text}88, ${cfg.text})`, borderRadius: '4px', transition: 'width 1s ease' }} />
                    </div>
                  </div>

                  {/* Per-model confidence */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Model Confidence</p>
                    <RiskBar score={Math.round((classifyResult.rf_confidence || 0) * 100)}  label="Random Forest" />
                    <RiskBar score={Math.round((classifyResult.xgb_confidence || 0) * 100)} label="XGBoost" />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HuntingPage() {
  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <HuntingContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
