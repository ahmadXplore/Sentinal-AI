"use client";

import { useState } from "react";

const PRIORITY_COLORS = {
  immediate: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    label: "🔴 Immediate",
  },
  short_term: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    label: "🟡 Short Term",
  },
  long_term: {
    color: "#6366f1",
    bg: "rgba(99,102,241,0.1)",
    border: "rgba(99,102,241,0.25)",
    label: "🔵 Long Term",
  },
};

const RISK_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        marginBottom: "20px",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <button
        className="no-print"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "14px 18px",
          background: "rgba(255,255,255,0.03)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "var(--text-primary)",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>{icon}</span> {title}
        </span>
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            transition: "transform 0.2s",
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0)",
          }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "16px 18px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function RiskGauge({ score, level }) {
  const color = RISK_COLORS[level] || "#6b7280";
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <div
        style={{
          position: "relative",
          width: "80px",
          height: "80px",
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 80 80" style={{ width: "80px", height: "80px" }}>
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${(pct / 100) * 201} 201`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 800,
              color,
              lineHeight: 1,
            }}
          >
            {score}
          </div>
          <div
            style={{
              fontSize: "0.55rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            /100
          </div>
        </div>
      </div>
      <div>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color,
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          {level} Risk
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            lineHeight: "1.5",
          }}
        >
          Risk score calculated based on severity, affected assets, and MITRE
          technique classification.
        </div>
      </div>
    </div>
  );
}

export default function IncidentReport({
  incident,
  alertId,
  alert,
  onGenerate,
  generating,
}) {
  const [analystNotes, setAnalystNotes] = useState(
    incident?.analystNotes || "",
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const report = incident?.report || {};

  const handleSaveNotes = async () => {
    if (!incident?._id) return;
    setSaving(true);
    try {
      const { default: api } = await import("../lib/api");
      await api.updateIncidentReport(incident._id, { analystNotes });
      setSaveMsg("Notes saved ✓");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(incident, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident_report_${alertId}_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  if (!incident) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "20px" }}>📋</div>
        <h3 style={{ marginBottom: "10px", fontWeight: 700 }}>
          No Incident Report Yet
        </h3>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            marginBottom: "28px",
            maxWidth: "380px",
            margin: "0 auto 28px",
          }}
        >
          Generate a structured AI incident report with MITRE ATT&CK mapping,
          risk assessment, and remediation playbook.
        </p>
        <button
          onClick={onGenerate}
          disabled={generating}
          style={{
            padding: "12px 28px",
            background: generating
              ? "rgba(99,102,241,0.2)"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none",
            borderRadius: "12px",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: generating ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: generating ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
            transition: "all 0.2s",
          }}
        >
          {generating ? (
            <>
              <span style={{ animation: "shimmer-pulse 1.5s infinite" }}>
                🤖
              </span>{" "}
              Generating Report...
            </>
          ) : (
            <>
              <span>🤖</span> Generate AI Incident Report
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className="incident-report-print-shell"
      style={{ background: "#fff", color: "#111827" }}
    >
      <div
        className="print-only"
        style={{
          display: "none",
          marginBottom: "24px",
          paddingBottom: "18px",
          borderBottom: "2px solid #e5e7eb",
        }}
      >
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#6366f1",
            marginBottom: "8px",
          }}
        >
          SentinelAI Incident Report
        </div>
        <h1
          style={{
            fontSize: "1.8rem",
            fontWeight: 800,
            margin: "0 0 10px",
            color: "#111827",
          }}
        >
          {incident.title || alert?.ruleName || "Incident Report"}
        </h1>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            fontSize: "0.92rem",
            color: "#374151",
          }}
        >
          <span>
            <strong>Incident:</strong>{" "}
            {incident.title || alert?.ruleName || "Untitled Incident"}
          </span>
          <span>
            <strong>Assigned Analyst:</strong>{" "}
            {alert?.assignedTo?.username || "Unassigned"}
          </span>
          <span>
            <strong>Generated:</strong>{" "}
            {new Date(incident.createdAt || Date.now()).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Report Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "#6366f1",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              🛡️ SentinelAI Incident Report
            </div>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                marginBottom: "6px",
              }}
            >
              {incident.title || alert?.ruleName || "Incident Report"}
            </h2>
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              <span>
                👤 Assigned Analyst:{" "}
                {alert?.assignedTo?.username || "Unassigned"}
              </span>
              <span>📅 {new Date(incident.createdAt).toLocaleString()}</span>
              <span>🤖 AI Generated</span>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  background:
                    incident.status === "finalized"
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(245,158,11,0.1)",
                  color:
                    incident.status === "finalized" ? "#22c55e" : "#f59e0b",
                  border: `1px solid ${incident.status === "finalized" ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                }}
              >
                {incident.status === "finalized" ? "✅ Finalized" : "📝 Draft"}
              </span>
            </div>
          </div>
          <div
            className="no-print"
            style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
          >
            <button
              onClick={onGenerate}
              disabled={generating}
              style={{
                padding: "8px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "var(--text-secondary)",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              🔄 Regenerate
            </button>
            <button
              onClick={handleDownload}
              style={{
                padding: "8px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "var(--text-secondary)",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              ⬇ Download JSON
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: "8px 14px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.78rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              🖨️ Export PDF / Print
            </button>
          </div>
        </div>
      </div>

      {/* Incident Summary */}
      <Section title="Incident Summary" icon="📊" defaultOpen={true}>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <p
            style={{
              fontSize: "0.915rem",
              lineHeight: "1.9",
              color: "#f8fafc",
              margin: 0,
            }}
          >
            {report.incidentSummary || "No summary generated."}
          </p>
        </div>
      </Section>

      {/* Threat Description */}
      <Section title="Threat Description" icon="⚔️" defaultOpen={true}>
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "12px",
          }}
        >
          <p
            style={{
              fontSize: "0.915rem",
              lineHeight: "1.9",
              color: "#f8fafc",
              margin: 0,
            }}
          >
            {report.threatDescription || "No threat description."}
          </p>
        </div>
        {report.attackVector && (
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: "8px",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
            }}
          >
            <span style={{ fontWeight: 700, color: "#ef4444" }}>
              Attack Vector:{" "}
            </span>
            {report.attackVector}
          </div>
        )}
      </Section>

      {/* MITRE ATT&CK */}
      {report.mitreAttack && (
        <Section title="MITRE ATT&CK Mapping" icon="🗺️" defaultOpen={true}>
          <div
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  padding: "4px 12px",
                  background: "rgba(99,102,241,0.2)",
                  border: "1px solid rgba(99,102,241,0.4)",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#818cf8",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {report.mitreAttack.techniqueId}
              </span>
              <span
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  alignSelf: "center",
                }}
              >
                {report.mitreAttack.techniqueName}
              </span>
              {report.mitreAttack.tacticName && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    alignSelf: "center",
                  }}
                >
                  Tactic: {report.mitreAttack.tacticName}
                </span>
              )}
            </div>
            {report.mitreAttack.explanation && (
              <p
                style={{
                  fontSize: "0.82rem",
                  lineHeight: "1.7",
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                {report.mitreAttack.explanation}
              </p>
            )}
          </div>
        </Section>
      )}

      {/* Risk Assessment */}
      {report.riskAssessment && (
        <Section title="Risk Assessment" icon="📈" defaultOpen={true}>
          <RiskGauge
            score={report.riskAssessment.score}
            level={report.riskAssessment.level}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            {report.riskAssessment.businessImpact && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    marginBottom: "6px",
                  }}
                >
                  Business Impact
                </div>
                <div
                  style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}
                >
                  {report.riskAssessment.businessImpact}
                </div>
              </div>
            )}
            {report.riskAssessment.likelihood && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    marginBottom: "6px",
                  }}
                >
                  Recurrence Likelihood
                </div>
                <div
                  style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}
                >
                  {report.riskAssessment.likelihood}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Recommended Actions */}
      {report.recommendedActions?.length > 0 && (
        <Section title="Recommended Actions" icon="🛠️" defaultOpen={true}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {report.recommendedActions.map((action, i) => {
              const p =
                PRIORITY_COLORS[action.priority] || PRIORITY_COLORS.short_term;
              return (
                <div
                  key={i}
                  style={{
                    padding: "14px 16px",
                    background: p.bg,
                    border: `1px solid ${p.border}`,
                    borderRadius: "10px",
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: p.color,
                        background: `${p.bg}`,
                        border: `1px solid ${p.border}`,
                        padding: "3px 8px",
                        borderRadius: "10px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.label}
                    </span>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: "4px",
                      }}
                    >
                      {action.action}
                    </div>
                    {action.rationale && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {action.rationale}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Evidence */}
      {report.evidence?.length > 0 && (
        <Section title="Evidence" icon="🔬" defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {report.evidence.map((e, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "12px",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "8px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.type}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {e.value}
                  </div>
                  <div
                    style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}
                  >
                    {e.description}
                  </div>
                </div>
                {e.significance && (
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      maxWidth: "180px",
                      textAlign: "right",
                    }}
                  >
                    {e.significance}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Investigation Findings */}
      {report.investigationFindings && (
        <Section title="Investigation Findings" icon="🔍" defaultOpen={false}>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: "1.8",
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
            }}
          >
            {report.investigationFindings}
          </p>
        </Section>
      )}

      {/* Analyst Notes */}
      <Section title="Analyst Notes" icon="📝" defaultOpen={true}>
        <div className="no-print">
          <textarea
            value={analystNotes}
            onChange={(e) => setAnalystNotes(e.target.value)}
            placeholder="Add your investigation findings, observations, or additional context here..."
            rows={5}
            style={{
              width: "100%",
              padding: "12px",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              lineHeight: "1.6",
              outline: "none",
              resize: "vertical",
              marginBottom: "10px",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              style={{
                padding: "8px 18px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "💾 Save Notes"}
            </button>
            {saveMsg && (
              <span style={{ fontSize: "0.78rem", color: "#22c55e" }}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
        <div
          className="print-only"
          style={{ display: "none", fontSize: "0.875rem", lineHeight: "1.6" }}
        >
          {analystNotes ? (
            <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#111827" }}>
              {analystNotes}
            </p>
          ) : (
            <p style={{ margin: 0, fontStyle: "italic", color: "#6b7280" }}>
              No analyst notes provided.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
