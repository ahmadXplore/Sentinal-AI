'use client';

import { useEffect, useRef, useState } from 'react';

export default function StatsCard({ label, value, icon, trend, color = 'var(--accent-primary)' }) {
  const [displayValue, setDisplayValue] = useState(0);
  const cardRef = useRef(null);

  // Animated counter
  useEffect(() => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setDisplayValue(value);
      return;
    }

    let start = 0;
    const duration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * numValue);
      setDisplayValue(current.toLocaleString());

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [value]);

  return (
    <div
      ref={cardRef}
      className="glass-card animate-fade-in-up"
      style={{
        padding: '22px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent glow */}
      <div style={{
        position: 'absolute',
        top: '-30px',
        right: '-30px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: color,
        opacity: 0.06,
        filter: 'blur(20px)',
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '14px',
      }}>
        <div style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {label}
        </div>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          border: `1px solid ${color}25`,
        }}>
          {icon}
        </div>
      </div>

      <div style={{
        fontSize: '2rem',
        fontWeight: 800,
        color: 'var(--text-primary)',
        lineHeight: 1,
        marginBottom: '8px',
        fontFamily: 'var(--font-primary)',
      }}>
        {displayValue}
      </div>

      {trend && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.75rem',
          fontWeight: 500,
          color: trend.startsWith('+') ? 'var(--color-low)' : trend.startsWith('-') ? 'var(--color-critical)' : 'var(--text-muted)',
        }}>
          {trend.startsWith('+') ? '↑' : trend.startsWith('-') ? '↓' : '→'} {trend}
        </div>
      )}
    </div>
  );
}
