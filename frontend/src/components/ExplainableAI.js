'use client';

import { useState, useEffect } from 'react';
import api from '../lib/api';

const IMPACT_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
};

export default function ExplainableAI({ alertId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [showContext, setShowContext] = useState(false);

  useEffect(() => {
    if (!alertId) return;
    setLoading(true);
    setError('');
    api.explainAlert(alertId)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        setError(err.message || 'Failed to load Explainable AI data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [alertId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px', gap: '16px' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Generating model explainability report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        padding: '20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '8px', fontSize: '0.85rem', color: '#ef4444', textAlign: 'center'
      }}>
        ⚠️ {error || 'Explainability data unavailable.'}
      </div>
    );
  }

  const { explanation, contextSummary, rawPromptTemplate, model } = data;
  const confidenceColor = explanation.confidenceScore >= 75 ? '#22c55e' : explanation.confidenceScore >= 50 ? '#eab308' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Explainable AI Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(99,102,241,0.08))',
        border: '1px solid rgba(6,182,212,0.25)',
        borderRadius: '12px', padding: '18px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧠</span> Decision Interpretability Analysis
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Transparent breakdown of why the AI generated this assessment.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Circular Confidence Gauge */}
          <div style={{ position: 'relative', width: '56px', height: '56px' }}>
            <svg viewBox="0 0 56 56" style={{ width: '56px', height: '56px' }}>
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="24" fill="none"
                stroke={confidenceColor} strokeWidth="5"
                strokeDasharray={`${(explanation.confidenceScore / 100) * 151} 151`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
              />
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              fontSize: '0.85rem', fontWeight: 800, color: confidenceColor
            }}>
              {explanation.confidenceScore}%
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Confidence</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Certainty Score</div>
          </div>
        </div>
      </div>

      {/* Grid: Classification & False Positive */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {/* Classification Reasoning */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔍</span> Logical Path Reasoning
          </h4>
          <p style={{ fontSize: '0.84rem', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0 }}>
            {explanation.classificationReasoning}
          </p>
          {explanation.confidenceJustification && (
            <div style={{ marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Justification: </strong>
              {explanation.confidenceJustification}
            </div>
          )}
        </div>

        {/* False Positive assessment */}
        <div style={{ background: 'rgba(234,179,8,0.03)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '0.82rem', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span> False Positive Assessment
          </h4>
          <p style={{ fontSize: '0.84rem', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0 }}>
            {explanation.falsePositiveAnalysis}
          </p>
        </div>
      </div>

      {/* Feature Weights */}
      {explanation.featureWeights?.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>
            📊 Feature & Context Contributions
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Input Feature / Data Point</th>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Impact Weight</th>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Influence on Risk/Outcome</th>
                </tr>
              </thead>
              <tbody>
                {explanation.featureWeights.map((f, i) => {
                  const impact = f.impact?.toLowerCase() || 'medium';
                  const color = IMPACT_COLORS[impact] || '#94a3b8';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px', color: 'var(--text-primary)', fontWeight: 600 }}>{f.feature}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                          color, background: `${color}15`, border: `1px solid ${color}30`,
                          padding: '2px 8px', borderRadius: '8px'
                        }}>{impact}</span>
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{f.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Key Differentiating Factors */}
      {explanation.keyDifferentiatingFactors?.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
            🎯 Key Differentiating Indicators
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {explanation.keyDifferentiatingFactors.map((factor, i) => (
              <li key={i} style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Collapsible Prompt & Context Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Context Summary */}
        <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
          <button
            onClick={() => setShowContext(!showContext)}
            style={{
              width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
              border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            <span>🗂️ Input Context Summary Sent to AI (Incident Context Generation)</span>
            <span>{showContext ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {showContext && (
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <pre style={{
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)',
                maxHeight: '300px', overflowY: 'auto', lineHeight: '1.6'
              }}>{contextSummary}</pre>
            </div>
          )}
        </div>

        {/* Prompt Template */}
        <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            style={{
              width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
              border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            <span>📜 AI Prompt Instructions Template (Model Transparency)</span>
            <span>{showPrompt ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {showPrompt && (
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <pre style={{
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)',
                maxHeight: '300px', overflowY: 'auto', lineHeight: '1.6'
              }}>{rawPromptTemplate}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
