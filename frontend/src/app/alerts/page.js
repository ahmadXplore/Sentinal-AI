"use client";

import { useState, useCallback, useEffect } from "react";
import { useFetch } from "../../hooks/useFetch";
import Link from "next/link";
import api from "../../lib/api";
import ProtectedRoute from "../../components/ProtectedRoute";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import MitreMatrix from "../../components/MitreMatrix";
import { useAuth } from "../../hooks/useAuth";

function AlertsContent() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("table"); // 'table' | 'mitre'

  const fetchAlerts = useCallback(
    () =>
      api.getAlerts(page, 20, {
        ...(statusFilter && { status: statusFilter }),
        ...(severityFilter && { severity: severityFilter }),
        ...(search && { search }),
      }),
    [page, statusFilter, severityFilter, search],
  );

  const {
    data,
    loading,
    error,
    execute: refresh,
  } = useFetch(fetchAlerts, [page, statusFilter, severityFilter, search]);

  const alerts = data?.data?.alerts || [];
  const pagination = data?.data?.pagination || {};
  const summary = data?.data?.summary || {};

  // For MITRE matrix — fetch all alerts (up to 200) without pagination filters
  const { data: allAlertsData } = useFetch(() => api.getAlerts(1, 200), []);
  const allAlerts = allAlertsData?.data?.alerts || [];

  const getSeverityStyle = (sev = "") => {
    const map = {
      critical: "severity-critical",
      high: "severity-high",
      medium: "severity-medium",
      low: "severity-low",
      info: "severity-info",
    };
    return map[sev.toLowerCase()] || "";
  };

  const getStatusColor = (status = "") => {
    const map = {
      open: "#ef4444",
      investigating: "#f59e0b",
      resolved: "#22c55e",
      false_positive: "#6b7280",
    };
    return map[status] || "#6b7280";
  };

  const getStatusLabel = (status = "") => {
    const map = {
      open: "Open",
      investigating: "Investigating",
      resolved: "Resolved",
      false_positive: "False Positive",
    };
    return map[status] || status;
  };

  const getRiskColor = (score) => {
    if (score >= 80) return "#ef4444";
    if (score >= 60) return "#f97316";
    if (score >= 40) return "#eab308";
    if (score >= 20) return "#3b82f6";
    return "#6b7280";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    refresh();
  };

  const statCards = [
    {
      label: "Total Alerts",
      value: summary.total || 0,
      icon: "🔔",
      gradient:
        "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))",
      border: "rgba(99, 102, 241, 0.3)",
    },
    {
      label: "Open",
      value: summary.open || 0,
      icon: "🚨",
      gradient:
        "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))",
      border: "rgba(239, 68, 68, 0.3)",
    },
    {
      label: "Investigating",
      value: summary.investigating || 0,
      icon: "🔍",
      gradient:
        "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))",
      border: "rgba(245, 158, 11, 0.3)",
    },
    {
      label: "Critical Severity",
      value: summary.critical || 0,
      icon: "💀",
      gradient:
        "linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(220, 38, 38, 0.05))",
      border: "rgba(220, 38, 38, 0.4)",
    },
    {
      label: "High Severity",
      value: summary.high || 0,
      icon: "⚠️",
      gradient:
        "linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.05))",
      border: "rgba(249, 115, 22, 0.3)",
    },
    {
      label: "Resolved",
      value: summary.resolved || 0,
      icon: "✅",
      gradient:
        "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))",
      border: "rgba(34, 197, 94, 0.3)",
    },
  ];

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1>Threat Alerts Command Center</h1>
        <p>
          Real-time security alert monitoring, triage, and incident response
          management.
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {statCards.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: stat.gradient,
              borderRadius: "var(--radius-md)",
              border: `1px solid ${stat.border}`,
              padding: "18px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              transition: "all 0.25s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {stat.label}
              </span>
              <span style={{ fontSize: "1.3rem" }}>{stat.icon}</span>
            </div>
            <span
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "var(--text-primary)",
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "20px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-primary)",
          padding: "4px",
          width: "fit-content",
        }}
      >
        {[
          { key: "table", label: "📋 Alert Feed" },
          { key: "mitre", label: "🗺️ MITRE ATT&CK Matrix" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 18px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? "#fff" : "var(--text-secondary)",
              background:
                activeTab === tab.key
                  ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                  : "transparent",
              transition: "all 0.2s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MITRE Matrix Tab */}
      {activeTab === "mitre" && (
        <div
          className="glass-card-static animate-fade-in"
          style={{ padding: "24px" }}
        >
          <MitreMatrix alerts={allAlerts} />
        </div>
      )}

      {/* Alert Feed Tab */}
      {activeTab === "table" && (
        <>
          {/* Filter Controls */}
          <div
            className="glass-card-static"
            style={{
              padding: "16px 20px",
              marginBottom: "16px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <form
              onSubmit={handleSearchSubmit}
              style={{
                display: "flex",
                gap: "10px",
                flex: 1,
                minWidth: "200px",
              }}
            >
              <input
                placeholder="Search alerts by name, IP, user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 14px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.82rem",
                  outline: "none",
                }}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Search
              </button>
            </form>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 12px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-primary)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                outline: "none",
              }}
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 12px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-primary)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                outline: "none",
              }}
            >
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Alerts Table */}
          {loading ? (
            <div className="loading-center">
              <div className="spinner"></div>
              <p>Loading threat alerts...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
              <h3>No Threats Detected</h3>
              <p style={{ fontSize: "0.85rem" }}>
                Upload log files to trigger the detection engine and generate
                alerts.
              </p>
            </div>
          ) : (
            <div className="glass-card-static" style={{ overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Alert</th>
                      <th>Severity</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                      <th>MITRE Technique</th>
                      <th>Affected Targets</th>
                      <th>Triggered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr key={alert._id}>
                        {/* Alert Name & Description */}
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "3px",
                              maxWidth: "280px",
                            }}
                          >
                            <Link
                              href={`/alerts/${alert._id}`}
                              style={{
                                fontWeight: 600,
                                fontSize: "0.86rem",
                                color: "var(--accent-primary-hover)",
                                textDecoration: "none",
                              }}
                            >
                              {alert.ruleName}
                            </Link>
                            <span
                              style={{
                                fontSize: "0.72rem",
                                color: "var(--text-muted)",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {alert.description}
                            </span>
                          </div>
                        </td>

                        {/* Severity */}
                        <td>
                          <span
                            className={`severity-badge ${getSeverityStyle(alert.severity)}`}
                            style={{ fontSize: "0.66rem" }}
                          >
                            {alert.severity}
                          </span>
                        </td>

                        {/* Risk Score */}
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "48px",
                                height: "6px",
                                borderRadius: "3px",
                                background: "rgba(255,255,255,0.06)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${alert.riskScore}%`,
                                  height: "100%",
                                  borderRadius: "3px",
                                  background: getRiskColor(alert.riskScore),
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: "0.82rem",
                                fontWeight: 700,
                                fontFamily: "var(--font-mono)",
                                color: getRiskColor(alert.riskScore),
                              }}
                            >
                              {alert.riskScore}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              color: getStatusColor(alert.status),
                              background: `${getStatusColor(alert.status)}15`,
                              border: `1px solid ${getStatusColor(alert.status)}30`,
                              padding: "3px 10px",
                              borderRadius: "var(--radius-full)",
                              textTransform: "capitalize",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: getStatusColor(alert.status),
                                display: "inline-block",
                                animation:
                                  alert.status === "open"
                                    ? "pulse-dot 2s infinite"
                                    : "none",
                              }}
                            />
                            {getStatusLabel(alert.status)}
                          </span>
                        </td>

                        {/* MITRE Technique */}
                        <td>
                          {alert.mitreAttack?.techniqueId ? (
                            <span
                              className="mono"
                              style={{
                                fontSize: "0.72rem",
                                background: "rgba(255,255,255,0.04)",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              {alert.mitreAttack.techniqueId}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "0.75rem",
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>

                        {/* Affected IPs */}
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            {(alert.affectedIPs || [])
                              .slice(0, 2)
                              .map((ip, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: "0.72rem",
                                    fontFamily: "var(--font-mono)",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  {ip}
                                </span>
                              ))}
                            {(alert.affectedIPs || []).length > 2 && (
                              <span
                                style={{
                                  fontSize: "0.66rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                +{alert.affectedIPs.length - 2} more
                              </span>
                            )}
                            {(!alert.affectedIPs ||
                              alert.affectedIPs.length === 0) && (
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                —
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {formatDate(alert.createdAt)}
                          </span>
                        </td>

                        {/* Action */}
                        <td>
                          <Link
                            href={`/alerts/${alert._id}`}
                            className="btn btn-primary btn-sm"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: "140px",
                              fontSize: "0.76rem",
                              color: "#fff",
                              textDecoration: "none",
                              cursor: "pointer",
                            }}
                          >
                            Investigate →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 20px",
                    borderTop: "1px solid var(--border-primary)",
                  }}
                >
                  <span
                    style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}
                  >
                    Page {pagination.page} of {pagination.pages} (
                    {pagination.total} alerts)
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
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
        </>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "analyst", "viewer"]}>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <AlertsContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
