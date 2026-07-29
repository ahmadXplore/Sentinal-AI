'use client';

import { useState, useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import ConfirmModal from '../../components/ConfirmModal';

// ─── Role badge ────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    admin:   { color: 'var(--color-critical)', label: 'Admin' },
    analyst: { color: 'var(--accent-primary)',  label: 'Analyst' },
    viewer:  { color: 'var(--text-muted)',       label: 'Viewer' },
  };
  const c = map[role] || map.viewer;
  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: '20px',
      fontSize: '0.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      background: `${c.color}18`,
      border: `1px solid ${c.color}40`,
      color: c.color,
    }}>
      {c.label}
    </span>
  );
}

// ─── Main admin content ─────────────────────────────────────────────────────
function AdminContent() {
  const fetchUsers = useCallback(() => api.getUsers(), []);
  const { data, loading, error, execute: refresh } = useFetch(fetchUsers, []);

  const [toast, setToast]             = useState(null);       // { msg, type }
  const [deleteModal, setDeleteModal] = useState(null);       // user object
  const [blockModal, setBlockModal]   = useState(null);       // user object
  const [addForm, setAddForm]         = useState({ open: false, username: '', email: '', password: '', role: 'analyst' });
  const [actionLoading, setActionLoading] = useState(null);   // userId of in-progress action

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const users = data?.data?.users || [];

  // ── Change role ──────────────────────────────────────────────────────────
  const handleRoleChange = async (user, role) => {
    setActionLoading(user._id);
    try {
      await api.updateUserRole(user._id, role);
      showToast(`${user.username}'s role updated to ${role}`);
      refresh();
    } catch (e) {
      showToast(e.message || 'Failed to update role', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Block / Unblock ──────────────────────────────────────────────────────
  const handleToggleBlock = async () => {
    const user = blockModal;
    setBlockModal(null);
    setActionLoading(user._id);
    try {
      await api.toggleUserBlock(user._id, user.isActive); // isActive=true → block, isActive=false → unblock
      showToast(`${user.username} ${user.isActive ? 'blocked' : 'unblocked'}`);
      refresh();
    } catch (e) {
      showToast(e.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const user = deleteModal;
    setDeleteModal(null);
    setActionLoading(user._id);
    try {
      await api.deleteUser(user._id);
      showToast(`${user.username} deleted`);
      refresh();
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Add user ─────────────────────────────────────────────────────────────
  const handleAddUser = async (e) => {
    e.preventDefault();
    setActionLoading('new');
    try {
      await api.createUser({
        username: addForm.username,
        email: addForm.email,
        password: addForm.password,
        role: addForm.role,
      });
      showToast(`User '${addForm.username}' created`);
      setAddForm({ open: false, username: '', email: '', password: '', role: 'analyst' });
      refresh();
    } catch (e) {
      showToast(e.message || 'Failed to create user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 9000,
          padding: '12px 20px',
          borderRadius: '10px',
          background: toast.type === 'error' ? 'rgba(235,87,87,0.15)' : 'rgba(34,197,94,0.12)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(235,87,87,0.3)' : 'rgba(34,197,94,0.25)'}`,
          color: toast.type === 'error' ? 'var(--color-critical)' : 'var(--color-low)',
          fontSize: '0.875rem',
          fontWeight: 500,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.2s ease',
          maxWidth: '340px',
        }}>
          {toast.type === 'error' ? '⚠️ ' : '✓ '}{toast.msg}
        </div>
      )}

      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage accounts, roles, and access controls for SentinelAI</p>
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {users.length} user{users.length !== 1 ? 's' : ''} registered
        </span>
        <button
          className="btn btn-primary"
          onClick={() => setAddForm(f => ({ ...f, open: true }))}
        >
          + Add User
        </button>
      </div>

      {/* Add user form */}
      {addForm.open && (
        <div className="glass-card-static animate-fade-in" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '18px' }}>Create New User</h3>
          <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Username</label>
              <input
                required value={addForm.username}
                onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))}
                placeholder="john_doe"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email</label>
              <input
                type="email" required value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder="john@acme.com"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Password</label>
              <input
                type="password" required minLength={6} value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 6 characters"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Role</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                style={inputStyle}
              >
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', gridColumn: 'span 1' }}>
              <button type="submit" className="btn btn-primary" disabled={actionLoading === 'new'} style={{ flex: 1 }}>
                {actionLoading === 'new' ? 'Creating…' : 'Create'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAddForm(f => ({ ...f, open: false }))}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /><p>Loading users…</p></div>
      ) : error ? (
        <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>
      ) : (
        <div className="glass-card-static" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: 'var(--gradient-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                          {user.username[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.username}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{user.email}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user, e.target.value)}
                        disabled={actionLoading === user._id}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.78rem',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value="admin">Admin</option>
                        <option value="analyst">Analyst</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td>
                      {user.isActive ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-low)', fontWeight: 600 }}>● Active</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-critical)', fontWeight: 600 }}>● Blocked</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: user.isActive ? 'var(--color-medium)' : 'var(--color-low)', fontSize: '0.75rem' }}
                          disabled={actionLoading === user._id}
                          onClick={() => setBlockModal(user)}
                          title={user.isActive ? 'Block account' : 'Unblock account'}
                        >
                          {user.isActive ? '🔒 Block' : '🔓 Unblock'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-critical)', fontSize: '0.75rem' }}
                          disabled={actionLoading === user._id}
                          onClick={() => setDeleteModal(user)}
                          title="Delete user"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Block/Unblock confirm */}
      <ConfirmModal
        isOpen={!!blockModal}
        type={blockModal?.isActive ? 'warning' : 'info'}
        title={blockModal?.isActive ? `Block ${blockModal?.username}?` : `Unblock ${blockModal?.username}?`}
        message={
          blockModal?.isActive
            ? `This will immediately revoke ${blockModal?.username}'s access. They will not be able to log in until unblocked.`
            : `${blockModal?.username}'s account will be reactivated and they can log in again.`
        }
        confirmLabel={blockModal?.isActive ? 'Block Account' : 'Unblock Account'}
        onConfirm={handleToggleBlock}
        onCancel={() => setBlockModal(null)}
      />

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteModal}
        type="danger"
        title={`Delete ${deleteModal?.username}?`}
        message={`This will permanently delete the account for ${deleteModal?.email}. This action cannot be undone.`}
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}

const inputStyle = {
  padding: '9px 12px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
};

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <AdminContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
