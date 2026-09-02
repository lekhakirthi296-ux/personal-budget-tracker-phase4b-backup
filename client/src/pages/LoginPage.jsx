import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Sparkles, Info } from 'lucide-react';

export default function LoginPage({ onNavigateToRegister }) {
  const { login, loginDemo } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side field validations
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!formData.password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      await login(formData.email.trim(), formData.password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setDemoLoading(true);

    try {
      await loginDemo();
    } catch (err) {
      setError(err.message || 'Demo login failed. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  const isAnyLoading = loading || demoLoading;

  return (
    <div className="auth-card-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <Lock size={24} color="var(--accent-primary)" />
          </div>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Log in to manage your budget and finances securely</p>
        </div>

        {error && (
          <div className="alert-banner alert-danger" id="login-error-alert">
            <AlertCircle size={18} className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address
            </label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="login-email"
                type="email"
                name="email"
                className="form-input"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isAnyLoading}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="login-password"
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isAnyLoading}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn-login-submit"
            className="btn-primary btn-block"
            disabled={isAnyLoading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Logging In...</span>
              </>
            ) : (
              <>
                <span>Login</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Account Quick Access */}
        <div style={{ margin: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              or explore instantly
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          <button
            type="button"
            id="btn-demo-login"
            className="btn-outline btn-block"
            onClick={handleDemoLogin}
            disabled={isAnyLoading}
            style={{
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              background: 'rgba(99, 102, 241, 0.05)',
              fontWeight: 600
            }}
          >
            {demoLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Opening Demo Account...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Try Demo Account</span>
              </>
            )}
          </button>

          <div 
            id="demo-account-notice"
            style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.45rem', 
              padding: '0.5rem 0.75rem', 
              background: 'var(--bg-secondary)', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}
          >
            <Info size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-primary)' }} />
            <span>
              You're using the demo account. Your changes may be shared with other demo users.
            </span>
          </div>
        </div>

        <div className="auth-footer">
          <span>Don't have an account?</span>
          <button
            type="button"
            id="btn-nav-register"
            className="btn-link"
            onClick={onNavigateToRegister}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
