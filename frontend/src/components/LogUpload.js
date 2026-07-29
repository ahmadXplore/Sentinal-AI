'use client';

import { useState, useRef } from 'react';
import api from '../lib/api';

export default function LogUpload({ onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setError('');
    setProgress(15);
    
    // Simulate upload progress since fetch doesn't natively support it easily without custom XHR
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const response = await api.uploadLog(file);
      setProgress(100);
      clearInterval(interval);
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        if (onUploadSuccess) onUploadSuccess(response);
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
      setError(err.message || 'Failed to upload log file');
    }
  };

  return (
    <div className="glass-card-static" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '14px', fontSize: '1rem', fontWeight: 600 }}>Log Ingestion</h3>
      
      <form 
        onDragEnter={handleDrag} 
        onSubmit={(e) => e.preventDefault()}
        style={{ width: '100%' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="input-file-upload"
          multiple={false}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        
        <div 
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          style={{
            border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'var(--transition-all)',
            background: dragActive ? 'rgba(0, 112, 243, 0.05)' : 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {uploading ? (
            <div style={{ width: '100%', maxWidth: '240px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }} className="animate-pulse">📤</div>
              <p style={{ fontSize: '0.85rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
                Ingesting and parsing log file... {progress}%
              </p>
              <div style={{
                height: '4px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                width: '100%',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'var(--accent-primary)',
                  boxShadow: '0 0 10px var(--accent-primary)',
                  transition: 'width 0.2s ease',
                }} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>📥</div>
              <p style={{ fontSize: '0.88rem', fontWeight: 500, marginBottom: '6px' }}>
                Drag and drop your security log here, or <span style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>browse files</span>
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Supports Syslog, Apache/Nginx, Windows Event Logs (JSON), CSV, JSON
              </p>
            </>
          )}
        </div>
      </form>

      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(235, 87, 87, 0.1)',
          border: '1px solid rgba(235, 87, 87, 0.2)',
          color: 'var(--color-critical)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }} className="animate-fade-in-up">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{
        marginTop: '18px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--accent-primary)' }}>•</span>
          <span>Automatic format auto-detection</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--accent-primary)' }}>•</span>
          <span>Log normalization to Unified Schema</span>
        </div>
      </div>
    </div>
  );
}
