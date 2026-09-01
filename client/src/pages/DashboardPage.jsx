import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, transactionsApi, authApi } from '../services/api';
import TransactionForm from '../components/TransactionForm';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  User, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  RefreshCw, 
  ShieldCheck, 
  Lock, 
  Key, 
  Layers, 
  CheckCircle2, 
  Receipt, 
  Calendar, 
  Loader2,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function DashboardPage({ onNavigateToTransactions }) {
  const { user } = useAuth();

  // Summary state from server
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    transactionCount: 0,
    recentTransactions: []
  });

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  // Month & Year Filter for Summary
  const currentDate = new Date();
  const [filterMode, setFilterMode] = useState('month'); // 'month' | 'all'
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Quick Add Transaction Modal State
  const [quickFormType, setQuickFormType] = useState(null); // 'income' | 'expense' | null
  const [formLoading, setFormLoading] = useState(false);

  // Auth /me verification state
  const [verifyStatus, setVerifyStatus] = useState({
    loading: false,
    data: null,
    error: null,
    latency: null
  });

  // Fetch Dashboard Summary from Server
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const params = {};
      if (filterMode === 'month') {
        params.month = selectedMonth;
        params.year = selectedYear;
      }

      const response = await dashboardApi.getSummary(params);
      if (response && response.success && response.data) {
        setSummary(response.data);
      }
    } catch (err) {
      setSummaryError(err.message || 'Failed to fetch dashboard summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [filterMode, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Handle Quick Add Transaction Submission
  const handleQuickSubmit = async (formData) => {
    setFormLoading(true);
    try {
      await transactionsApi.create(formData);
      setQuickFormType(null);
      fetchSummary(); // Refresh summary calculations
    } catch (err) {
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Test /api/auth/me live
  const testAuthMe = async () => {
    setVerifyStatus((prev) => ({ ...prev, loading: true, error: null }));
    const startTime = performance.now();
    try {
      const response = await authApi.getCurrentUser();
      const endTime = performance.now();
      setVerifyStatus({
        loading: false,
        data: response,
        error: null,
        latency: Math.round(endTime - startTime)
      });
    } catch (err) {
      const endTime = performance.now();
      setVerifyStatus({
        loading: false,
        data: null,
        error: err.message || 'Verification request failed',
        latency: Math.round(endTime - startTime)
      });
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="dashboard-container">
      {/* Quick Add Modal */}
      {quickFormType && (
        <div className="modal-overlay">
          <div className="modal-card modal-card-large">
            <TransactionForm
              initialData={{ type: quickFormType }}
              onSubmit={handleQuickSubmit}
              onCancel={() => setQuickFormType(null)}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <section className="hero-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="status-badge online" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <span className="pulse-dot"></span>
              Live Financial Intelligence Active
            </div>
            <h2 className="hero-title">Welcome back, {user?.name || 'User'}!</h2>
            <p className="hero-subtitle">
              Here is your server-calculated financial overview for{' '}
              <strong>
                {filterMode === 'month' 
                  ? `${monthNames[selectedMonth - 1]} ${selectedYear}` 
                  : 'All Time'}
              </strong>.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              id="btn-quick-income"
              className="btn-income-action"
              onClick={() => setQuickFormType('income')}
            >
              <ArrowUpRight size={16} />
              <span>+ Record Income</span>
            </button>
            <button
              id="btn-quick-expense"
              className="btn-expense-action"
              onClick={() => setQuickFormType('expense')}
            >
              <ArrowDownRight size={16} />
              <span>- Record Expense</span>
            </button>
          </div>
        </div>
      </section>

      {/* Period Filter Bar */}
      <div className="summary-period-bar card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Calendar size={18} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Summary Scope:</span>
          
          <div className="period-toggle-group">
            <button
              type="button"
              className={`period-toggle-btn ${filterMode === 'month' ? 'active' : ''}`}
              onClick={() => setFilterMode('month')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`period-toggle-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Time
            </button>
          </div>
        </div>

        {filterMode === 'month' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              className="filter-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid-3col" style={{ marginBottom: '2rem' }}>
        {/* Total Income Card */}
        <div className="card stat-card stat-income">
          <div className="stat-card-header">
            <span className="stat-label">Total Income</span>
            <div className="stat-icon-wrapper stat-icon-income">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="stat-value text-income">
            {loadingSummary ? (
              <span className="stat-loading">Computing...</span>
            ) : (
              formatCurrency(summary.totalIncome)
            )}
          </div>
          <div className="stat-footer">
            <span>Verified from manual income entries</span>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="card stat-card stat-expense">
          <div className="stat-card-header">
            <span className="stat-label">Total Expenses</span>
            <div className="stat-icon-wrapper stat-icon-expense">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="stat-value text-expense">
            {loadingSummary ? (
              <span className="stat-loading">Computing...</span>
            ) : (
              formatCurrency(summary.totalExpenses)
            )}
          </div>
          <div className="stat-footer">
            <span>Categorized outflow records</span>
          </div>
        </div>

        {/* Current Balance Card */}
        <div className="card stat-card stat-balance">
          <div className="stat-card-header">
            <span className="stat-label">Net Balance</span>
            <div className="stat-icon-wrapper stat-icon-balance">
              <Wallet size={20} />
            </div>
          </div>
          <div className={`stat-value ${summary.balance >= 0 ? 'text-balance-positive' : 'text-balance-negative'}`}>
            {loadingSummary ? (
              <span className="stat-loading">Computing...</span>
            ) : (
              formatCurrency(summary.balance)
            )}
          </div>
          <div className="stat-footer">
            <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Formula: Income - Expenses</code>
          </div>
        </div>
      </div>

      {/* Recent Transactions & Profile Breakdown */}
      <div className="grid-2col" style={{ marginBottom: '2rem' }}>
        {/* Recent Transactions List */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="card-icon">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="card-title">Recent Transactions</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest 5 entries</span>
              </div>
            </div>

            {onNavigateToTransactions && (
              <button
                type="button"
                className="btn-link"
                onClick={onNavigateToTransactions}
                style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span>View All</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {loadingSummary ? (
            <div className="table-loading-state" style={{ minHeight: '160px' }}>
              <Loader2 size={24} className="animate-spin" color="var(--accent-primary)" />
            </div>
          ) : summary.recentTransactions && summary.recentTransactions.length > 0 ? (
            <div className="recent-tx-list">
              {summary.recentTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <div key={tx._id} className="recent-tx-item">
                    <div className="recent-tx-left">
                      <div className={`recent-tx-icon ${isIncome ? 'icon-income' : 'icon-expense'}`}>
                        {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <div className="recent-tx-title">{tx.category}</div>
                        <div className="recent-tx-subtitle">
                          {formatDate(tx.date)} &bull; {tx.paymentMethod || 'Cash'}
                        </div>
                      </div>
                    </div>

                    <div className={`recent-tx-amount ${isIncome ? 'amount-income' : 'amount-expense'}`}>
                      {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state-compact">
              <p>No transactions recorded yet.</p>
              <button
                className="btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setQuickFormType('expense')}
              >
                + Record First Transaction
              </button>
            </div>
          )}
        </div>

        {/* User Profile Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon">
              <User size={20} />
            </div>
            <div>
              <h3 className="card-title">User Profile & Ownership</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Security Scope</span>
            </div>
          </div>

          <div className="health-status-box">
            <div className="status-row">
              <span className="status-label">Account Name:</span>
              <span className="status-value">{user?.name}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Email Address:</span>
              <span className="status-value">{user?.email}</span>
            </div>
            <div className="status-row">
              <span className="status-label">User ID:</span>
              <span className="status-value" style={{ color: 'var(--accent-secondary)' }}>{user?.id || user?._id}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Isolation Mode:</span>
              <span className="status-badge online">Strict Ownership Active</span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span>All transactions and calculations are strictly bound to this account.</span>
          </div>
        </div>
      </div>

      {/* Security Architecture Guarantees */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1rem 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Lock size={20} color="var(--accent-primary)" />
        Phase 3 Security & Isolation Architecture
      </h3>

      <div className="grid-3col">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Layers size={18} color="var(--accent-primary)" />
            <strong style={{ fontSize: '0.92rem' }}>Strict User Ownership</strong>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Backend enforces <code style={{ color: '#818cf8' }}>req.user._id</code> on all CRUD operations. Unauthorized cross-user reads, edits, or deletes are strictly rejected.
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Sparkles size={18} color="var(--accent-secondary)" />
            <strong style={{ fontSize: '0.92rem' }}>Server-Computed Totals</strong>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Financial metrics (<code style={{ color: '#818cf8' }}>totalIncome</code>, <code style={{ color: '#818cf8' }}>totalExpenses</code>, <code style={{ color: '#818cf8' }}>balance</code>) are calculated strictly by the backend server.
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={18} color="var(--success)" />
            <strong style={{ fontSize: '0.92rem' }}>Manual Source Isolation</strong>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            All Phase 3 transactions are stamped with <code style={{ color: '#818cf8' }}>source: 'manual'</code>, ready for future automated SMS detection pipelines.
          </p>
        </div>
      </div>
    </div>
  );
}
