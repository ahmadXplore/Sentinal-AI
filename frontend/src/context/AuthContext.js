'use client';

import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage
  // Initialize from localStorage and verify with backend
  useEffect(() => {
    const verifyUser = async () => {
      const savedToken = localStorage.getItem('sentinelai_token');
      const savedUser = localStorage.getItem('sentinelai_user');

      if (savedToken && savedUser) {
        try {
          // Optimistic UI load
          setToken(savedToken);
          setUser(JSON.parse(savedUser));

          // Verify with backend
          const response = await api.verifyToken();
          const trueUser = response.data.user;
          setUser(trueUser);
          localStorage.setItem('sentinelai_user', JSON.stringify(trueUser));
        } catch (e) {
          // Token invalid, expired, or user blocked/deleted
          setToken(null);
          setUser(null);
          localStorage.removeItem('sentinelai_token');
          localStorage.removeItem('sentinelai_user');
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.login(email, password);
    
    // If login requires OTP, just return the response to the UI
    if (response.requiresOtp) {
      return response;
    }

    const { user: userData, token: newToken } = response.data;

    setUser(userData);
    setToken(newToken);
    localStorage.setItem('sentinelai_token', newToken);
    localStorage.setItem('sentinelai_user', JSON.stringify(userData));

    return response;
  }, []);

  const verifyOtpLogin = useCallback(async (otpToken, otp) => {
    const response = await api.verifyOtp(otpToken, otp);
    const { user: userData, token: newToken } = response.data;

    setUser(userData);
    setToken(newToken);
    localStorage.setItem('sentinelai_token', newToken);
    localStorage.setItem('sentinelai_user', JSON.stringify(userData));

    return response;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const response = await api.googleLogin(credential);
    const { user: userData, token: newToken } = response.data;

    setUser(userData);
    setToken(newToken);
    localStorage.setItem('sentinelai_token', newToken);
    localStorage.setItem('sentinelai_user', JSON.stringify(userData));

    return response;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const response = await api.register(username, email, password);
    // Registration now requires the user to login manually to verify email via OTP
    return response;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('sentinelai_token');
    localStorage.removeItem('sentinelai_user');
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    verifyOtpLogin,
    googleLogin,
    register,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isAnalyst: user?.role === 'analyst' || user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
