import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetsPage from './pages/BudgetsPage';
import SavingsPage from './pages/SavingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { 
  DollarSign, 
  LogOut, 
  Receipt,
  LayoutDashboard,
  Target,
  PiggyBank,
  Sparkles
} from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'transactions' | 'budgets' | 'savings'

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
            <p>Personal Finance, Budgeting & Savings Management</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Demo Account Indicator */}
          {isAuthenticated && user?.isDemo && (
            <div 
              id="badge-demo-mode"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.75rem',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--accent-primary)'
              }}
            >
              <Sparkles size={13} />
              <span>Demo Account</span>
            </div>
          )}

          {/* Navigation Controls */}
          {isAuthenticated && (
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
                id="tab-savings"
                className={`nav-pill-btn ${activeTab === 'savings' ? 'active' : ''}`}
                onClick={() => setActiveTab('savings')}
              >
                <PiggyBank size={15} />
                <span>Savings</span>
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
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {!isAuthenticated ? (
        authView === 'login' ? (
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
        <ProtectedRoute>
          <SavingsPage />
        </ProtectedRoute>
      )}

      {/* App Footer */}
      <footer className="app-footer">
        <div>
          <span>Personal Budget Tracker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Secure Personal Finance Manager</span>
        </div>
      </footer>
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
