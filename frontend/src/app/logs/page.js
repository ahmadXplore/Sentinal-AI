'use client';

import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import LogUpload from '../../components/LogUpload';
import LogTable from '../../components/LogTable';
import ConfirmModal from '../../components/ConfirmModal';

function LogsContent() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState('');
  const [severity, setSeverity] = useState('');

  // Modal state
  const [modal, setModal] = useState({ open: false, id: null });
  const [alertModal, setAlertModal] = useState({ open: false, message: '' });

  const fetchLogs = () => api.getLogs(page, 15, {
    ...(search && { search }),
    ...(format && { format }),
    ...(severity && { severity }),
  });

  const { data, loading, error, execute: refreshLogs } = useFetch(fetchLogs, [page, format, severity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    refreshLogs();
  };

  const handleUploadSuccess = () => {
    setPage(1);
    refreshLogs();
  };

  // Step 1: user clicks delete → open confirm modal
  const handleDelete = (id) => {
    setModal({ open: true, id });
  };

  // Step 2: user confirms → perform delete
  const handleConfirmDelete = async () => {
    const id = modal.id;
    setModal({ open: false, id: null });
    try {
      await api.deleteLog(id);
      refreshLogs();
    } catch (err) {
      setAlertModal({ open: true, message: err.message || 'Failed to delete log file' });
    }
  };

  const logs = data?.data?.logs || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1>Audit Registry</h1>
        <p>Manage, upload, parse, and analyze security telemetry records</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left column - Log Upload */}
        <div style={{ position: 'sticky', top: '92px' }}>
          <LogUpload onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Right column - Log List with Filter Bar */}
        <div className="glass-card-static" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Ingested Audits ({data?.data?.total || 0})</h3>
            
            {/* Filter Bar */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search filenames..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
              <select
                value={format}
                onChange={(e) => { setFormat(e.target.value); setPage(1); }}
                style={{
                  padding: '8px 14px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Formats</option>
                <option value="syslog">Syslog</option>
                <option value="apache">Apache</option>
                <option value="nginx">Nginx</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="windows_event">Windows Event</option>
              </select>
              <select
                value={severity}
                onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
                style={{
                  padding: '8px 14px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
              <button type="submit" className="btn btn-secondary btn-sm">
                Apply
              </button>
            </form>
          </div>

          {loading ? (
            <div className="loading-center">
              <div className="spinner"></div>
              <p>Fetching audit index...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          ) : (
            <>
              <LogTable logs={logs} onDelete={handleDelete} />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="pagination-btn"
                  >
                    ◀
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`pagination-btn ${page === p ? 'active' : ''}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="pagination-btn"
                  >
                    ▶
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm delete modal */}
      <ConfirmModal
        isOpen={modal.open}
        title="Delete Audit File"
        message="Are you sure you want to permanently delete this log audit file? This will purge all parsed security entries and cannot be undone."
        type="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setModal({ open: false, id: null })}
      />

      {/* Error alert modal */}
      <ConfirmModal
        isOpen={alertModal.open}
        title="Delete Failed"
        message={alertModal.message}
        type="warning"
        confirmLabel="OK"
        showCancel={false}
        onConfirm={() => setAlertModal({ open: false, message: '' })}
        onCancel={() => setAlertModal({ open: false, message: '' })}
      />
    </div>
  );
}

export default function LogsPage() {
  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <LogsContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
