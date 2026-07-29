'use client';

import { useFetch } from '../../hooks/useFetch';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import StatsCard from '../../components/StatsCard';
import SeverityChart from '../../components/SeverityChart';
import ActivityFeed from '../../components/ActivityFeed';

function DashboardContent() {
  const { data: stats, loading, error } = useFetch(() => api.getDashboardStats(), []);

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg"></div>
        <p>Analyzing network intelligence telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container animate-fade-in">
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>Failed to load dashboard metrics: {error}</span>
        </div>
      </div>
    );
  }

  const apiData = stats?.data || {};
  const overview = apiData.overview || {};
  const severityRaw = apiData.severity || {};

  const totalLogs    = overview.totalLogs    || 0;
  const totalEntries = overview.totalEntries || 0;
  const totalUsers   = overview.totalUsers   || 0;
  const topIps       = apiData.topIPs        || [];       // note: capital P from backend
  const recentActivity = apiData.recentAlerts || [];

  const severityCounts = {
    critical: severityRaw.critical || 0,
    high:     severityRaw.high     || 0,
    medium:   severityRaw.medium   || 0,
    low:      severityRaw.low      || 0,
    info:     severityRaw.info     || 0,
  };

  // Calculate critical alerts count for the metrics card
  const activeAlerts = severityCounts.critical + severityCounts.high;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1>Security Operations Console</h1>
        <p>Live threat matrix and autonomous log analysis logs dashboard</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="stats-grid stagger-children">
        <StatsCard
          label="Ingested Files"
          value={totalLogs}
          icon="📋"
          trend="+12%"
          color="var(--accent-primary)"
        />
        <StatsCard
          label="Parsed Entries"
          value={totalEntries}
          icon="📟"
          trend="+28%"
          color="var(--accent-secondary)"
        />
        <StatsCard
          label="Active Alerts"
          value={activeAlerts}
          icon="🚨"
          trend="+5%"
          color="var(--color-critical)"
        />
        <StatsCard
          label="Suspect Source IPs"
          value={topIps.length}
          icon="🌐"
          trend="-2%"
          color="var(--color-medium)"
        />
      </div>

      {/* Charts & Top IPs Row */}
      <div className="grid-2 stagger-children" style={{ marginBottom: '24px' }}>
        <div className="glass-card-static" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '18px' }}>Anomaly Severity Matrix</h3>
          <SeverityChart severity={severityCounts} />
        </div>

        <div className="glass-card-static" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '18px' }}>High-Frequency Traffic Sources</h3>
          {topIps.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="empty-state-icon" style={{ fontSize: '1.5rem' }}>🌐</div>
              <h3>No traffic sources found</h3>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Events Count</th>
                    <th>Density</th>
                  </tr>
                </thead>
                <tbody>
                  {topIps.slice(0, 5).map((item, idx) => {
                    const maxCount = Math.max(...topIps.map(x => x.count)) || 1;
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <tr key={idx}>
                        <td className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.ip}
                        </td>
                        <td className="mono">{item.count.toLocaleString()}</td>
                        <td style={{ width: '40%' }}>
                          <div style={{
                            height: '5px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                            width: '100%',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${percentage}%`,
                              background: 'var(--accent-primary)',
                              borderRadius: 'var(--radius-full)',
                            }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Feed Row */}
      <div className="grid-2 stagger-children">
        <div className="glass-card-static" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '18px' }}>Real-time Threat Activity Feed</h3>
          <ActivityFeed alerts={recentActivity} />
        </div>

        <div className="glass-card-static" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '18px' }}>Autonomous Guard Status</h3>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '20px',
          }}>
            <div style={{
              fontSize: '2.5rem',
              marginBottom: '16px',
              animation: 'float 3s ease-in-out infinite',
            }}>
              🛡️
            </div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '6px', fontSize: '0.95rem' }}>AI Auditing Engine Online</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '280px', lineHeight: '1.4' }}>
              Qwen 2.5 3B local node is active. Log uploads will automatically index for cybersecurity assessments.
            </p>
            <div style={{
              marginTop: '16px',
              padding: '6px 12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              color: 'var(--color-low)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Active & Healthy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <DashboardContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
