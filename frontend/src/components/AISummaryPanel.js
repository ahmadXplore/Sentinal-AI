"use client";

import { useState, useEffect, useRef } from "react";
import api from "../lib/api";

export default function AISummaryPanel({
  logId,
  initialSummary,
  onSummaryGenerated,
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview, activities, actions
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setElapsed(0);

    // Start elapsed-time counter
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    try {
      const response = await api.summarizeLog(logId);
      setSummary(response.data?.summary || response.data);
      if (onSummaryGenerated) {
        onSummaryGenerated(response.data?.summary || response.data);
      }
    } catch (err) {
      setError(err.message || "Failed to generate AI summary");
    } finally {
      clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  const renderLoading = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div
        className="shimmer-pulse"
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "var(--accent-primary)",
          boxShadow: "0 0 15px var(--accent-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "1.5rem",
          marginBottom: "20px",
        }}
      >
        🤖
      </div>
      <h4 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>
        Analyzing Log Patterns
      </h4>
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--text-muted)",
          maxWidth: "300px",
          lineHeight: "1.4",
          marginBottom: "12px",
        }}
        className="animate-pulse"
      >
        Calling SentinelAI... correlating anomalies, identifying threat vectors,
        and extracting suspicious IPs...
      </p>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--accent-primary)",
          fontFamily: "var(--font-mono)",
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "20px",
          padding: "4px 14px",
        }}
      >
        ⏱ {elapsed}s / 120s max
      </div>
    </div>
  );

  const renderEmpty = () => (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        background: "rgba(255, 255, 255, 0.01)",
        border: "1px dashed rgba(255, 255, 255, 0.08)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div style={{ fontSize: "2rem", marginBottom: "14px" }}>🛡️</div>
      <h4 style={{ marginBottom: "6px", fontWeight: 600 }}>
        No Security Assessment Yet
      </h4>
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--text-muted)",
          marginBottom: "18px",
          maxWidth: "320px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Run SentinelAI's security model to parse this log for security
        issues and anomalies.
      </p>
      <button
        onClick={handleGenerate}
        className="btn btn-primary"
        style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
      >
        <span>🤖</span> Generate Security Report
      </button>
    </div>
  );

  if (loading)
    return (
      <div
        className="glass-card-static"
        style={{
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {renderLoading()}
      </div>
    );

  if (!summary)
    return (
      <div className="glass-card-static" style={{ padding: "24px" }}>
        <h3 style={{ marginBottom: "16px", fontSize: "1rem", fontWeight: 600 }}>
          AI Threat Assessment
        </h3>
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(235, 87, 87, 0.1)",
              border: "1px solid rgba(235, 87, 87, 0.2)",
              color: "var(--color-critical)",
              fontSize: "0.8rem",
              marginBottom: "16px",
            }}
          >
            ⚠️ {error}
          </div>
        )}
        {renderEmpty()}
      </div>
    );

  // Parse structured data from summary
  const highlights = summary.highlights || [];
  const suspiciousActivities = summary.suspiciousActivities || [];
  const recommendedActions = summary.recommendedActions || [];

  return (
    <div
      className="glass-card-static"
      style={{ padding: "0", overflow: "hidden" }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.01)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.25rem" }}>🤖</span>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
              SentinelAI Cyber Threat Assessment
            </h3>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Analyzed{" "}
              {new Date(
                summary.generatedAt || summary.createdAt,
              ).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          className="btn btn-ghost btn-sm"
          style={{
            border: "1px solid rgba(255, 255, 255, 0.1)",
            fontSize: "0.75rem",
          }}
        >
          🔄 Re-analyze
        </button>
      </div>

      {error && (
        <div
          style={{
            margin: "16px 24px 0 24px",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(235, 87, 87, 0.1)",
            border: "1px solid rgba(235, 87, 87, 0.2)",
            color: "var(--color-critical)",
            fontSize: "0.8rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          padding: "0 24px",
        }}
      >
        {["overview", "activities", "actions"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "14px 16px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
              color:
                activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "0.8rem",
              fontWeight: activeTab === tab ? 600 : 500,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "var(--transition-all)",
            }}
          >
            {tab === "actions"
              ? "Remediation Steps"
              : tab === "activities"
                ? "Suspicious Indicators"
                : "Summary Overview"}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px" }}>
        {activeTab === "overview" && (
          <div className="animate-fade-in">
            <h4
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                marginBottom: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Executive Analysis
            </h4>
            <p
              style={{
                fontSize: "0.85rem",
                lineHeight: "1.6",
                color: "var(--text-primary)",
                whiteSpace: "pre-line",
                marginBottom: "24px",
              }}
            >
              {summary.summary}
            </p>

            {highlights.length > 0 && (
              <>
                <h4
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Key Log Findings
                </h4>
                <ul style={{ paddingLeft: "18px", margin: 0 }}>
                  {highlights.map((h, idx) => (
                    <li
                      key={idx}
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-primary)",
                        marginBottom: "8px",
                        lineHeight: "1.5",
                      }}
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {activeTab === "activities" && (
          <div className="animate-fade-in">
            <h4
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                marginBottom: "14px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Threat Indicators & Anomalies
            </h4>
            {suspiciousActivities.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                No high-priority suspicious activities detected.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {suspiciousActivities.map((act, idx) => {
                  const hasSeverity = typeof act === "object" && act.severity;
                  const severity = hasSeverity
                    ? act.severity.toLowerCase()
                    : "medium";
                  const title = hasSeverity ? act.description : act;
                  const ip = hasSeverity ? act.ip : "";

                  const colorMap = {
                    critical: "var(--color-critical)",
                    high: "var(--color-high)",
                    medium: "var(--color-medium)",
                    low: "var(--color-low)",
                  };
                  const color = colorMap[severity] || "var(--color-medium)";

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "var(--radius-sm)",
                        background: `${color}08`,
                        borderLeft: `3px solid ${color}`,
                        border: `1px solid ${color}15`,
                        borderLeftWidth: "3px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {title}
                        </span>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            padding: "2px 6px",
                            borderRadius: "var(--radius-full)",
                            background: `${color}15`,
                            color: color,
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {severity}
                        </span>
                      </div>
                      {ip && (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          <span>
                            IP Source:{" "}
                            <span
                              className="mono"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {ip}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "actions" && (
          <div className="animate-fade-in">
            <h4
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                marginBottom: "14px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Incident Response & Mitigation
            </h4>
            {recommendedActions.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                No remediation steps suggested.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {recommendedActions.map((action, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "12px",
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(255, 255, 255, 0.01)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "rgba(0, 112, 243, 0.1)",
                        color: "var(--accent-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-primary)",
                        lineHeight: "1.4",
                      }}
                    >
                      {action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
