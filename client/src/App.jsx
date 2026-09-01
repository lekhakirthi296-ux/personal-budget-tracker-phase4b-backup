import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetsPage from './pages/BudgetsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { 
  DollarSign, 
  ShieldCheck, 
  Activity, 
  Database, 
  Server, 
  RefreshCw, 
  CheckCircle2, 
  User, 
  LogOut, 
  Receipt,
  LayoutDashboard,
  Layers,
  ArrowRight,
  Target
} from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'transactions' | 'budgets' | 'diagnostics'

  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    data: null,
    error: null,
    latency: null
  });

  const checkHealth = async () => {
    setHealthStatus((prev) => ({ ...prev, loading: true, error: null }));
    const startTime = performance.now();
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (response.ok && data.success) {
        setHealthStatus({
          loading: false,
          data,
          error: null,
          latency
        });
      } else {
        setHealthStatus({
          loading: false,
          data: null,
          error: data.message || `HTTP ${response.status}`,
          latency
        });
      }
    } catch (err) {
      const endTime = performance.now();
      setHealthStatus({
        loading: false,
        data: null,
        error: err.message || 'Unable to connect to backend server',
        latency: Math.round(endTime - startTime)
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <DollarSign size={24} color="#ffffff" />
          </div>
          <div className="brand-text">
            <h1>Personal Budget Tracker</h1>
            <p>Full-Stack Personal Finance & Spending Intelligence System</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Phase Badge */}
          <div className="badge-phase">
            <span className="pulse-dot"></span>
            Phase 4: Budget Tracking
          </div>

          {/* Navigation Controls */}
          {isAuthenticated ? (
            <div className="nav-group">
              <button
                id="tab-dashboard"
                className={`nav-pill-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </button>

              <button
                id="tab-transactions"
                className={`nav-pill-btn ${activeTab === 'transactions' ? 'active' : ''}`}
                onClick={() => setActiveTab('transactions')}
              >
                <Receipt size={15} />
                <span>Transactions</span>
              </button>

              <button
                id="tab-budgets"
                className={`nav-pill-btn ${activeTab === 'budgets' ? 'active' : ''}`}
                onClick={() => setActiveTab('budgets')}
              >
                <Target size={15} />
                <span>Budgets</span>
              </button>

              <button
                id="tab-diagnostics"
                className={`nav-pill-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
                onClick={() => setActiveTab('diagnostics')}
              >
                <Activity size={15} />
                <span>System Health</span>
              </button>

              <button
                id="header-btn-logout"
                className="btn-outline"
                onClick={logout}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="nav-group">
              <button
                id="tab-diagnostics"
                className={`nav-pill-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
                onClick={() => setActiveTab('diagnostics')}
              >
                <Activity size={15} />
                <span>System Health</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {!isAuthenticated ? (
        activeTab === 'diagnostics' ? (
          <DiagnosticsView healthStatus={healthStatus} onRecheck={checkHealth} />
        ) : authView === 'login' ? (
          <LoginPage onNavigateToRegister={() => setAuthView('register')} />
        ) : (
          <RegisterPage onNavigateToLogin={() => setAuthView('login')} />
        )
      ) : activeTab === 'dashboard' ? (
        <ProtectedRoute>
          <DashboardPage
            onNavigateToTransactions={() => setActiveTab('transactions')}
            onNavigateToBudgets={() => setActiveTab('budgets')}
          />
        </ProtectedRoute>
      ) : activeTab === 'transactions' ? (
        <ProtectedRoute>
          <TransactionsPage />
        </ProtectedRoute>
      ) : activeTab === 'budgets' ? (
        <ProtectedRoute>
          <BudgetsPage />
        </ProtectedRoute>
      ) : (
        <DiagnosticsView healthStatus={healthStatus} onRecheck={checkHealth} />
      )}

      {/* App Footer */}
      <footer className="app-footer">
        <div>
          <span>Personal Budget Tracker &bull; Phase 4 Budget Tracking</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Financial Calculations & Isolation Active</span>
          <ArrowRight size={14} />
        </div>
      </footer>
    </div>
  );
}

function DiagnosticsView({ healthStatus, onRecheck }) {
  return (
    <div className="diagnostics-tab-content">
      <section className="hero-banner">
        <h2 className="hero-title">System Diagnostics & API Status</h2>
        <p className="hero-subtitle">
          Real-time server connectivity, database schema verification, and REST routing endpoints map.
        </p>
      </section>

      <div className="grid-2col">
        {/* Live Health Check Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon">
              <Activity size={20} />
            </div>
            <h3 className="card-title">Live API Health Check</h3>
          </div>

          <div className="health-status-box">
            <div className="status-row">
              <span className="status-label">Target Endpoint:</span>
              <span className="status-value">GET /api/health</span>
            </div>
            <div className="status-row">
              <span className="status-label">Connection Status:</span>
              {healthStatus.loading ? (
                <span className="status-badge checking">Testing...</span>
              ) : healthStatus.error ? (
                <span className="status-badge offline">Offline / Error</span>
              ) : (
                <span className="status-badge online">Operational (200 OK)</span>
              )}
            </div>
            {healthStatus.latency !== null && (
              <div className="status-row">
                <span className="status-label">Latency:</span>
                <span className="status-value">{healthStatus.latency} ms</span>
              </div>
            )}
          </div>

          <div className="code-box" style={{ marginBottom: '1rem' }}>
            {healthStatus.loading ? (
              <span style={{ color: 'var(--text-muted)' }}>// Querying server...</span>
            ) : healthStatus.error ? (
              <span style={{ color: 'var(--danger)' }}>
                {JSON.stringify({ success: false, error: healthStatus.error }, null, 2)}
              </span>
            ) : (
              <span style={{ color: 'var(--success)' }}>
                {JSON.stringify(healthStatus.data, null, 2)}
              </span>
            )}
          </div>

          <button 
            id="btn-recheck-health"
            className="btn-primary" 
            onClick={onRecheck}
            disabled={healthStatus.loading}
            style={{ marginTop: 'auto' }}
          >
            <RefreshCw size={16} className={healthStatus.loading ? 'animate-spin' : ''} />
            Re-test Health Check
          </button>
        </div>

        {/* Phase 3 Standards */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon">
              <ShieldCheck size={20} />
            </div>
            <h3 className="card-title">Phase 3 Security & Calculation Architecture</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.88rem' }}>Enforced User Scoping:</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>All CRUD requests enforce verified <code style={{ color: '#818cf8' }}>req.user._id</code>. No user ID in body is trusted.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.88rem' }}>Backend Financial Totals:</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Dashboard income, expenses, and balance are computed server-side from user records.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.88rem' }}>Manual Source Validation:</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>All transactions are stamped with <code style={{ color: '#818cf8' }}>source: 'manual'</code>.</p>
              </div>
            </div>
          </div>

          <div className="health-status-box" style={{ marginTop: 'auto' }}>
            <div className="status-row">
              <span className="status-label">Transactions API:</span>
              <span className="status-value">/api/transactions (CRUD)</span>
            </div>
            <div className="status-row">
              <span className="status-label">Dashboard Summary API:</span>
              <span className="status-value">/api/dashboard/summary</span>
            </div>
          </div>
        </div>
      </div>

      {/* REST API Endpoints Map */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '2rem 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Server size={20} color="var(--accent-primary)" />
        REST API Routing Blueprint
      </h3>

      <div className="grid-3col">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <code style={{ color: '#818cf8', fontWeight: 600 }}>/api/health</code>
            <span className="status-badge online">Active</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Server connectivity & health diagnostics.</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <code style={{ color: '#818cf8', fontWeight: 600 }}>/api/auth</code>
            <span className="status-badge online">Phase 2 Active</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registration, Login, and /me JWT authentication.</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <code style={{ color: '#818cf8', fontWeight: 600 }}>/api/transactions</code>
            <span className="status-badge online">Phase 3 Active</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manual Income & Expense CRUD, search, and filters.</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <code style={{ color: '#818cf8', fontWeight: 600 }}>/api/dashboard/summary</code>
            <span className="status-badge online">Phase 3 Active</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Server-computed Income, Expenses & Net Balance.</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <code style={{ color: '#818cf8', fontWeight: 600 }}>/api/budgets</code>
            <span className="status-badge online">Phase 4 Active</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Monthly budget CRUD, spending calculations, and progress tracking.</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <code style={{ color: '#cbd5e1', fontWeight: 600 }}>/api/savings</code>
            <span className="status-badge checking">Phase 4</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Savings targets and contribution tracking.</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
