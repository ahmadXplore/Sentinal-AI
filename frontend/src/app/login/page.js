'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

// Only enable Google features when the client ID is properly configured
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CONFIGURED = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('your-');

export default function LoginPage() {
  const { login, verifyOtpLogin, googleLogin, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('registered') === 'true') {
        setSuccess('Registration successful! Log in below — an OTP will be sent to your email.');
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (step === 1) {
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      try {
        const response = await login(email, password);
        if (response.requiresOtp) {
          setOtpToken(response.otpToken);
          setSuccess(response.message || 'OTP sent to your email — check your inbox!');
          setStep(2);
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        setError(err.message || 'Invalid email or password');
      }
    } else if (step === 2) {
      if (!otp) {
        setError('Please enter the OTP');
        setLoading(false);
        return;
      }
      try {
        await verifyOtpLogin(otpToken, otp);
        router.push('/dashboard');
      } catch (err) {
        setError(err.message || 'Invalid or expired OTP. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleGoogleClick = async () => {
    if (!GOOGLE_CONFIGURED) return;
    // Dynamically import to avoid crashes when not configured
    const { useGoogleLogin } = await import('@react-oauth/google');
    // Note: since hooks can't be called conditionally inside a handler,
    // the GoogleSignInButton component handles this internally
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
      background: 'radial-gradient(ellipse at 30% 20%, #0d1a3a 0%, #05070f 60%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(0,112,243,0.12) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(138,43,226,0.08) 0%, transparent 70%)', filter: 'blur(70px)', zIndex: 0 }} />

      <div className="glass-card-static animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
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
            🛡️
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            SentinelAI SOC Portal
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            {step === 1
              ? 'Authenticate to access the operations console'
              : '📧 Check your email inbox for the 6-digit OTP'}
          </p>
        </div>

        {/* Alerts */}
        {success && (
          <div style={{ padding: '11px 14px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontSize: '0.8rem', marginBottom: '18px' }} className="animate-fade-in-up">
            ✅ {success}
          </div>
        )}
        {error && (
          <div style={{ padding: '11px 14px', borderRadius: '8px', background: 'rgba(235,87,87,0.1)', border: '1px solid rgba(235,87,87,0.25)', color: 'var(--color-critical)', fontSize: '0.8rem', marginBottom: '18px' }} className="animate-fade-in-up">
            ⚠️ {error}
          </div>
        )}

        {/* Step 1 — Credentials */}
        {step === 1 && (
          <>
            {/* Google Sign-In — only shown when client ID is configured */}
            {GOOGLE_CONFIGURED && (
              <>
                <GoogleSignInButton
                  loading={googleLoading}
                  setLoading={setGoogleLoading}
                  onSuccess={async (credentialResponse) => {
                    setError('');
                    setGoogleLoading(true);
                    try {
                      await googleLogin(credentialResponse.credential);
                      router.push('/dashboard');
                    } catch (err) {
                      setError(err.message || 'Google sign-in failed.');
                    } finally {
                      setGoogleLoading(false);
                    }
                  }}
                  onError={(msg) => setError(msg)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or continue with email</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="email" style={labelStyle}>Email Address</label>
                <input
                  type="email" id="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@sentinelai.local"
                  style={inputStyle} required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="password" style={labelStyle}>Password</label>
                <input
                  type={showPassword ? 'text' : 'password'} id="password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={inputStyle} required
                />
                <label htmlFor="showPasswordToggle" style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '9px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', userSelect: 'none' }}>
                  <input type="checkbox" id="showPasswordToggle" checked={showPassword} onChange={() => setShowPassword(!showPassword)} style={{ width: '14px', height: '14px', accentColor: 'var(--accent-primary)', cursor: 'pointer', margin: 0 }} />
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
                {loading ? <span className="animate-pulse">⚡ Authenticating...</span> : '🔐 Authenticate Secure Session'}
              </button>
            </form>
          </>
        )}

        {/* Step 2 — OTP */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px', padding: '14px', borderRadius: '10px', background: 'rgba(0,112,243,0.07)', border: '1px solid rgba(0,112,243,0.18)', fontSize: '0.8rem', color: 'rgba(150,200,255,0.85)' }}>
              📨 A 6-digit code was sent to <strong>{email}</strong>. It expires in 5 minutes.
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="otp" style={labelStyle}>One-Time Password (OTP)</label>
              <input
                type="text" id="otp" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="● ● ● ● ● ●"
                maxLength={6}
                style={{ ...inputStyle, fontSize: '1.6rem', letterSpacing: '0.3em', textAlign: 'center', fontWeight: 700 }}
                autoFocus required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #0070f3 0%, #0047ab 100%)',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? <span className="animate-pulse">⚡ Verifying...</span> : '✅ Verify & Access Dashboard'}
            </button>

            <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); setSuccess(''); }} style={{ width: '100%', marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer' }}>
              ← Back to login
            </button>
          </form>
        )}

        {/* Footer */}
        {step === 1 && (
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Need an account?{' '}
            <Link href="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              Register Access
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Separated Google button component — only rendered when GOOGLE_CONFIGURED is true
function GoogleSignInButton({ loading, onSuccess, onError }) {
  const { useGoogleLogin } = require('@react-oauth/google');

  const handleClick = useGoogleLogin({
    onSuccess,
    onError: () => onError('Google sign-in was cancelled or failed.'),
  });

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => handleClick()}
      style={{
        width: '100%',
        padding: '11px 16px',
        borderRadius: '8px',
        background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'var(--text-primary)',
        fontSize: '0.88rem',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
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
