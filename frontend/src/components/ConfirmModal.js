'use client';

import { useEffect, useRef } from 'react';

/**
 * A premium dark-mode glassmorphism modal for confirm/alert dialogs.
 * Props:
 *   isOpen        – boolean
 *   title         – string
 *   message       – string | ReactNode
 *   type          – 'danger' | 'warning' | 'info'  (default: 'danger')
 *   confirmLabel  – string  (default: 'Confirm')
 *   cancelLabel   – string  (default: 'Cancel')
 *   onConfirm     – function called when confirm is clicked
 *   onCancel      – function called when cancel is clicked or backdrop clicked
 *   showCancel    – boolean (default: true)  — false = alert mode
 */
export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message,
  type = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = true,
}) {
  const confirmBtnRef = useRef(null);

  // Focus confirm button when opened
  useEffect(() => {
    if (isOpen && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape' && onCancel) onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const colorMap = {
    danger:  { accent: 'var(--color-critical)', icon: '🗑️',  glow: 'rgba(235,87,87,0.15)' },
    warning: { accent: 'var(--color-high)',     icon: '⚠️',   glow: 'rgba(245,158,11,0.15)' },
    info:    { accent: 'var(--accent-primary)', icon: 'ℹ️',   glow: 'rgba(99,102,241,0.15)' },
  };
  const c = colorMap[type] || colorMap.danger;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.18s ease',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(17,24,39,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: '16px',
          boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 40px ${c.glow}`,
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          animation: 'slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Accent top bar */}
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${c.accent}, transparent)` }} />

        {/* Content */}
        <div style={{ padding: '28px 28px 24px' }}>
          {/* Icon + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: c.glow,
              border: `1px solid ${c.accent}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0,
            }}>
              {c.icon}
            </div>
            <h3 style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.3,
            }}>
              {title}
            </h3>
          </div>

          {/* Message */}
          {message && (
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.55',
              margin: '0 0 24px',
              paddingLeft: '58px',
            }}>
              {message}
            </p>
          )}

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
          }}>
            {showCancel && (
              <button
                onClick={onCancel}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'var(--text-secondary)'; }}
              >
                {cancelLabel}
              </button>
            )}
            <button
              ref={confirmBtnRef}
              onClick={onConfirm}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: `1px solid ${c.accent}50`,
                background: `${c.accent}18`,
                color: c.accent,
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.target.style.background = `${c.accent}30`; }}
              onMouseLeave={e => { e.target.style.background = `${c.accent}18`; }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
