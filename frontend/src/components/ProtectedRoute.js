'use client';

import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }

    if (!loading && isAuthenticated && allowedRoles && !allowedRoles.includes(user?.role)) {
      router.push('/dashboard');
    }
  }, [loading, isAuthenticated, user, allowedRoles, router]);

  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timeoutId;
    if (loading) {
      timeoutId = setTimeout(() => setShowLoading(true), 200); // 200ms debounce
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timeoutId);
  }, [loading]);

  if (loading && showLoading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (loading) return null; // Avoid flash for quick loads

  if (!isAuthenticated) return null;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return null;

  return children;
}
