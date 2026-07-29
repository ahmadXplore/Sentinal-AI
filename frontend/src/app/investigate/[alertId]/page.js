"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useFetch } from "../../../hooks/useFetch";
import api from "../../../lib/api";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import AIChat from "../../../components/AIChat";
import IncidentReport from "../../../components/IncidentReport";
import InvestigationTimeline from "../../../components/InvestigationTimeline";
import ExplainableAI from "../../../components/ExplainableAI";

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  info: "#6b7280",
};

const TAB_CONFIG = [
  { key: "overview", icon: "📊", label: "Overview" },
  { key: "chat", icon: "🤖", label: "AI Chat" },
  { key: "timeline", icon: "📅", label: "Timeline" },
  { key: "evidence", icon: "🔬", label: "Evidence" },
  { key: "explain", icon: "🧠", label: "Explainability" },
  { key: "report", icon: "📋", label: "Report" },
];

function EvidenceTable({ entries = [] }) {
  const [copied, setCopied] = useState("");

  const copyCell = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(""), 2000);
  };

  if (!entries.length)
    return (
      <div style={{ textAlign: "center", padding: "48px 20px" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔬</div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          No matched evidence entries for this alert.
        </p>
      </div>
    );

  return (
    <div>
      <div
        style={{
          marginBottom: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {entries.length} matched log entries
        </span>
        <button
          onClick={() => {
            const csv = [
              "Timestamp,Severity,Source IP,Dest IP,User,Event Type,Message",
            ]
              .concat(
                entries.map((e) =>
                  [
                    e.timestamp,
                    e.severity,
                    e.sourceIP,
                    e.destinationIP,
                    e.user,
                    e.eventType,
                    `"${(e.message || "").replace(/"/g, '""')}"`,
                  ].join(","),
                ),
              )
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "evidence.csv";
            a.click();
          }}
          style={{
            padding: "6px 14px",
            fontSize: "0.75rem",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "8px",
            color: "#818cf8",
            cursor: "pointer",
          }}
        >
          ⬇ Export CSV
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.78rem",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                "Severity",
                "Timestamp",
                "Source IP",
                "User",
                "Event Type",
                "Message",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(el) =>
                  (el.currentTarget.style.background = "rgba(255,255,255,0.03)")
                }
                onMouseLeave={(el) =>
                  (el.currentTarget.style.background = "transparent")
                }
              >
                <td style={{ padding: "9px 12px" }}>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: SEVERITY_COLORS[e.severity] || "#6b7280",
                      background: `${SEVERITY_COLORS[e.severity] || "#6b7280"}15`,
                      border: `1px solid ${SEVERITY_COLORS[e.severity] || "#6b7280"}30`,
                      padding: "2px 7px",
                      borderRadius: "8px",
                      textTransform: "uppercase",
                    }}
                  >
                    {e.severity || "info"}
                  </span>
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}
                </td>
                <td style={{ padding: "9px 12px" }}>
                  {e.sourceIP ? (
                    <span
                      onClick={() => copyCell(e.sourceIP)}
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "#818cf8",
                        cursor: "pointer",
                      }}
                      title="Click to copy"
                    >
                      {copied === e.sourceIP ? "✓" : ""}
                      {e.sourceIP}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {e.user || "—"}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                  }}
                >
                  {e.eventType || "—"}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    color: "var(--text-primary)",
                    maxWidth: "320px",
                  }}
                >
                  <span
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {e.message || e.rawLine || "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverviewTab({ alert }) {
  const sevColor = SEVERITY_COLORS[alert.severity] || "#6b7280";
  const riskColor =
    alert.riskScore >= 80
      ? "#ef4444"
      : alert.riskScore >= 60
        ? "#f97316"
        : alert.riskScore >= 40
          ? "#eab308"
          : "#22c55e";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "16px",
      }}
    >
      {/* Alert Info */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <h4
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "14px",
          }}
        >
          Alert Details
        </h4>
        {[
          { label: "Rule", value: alert.ruleName },
          {
            label: "Severity",
            value: (
              <span
                style={{
                  color: sevColor,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {alert.severity}
              </span>
            ),
          },
          {
            label: "Risk Score",
            value: (
              <span
                style={{
                  color: riskColor,
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {alert.riskScore}/100
              </span>
            ),
          },
          { label: "Status", value: alert.status?.replace("_", " ") },
          {
            label: "Triggered",
            value: new Date(alert.createdAt).toLocaleString(),
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "7px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              fontSize: "0.82rem",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>{label}</span>
            <span
              style={{
                color: "var(--text-primary)",
                textAlign: "right",
                maxWidth: "60%",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* MITRE ATT&CK */}
      <div
        style={{
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.18)",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <h4
          style={{
            fontSize: "0.75rem",
            color: "#818cf8",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "14px",
          }}
        >
          🗺️ MITRE ATT&CK
        </h4>
        {alert.mitreAttack?.techniqueId ? (
          <>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "#818cf8",
                marginBottom: "6px",
              }}
            >
              {alert.mitreAttack.techniqueId}
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              {alert.mitreAttack.techniqueName}
            </div>
            <a
              href={`https://attack.mitre.org/techniques/${alert.mitreAttack.techniqueId.replace(".", "/")}/`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "0.72rem",
                color: "#818cf8",
                textDecoration: "none",
                borderBottom: "1px dashed rgba(129,140,248,0.5)",
              }}
            >
              View on MITRE ATT&CK ↗
            </a>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
            No MITRE technique mapped
          </p>
        )}
      </div>

      {/* Affected Assets */}
      <div
        style={{
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <h4
          style={{
            fontSize: "0.75rem",
            color: "#ef4444",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "14px",
          }}
        >
          🎯 Affected Assets
        </h4>
        {alert.affectedIPs?.length > 0 && (
          <>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              IP ADDRESSES
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginBottom: "14px",
              }}
            >
              {alert.affectedIPs.map((ip, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    padding: "4px 10px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "8px",
                    color: "#fca5a5",
                  }}
                >
                  {ip}
                </span>
              ))}
            </div>
          </>
        )}
        {alert.affectedUsers?.length > 0 && (
          <>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              USER ACCOUNTS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {alert.affectedUsers.map((u, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "8px",
                    color: "#fca5a5",
                  }}
                >
                  👤 {u}
                </span>
              ))}
            </div>
          </>
        )}
        {!alert.affectedIPs?.length && !alert.affectedUsers?.length && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
            No affected assets recorded
          </p>
        )}
      </div>

      {/* Description */}
      {alert.description && (
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px",
            padding: "20px",
            gridColumn: "1 / -1",
          }}
        >
          <h4
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "12px",
            }}
          >
            📄 Description
          </h4>
          <p
            style={{
              fontSize: "0.85rem",
              lineHeight: "1.7",
              color: "var(--text-primary)",
            }}
          >
            {alert.description}
          </p>
        </div>
      )}

      {/* Analyst Notes */}
      {alert.notes?.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px",
            padding: "20px",
            gridColumn: "1 / -1",
          }}
        >
          <h4
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "12px",
            }}
          >
            📝 Analyst Notes
          </h4>
          {alert.notes.map((note, i) => (
            <div
              key={i}
              style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "8px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  lineHeight: "1.6",
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}
              >
                {note.text}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                — {note.addedBy} · {new Date(note.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InvestigationWorkspace() {
  const params = useParams();
  const alertId = params.alertId;
  const [activeTab, setActiveTab] = useState("overview");
  const [incident, setIncident] = useState(null);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);

  const { data, loading, error } = useFetch(
    () => api.getAlert(alertId),
    [alertId],
  );
  const alert = data?.data?.alert;

  // Load incident report when Report tab is opened
  const loadReport = useCallback(async () => {
    if (reportLoaded) return;
    try {
      const res = await api.getIncidentReport(alertId);
      setIncident(res.data?.incident || null);
    } catch {
      setIncident(null);
    } finally {
      setReportLoaded(true);
    }
  }, [alertId, reportLoaded]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "report" && !reportLoaded) loadReport();
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setReportError(null);
    try {
      const res = await api.generateIncidentReport(alertId);
      setIncident(res.data?.incident);
      setReportLoaded(true);
    } catch (err) {
      setReportError(`Report generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading)
    return (
      <div className="page-container animate-fade-in">
        <div className="loading-center">
          <div className="spinner" />
          <p>Loading investigation workspace...</p>
        </div>
      </div>
    );

  if (error || !alert)
    return (
      <div className="page-container animate-fade-in">
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error || "Alert not found"}</span>
        </div>
        <Link
          href="/alerts"
          style={{
            marginTop: "12px",
            textDecoration: "none",
            color: "var(--accent-primary)",
            fontSize: "0.85rem",
          }}
        >
          ← Back to Alerts
        </Link>
      </div>
    );

  const sevColor = SEVERITY_COLORS[alert.severity] || "#6b7280";

  return (
    <div className="page-container animate-fade-in">
      {/* Breadcrumb */}
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "20px",
          fontSize: "0.8rem",
        }}
      >
        <Link
          href="/alerts"
          style={{ color: "var(--text-muted)", textDecoration: "none" }}
        >
          Alerts
        </Link>
        <span style={{ color: "var(--text-muted)" }}>›</span>
        <Link
          href={`/alerts/${alertId}`}
          style={{ color: "var(--text-muted)", textDecoration: "none" }}
        >
          {alert.ruleName}
        </Link>
        <span style={{ color: "var(--text-muted)" }}>›</span>
        <span style={{ color: "#818cf8" }}>AI Investigation</span>
      </div>

      {/* Page Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "16px",
          padding: "24px 28px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
              }}
            >
              🔍
            </div>
            <div>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>
                AI Investigation Workspace
              </h1>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Powered by Sentinel AI
              </div>
            </div>
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            {alert.ruleName}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              color: sevColor,
              background: `${sevColor}15`,
              border: `1px solid ${sevColor}30`,
              padding: "5px 12px",
              borderRadius: "20px",
            }}
          >
            {alert.severity}
          </span>
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: alert.riskScore >= 70 ? "#ef4444" : "#f59e0b",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "5px 14px",
              borderRadius: "10px",
            }}
          >
            {alert.riskScore}/100
          </span>
          <Link
            href={`/incidents`}
            className="no-print"
            style={{
              padding: "7px 16px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            📋 All Reports
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "20px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.07)",
          padding: "4px",
          overflowX: "auto",
        }}
      >
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            style={{
              padding: "9px 18px",
              borderRadius: "9px",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: "0.82rem",
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "#fff" : "var(--text-muted)",
              background:
                activeTab === tab.key
                  ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                  : "transparent",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow:
                activeTab === tab.key
                  ? "0 2px 10px rgba(99,102,241,0.4)"
                  : "none",
            }}
          >
            <span>{tab.icon}</span> {tab.label}
            {tab.key === "evidence" && alert.matchedEntries?.length > 0 && (
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  background:
                    activeTab === tab.key
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(99,102,241,0.2)",
                  color: activeTab === tab.key ? "#fff" : "#818cf8",
                  padding: "1px 6px",
                  borderRadius: "8px",
                }}
              >
                {alert.matchedEntries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass-card-static" style={{ padding: "24px" }}>
        {activeTab === "overview" && <OverviewTab alert={alert} />}

        {activeTab === "chat" && (
          <AIChat
            contextType="alert"
            contextId={alertId}
            alertName={alert.ruleName}
          />
        )}

        {activeTab === "timeline" && (
          <InvestigationTimeline
            events={incident?.report?.timeline || []}
            matchedEntries={alert.matchedEntries || []}
          />
        )}

        {activeTab === "evidence" && (
          <EvidenceTable entries={alert.matchedEntries || []} />
        )}

        {activeTab === "explain" && <ExplainableAI alertId={alertId} />}

        {activeTab === "report" && (
          <>
            {reportError && (
              <div
                className="alert alert-error"
                style={{ marginBottom: "16px" }}
              >
                <span>⚠️</span>
                <span>{reportError}</span>
              </div>
            )}
            <IncidentReport
              incident={incident}
              alertId={alertId}
              alert={alert}
              onGenerate={handleGenerateReport}
              generating={generating}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function InvestigatePage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "analyst", "viewer"]}>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <InvestigationWorkspace />
        </div>
      </div>
    </ProtectedRoute>
  );
}
