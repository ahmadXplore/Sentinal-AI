'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CONFIGURED = Boolean(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('your-'));

export default function RegisterPage() {
  const { register, googleLogin, isAuthenticated, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(username, email, password);
      router.push('/login?registered=true');
    } catch (err) {
      setError(err.message || 'Registration failed. Email might already be taken.');
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setGoogleLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 70% 20%, #0d1a3a 0%, #05070f 60%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '25%', right: '10%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(0,112,243,0.12) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(138,43,226,0.08) 0%, transparent 70%)', filter: 'blur(70px)', zIndex: 0 }} />

      <div className="glass-card-static animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px 36px',
        zIndex: 1,
        boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 0 1px rgba(255,255,255,0.08)',
        position: 'relative',
        borderRadius: '20px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #0070f3 0%, #0047ab 100%)',
            boxShadow: '0 0 24px rgba(0,112,243,0.5)',
            fontSize: '1.7rem', marginBottom: '14px',
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            Register SOC Operator
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Initialize your security identity to audit the console
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '11px 14px', borderRadius: '8px', background: 'rgba(235,87,87,0.1)', border: '1px solid rgba(235,87,87,0.25)', color: 'var(--color-critical)', fontSize: '0.8rem', marginBottom: '18px' }} className="animate-fade-in-up">
            ⚠️ {error}
          </div>
        )}

        {/* Google Sign-In — only shown when client ID is configured */}
        {GOOGLE_CONFIGURED && (
          <>
            <GoogleSignInButton
              loading={googleLoading}
              onSuccess={handleGoogleSuccess}
              onError={(msg) => setError(msg)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or register with email</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="username" style={labelStyle}>Operator Handle (Username)</label>
            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. analyst_john" style={inputStyle} required />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={labelStyle}>Email Address</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@company.com" style={inputStyle} required />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
              📧 OTP verification codes will be sent here when you log in.
            </p>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label htmlFor="password" style={labelStyle}>Access Key (Password)</label>
            <input
              type={showPassword ? 'text' : 'password'} id="password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••" style={inputStyle} required
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
              Min 8 chars · uppercase · lowercase · number · special char
            </p>
            <label htmlFor="showPasswordToggleReg" style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '9px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', userSelect: 'none' }}>
              <input type="checkbox" id="showPasswordToggleReg" checked={showPassword} onChange={() => setShowPassword(!showPassword)} style={{ width: '14px', height: '14px', accentColor: 'var(--accent-primary)', cursor: 'pointer', margin: 0 }} />
              Show password
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{
            width: '100%', padding: '12px', borderRadius: '8px',
            fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #0070f3 0%, #0047ab 100%)',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? <span className="animate-pulse">⚡ Creating Account...</span> : '🚀 Register & Initialize Key'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Already authorized?{' '}
          <Link href="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Log In</Link>
        </div>
      </div>
    </div>
  );
}

// This component safely uses useGoogleLogin — it is only rendered when GOOGLE_CONFIGURED is true,
// meaning GoogleOAuthProvider is guaranteed to be present in the tree.
function GoogleSignInButton({ loading, onSuccess, onError }) {
  const { useGoogleLogin } = require('@react-oauth/google');
  const handleClick = useGoogleLogin({
    onSuccess,
    onError: () => onError('Google sign-in was cancelled or failed.'),
  });

  return (
    <button type="button" disabled={loading} onClick={() => handleClick()} style={{
      width: '100%', padding: '11px 16px', borderRadius: '8px',
      background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
      cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
    }}>
      {loading ? <span className="animate-pulse">Connecting to Google...</span> : <><GoogleIcon /> Continue with Google</>}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6151z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2582c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.036-3.7105H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5814-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
    </svg>
  );
}
