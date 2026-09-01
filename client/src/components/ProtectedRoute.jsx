import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Lock } from 'lucide-react';

/**
 * Protected Route Guard
 * Renders child components only when user is verified and authenticated.
 */
export default function ProtectedRoute({ children, fallback }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-state">
        <RefreshCw size={32} className="animate-spin" color="var(--accent-primary)" />
        <p>Verifying secure session...</p>
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return fallback;
    }

    return (
      <div className="card text-center" style={{ maxWidth: '440px', margin: '3rem auto', textAlign: 'center' }}>
        <div style={{ margin: '0 auto 1rem', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={24} color="var(--danger)" />
        </div>
        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>Authentication Required</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          You must be logged in to access this protected area.
        </p>
      </div>
    );
  }

  return children;
}
