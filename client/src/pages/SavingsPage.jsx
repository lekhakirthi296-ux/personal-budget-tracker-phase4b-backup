import React, { useState, useEffect, useCallback } from 'react';
import { savingsApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import SavingsGoalForm from '../components/SavingsGoalForm';
import SavingsContributionModal from '../components/SavingsContributionModal';
import {
  PiggyBank,
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Coins,
  X,
  RefreshCw,
  Search,
  Check,
  Award,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Status helper
// ─────────────────────────────────────────────────────────────────────────────
function getGoalStatusTheme(status, progressPercentage) {
  if (status === 'COMPLETED' || progressPercentage >= 100) {
    return {
      status: 'COMPLETED',
      label: 'Goal Completed',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      barGradient: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
    };
  }
  if (progressPercentage >= 60) {
    return {
      status: 'IN_PROGRESS',
      label: 'On Track',
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.12)',
      border: 'rgba(99, 102, 241, 0.35)',
      barGradient: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)'
    };
  }
  return {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    color: '#0ea5e9',
    bg: 'rgba(14, 165, 233, 0.12)',
    border: 'rgba(14, 165, 233, 0.35)',
    barGradient: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Savings Goal Card Component
// ─────────────────────────────────────────────────────────────────────────────
function SavingsGoalCard({
  goal,
  onEdit,
  onContribute,
  onDelete,
  deleteLoading
}) {
  const currentAmount = Number(goal.currentAmount || 0);
  const targetAmount = Number(goal.targetAmount || 0);
  const progressPercentage = goal.progressPercentage !== undefined
    ? goal.progressPercentage
    : targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100 * 10) / 10) : 0;

  const remainingAmount = goal.remainingAmount !== undefined
    ? goal.remainingAmount
    : Math.max(0, targetAmount - currentAmount);

  const statusTheme = getGoalStatusTheme(goal.status, progressPercentage);
  const isCompleted = goal.status === 'COMPLETED' || progressPercentage >= 100;

  return (
    <div
      className={`savings-goal-card ${isCompleted ? 'is-completed' : ''}`}
      id={`savings-card-${goal._id}`}
    >
      {/* Top accent line */}
      <div
        className="savings-card-accent"
        style={{ background: statusTheme.barGradient }}
      />

      {/* Header */}
      <div className="savings-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            className="savings-goal-icon"
            style={{
              background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
              color: isCompleted ? 'var(--success)' : 'var(--accent-primary)'
            }}
          >
            {isCompleted ? <Award size={18} /> : <PiggyBank size={18} />}
          </div>
          <div>
            <h4 className="savings-goal-name" title={goal.name}>
              {goal.name}
            </h4>
            {goal.targetDate ? (
              <div className="savings-goal-date">
                <Calendar size={12} />
                <span>Target: {formatDate(goal.targetDate)}</span>
              </div>
            ) : (
              <div className="savings-goal-date">
                <Sparkles size={12} />
                <span>Open-ended Target</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div
          className="savings-status-badge"
          style={{
            color: statusTheme.color,
            background: statusTheme.bg,
            border: `1px solid ${statusTheme.border}`
          }}
        >
          {isCompleted ? <Check size={12} /> : <TrendingUp size={12} />}
          <span>{statusTheme.label}</span>
        </div>
      </div>

      {/* Financials Row */}
      <div className="savings-financials">
        <div className="savings-fin-row">
          <span className="savings-fin-label">Saved so far</span>
          <span className="savings-fin-value current-val">
            {formatCurrency(currentAmount)}
          </span>
        </div>
        <div className="savings-fin-row">
          <span className="savings-fin-label">Target Goal</span>
          <span className="savings-fin-value target-val">
            {formatCurrency(targetAmount)}
          </span>
        </div>
        <div className="savings-fin-row">
          <span className="savings-fin-label">Remaining to target</span>
          <span
            className="savings-fin-value"
            style={{
              color: isCompleted ? 'var(--success)' : 'var(--text-secondary)',
              fontWeight: 600
            }}
          >
            {isCompleted ? 'Target Achieved 🎉' : formatCurrency(remainingAmount)}
          </span>
        </div>
      </div>

      {/* Progress Bar & Percentage */}
      <div className="savings-progress-wrap">
        <div className="savings-progress-bar-bg">
          <div
            className="savings-progress-bar-fill"
            style={{
              width: `${Math.max(2, progressPercentage)}%`,
              background: statusTheme.barGradient
            }}
          />
        </div>
        <div className="savings-progress-labels">
          <span className="progress-pct-text">
            {progressPercentage}% saved
          </span>
          <span className="progress-remaining-text">
            {isCompleted ? '100% Complete' : `${(100 - progressPercentage).toFixed(1)}% remaining`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="savings-card-actions">
        <button
          type="button"
          className="btn-savings-action btn-savings-contribute"
          onClick={() => onContribute(goal)}
          id={`btn-contribute-${goal._id}`}
          title="Add contribution deposit"
        >
          <Coins size={14} />
          <span>Contribute</span>
        </button>

        <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
          <button
            type="button"
            className="btn-savings-action btn-savings-edit"
            onClick={() => onEdit(goal)}
            id={`btn-edit-savings-${goal._id}`}
            title="Edit goal details"
          >
            <Pencil size={13} />
            <span>Edit</span>
          </button>

          <button
            type="button"
            className="btn-savings-action btn-savings-delete"
            onClick={() => onDelete(goal)}
            disabled={deleteLoading === goal._id}
            id={`btn-delete-savings-${goal._id}`}
            title="Delete goal"
          >
            {deleteLoading === goal._id ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <Trash2 size={13} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Goal Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────
function DeleteGoalModal({ goal, onConfirm, onCancel, loading }) {
  if (!goal) return null;

  return (
    <div className="modal-overlay" id="delete-savings-modal">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-icon-danger">
            <AlertTriangle size={24} color="var(--danger)" />
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onCancel}
            disabled={loading}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="modal-title">Delete Savings Goal</h3>
        <p className="modal-text">
          Are you sure you want to delete this savings goal? All tracked contributions for this goal will be removed.
        </p>

        {/* Goal Brief */}
        <div className="modal-transaction-preview">
          <div className="status-row">
            <span className="status-label">Goal Name:</span>
            <span className="status-value" style={{ fontWeight: 600 }}>{goal.name}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Target:</span>
            <span className="status-value">{formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Current Saved:</span>
            <span className="status-value" style={{ color: 'var(--success)' }}>
              {formatCurrency(goal.currentAmount)}
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={loading}
            id="btn-confirm-delete-savings"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Delete Goal</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SavingsPage Component
// ─────────────────────────────────────────────────────────────────────────────
export default function SavingsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'IN_PROGRESS' | 'COMPLETED'

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [contributingGoal, setContributingGoal] = useState(null);
  const [contributeSubmitting, setContributeSubmitting] = useState(false);

  const [deletingGoal, setDeletingGoal] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch savings goals
  // ─────────────────────────────────────────────────────────────────────────
  const fetchSavingsGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await savingsApi.getAll();
      if (res.success && res.data && Array.isArray(res.data.savingsGoals)) {
        setGoals(res.data.savingsGoals);
      } else {
        setGoals([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch savings goals');
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavingsGoals();
  }, [fetchSavingsGoals]);

  // Flash message dismiss timer
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ─────────────────────────────────────────────────────────────────────────
  // Summary calculations
  // ─────────────────────────────────────────────────────────────────────────
  const totalSaved = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const completedGoalsCount = goals.filter((g) => g.status === 'COMPLETED' || (g.progressPercentage >= 100)).length;
  const activeGoalsCount = goals.length - completedGoalsCount;

  const averageProgress = totalTarget > 0
    ? Math.min(100, Math.round((totalSaved / totalTarget) * 100 * 10) / 10)
    : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered goals
  // ─────────────────────────────────────────────────────────────────────────
  const filteredGoals = goals.filter((g) => {
    // 1. Text filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!g.name.toLowerCase().includes(q)) return false;
    }

    // 2. Status filter
    if (statusFilter === 'COMPLETED') {
      return g.status === 'COMPLETED' || g.progressPercentage >= 100;
    }
    if (statusFilter === 'IN_PROGRESS') {
      return g.status !== 'COMPLETED' && (g.progressPercentage === undefined || g.progressPercentage < 100);
    }

    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenCreateForm = () => {
    setEditingGoal(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setFormSubmitting(true);
      if (editingGoal && editingGoal._id) {
        const res = await savingsApi.update(editingGoal._id, formData);
        if (res.success) {
          setSuccessMessage(`Goal "${formData.name}" updated successfully`);
        }
      } else {
        const res = await savingsApi.create(formData);
        if (res.success) {
          setSuccessMessage(`Savings goal "${formData.name}" created successfully`);
        }
      }
      setIsFormOpen(false);
      setEditingGoal(null);
      await fetchSavingsGoals();
    } catch (err) {
      throw err;
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleContributeSubmit = async (goalId, amount) => {
    try {
      setContributeSubmitting(true);
      const res = await savingsApi.contribute(goalId, amount);
      if (res.success) {
        setSuccessMessage(`Added ${formatCurrency(amount)} contribution successfully!`);
      }
      setContributingGoal(null);
      await fetchSavingsGoals();
    } catch (err) {
      throw err;
    } finally {
      setContributeSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGoal) return;
    try {
      setDeleteLoadingId(deletingGoal._id);
      const res = await savingsApi.delete(deletingGoal._id);
      if (res.success) {
        setSuccessMessage(`Savings goal "${deletingGoal.name}" deleted successfully`);
      }
      setDeletingGoal(null);
      await fetchSavingsGoals();
    } catch (err) {
      setError(err.message || 'Failed to delete savings goal');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="savings-page-container">
      {/* Hero Header */}
      <section className="savings-hero-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <div className="page-header-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)' }}>
                <PiggyBank size={24} />
              </div>
              <h2 className="savings-page-title" style={{ margin: 0 }}>
                Savings Goals
              </h2>
            </div>
            <p className="savings-page-subtitle">
              Set realistic financial targets, track contributions, and watch your future funds grow.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={fetchSavingsGoals}
              disabled={loading}
              title="Refresh savings goals"
              id="savings-btn-refresh"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleOpenCreateForm}
              id="savings-btn-add-goal"
            >
              <PlusCircle size={16} />
              <span>Add Savings Goal</span>
            </button>
          </div>
        </div>
      </section>

      {/* Success Notification Flash */}
      {successMessage && (
        <div className="form-success-banner" id="savings-flash-success">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setSuccessMessage(null)}
            style={{ marginLeft: 'auto', padding: '0.2rem' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="form-error-banner" id="savings-flash-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto', padding: '0.2rem' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Metrics Cards Banner */}
      <section className="grid-4col savings-summary-cards" style={{ marginBottom: '1.75rem' }}>
        {/* Total Saved */}
        <div className="card stat-card" id="stat-total-saved">
          <div className="stat-card-header">
            <span className="stat-label">Total Saved</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
              <Coins size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {formatCurrency(totalSaved)}
          </div>
          <div className="stat-subtext">
            <span>Cumulative contributions across all goals</span>
          </div>
        </div>

        {/* Total Target */}
        <div className="card stat-card" id="stat-total-target">
          <div className="stat-card-header">
            <span className="stat-label">Total Target</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)' }}>
              <PiggyBank size={18} />
            </div>
          </div>
          <div className="stat-value">
            {formatCurrency(totalTarget)}
          </div>
          <div className="stat-subtext">
            <span>Combined target of all active goals</span>
          </div>
        </div>

        {/* Average Progress */}
        <div className="card stat-card" id="stat-avg-progress">
          <div className="stat-card-header">
            <span className="stat-label">Average Progress</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: averageProgress >= 100 ? 'var(--success)' : 'var(--text-primary)' }}>
            {averageProgress}%
          </div>
          <div className="stat-subtext">
            <span>Overall completion rate</span>
          </div>
        </div>

        {/* Active vs Completed Goals */}
        <div className="card stat-card" id="stat-active-goals">
          <div className="stat-card-header">
            <span className="stat-label">Active Goals</span>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Award size={18} />
            </div>
          </div>
          <div className="stat-value">
            {activeGoalsCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>({completedGoalsCount} completed)</span>
          </div>
          <div className="stat-subtext">
            <span>{completedGoalsCount > 0 ? `${completedGoalsCount} milestones reached` : 'Track your active savings targets'}</span>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="savings-filter-bar">
        <div className="savings-search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input-text savings-search-input"
            placeholder="Search goals by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="savings-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-icon search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="savings-filter-tabs">
          <button
            type="button"
            className={`filter-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
            id="filter-savings-all"
          >
            All Goals ({goals.length})
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => setStatusFilter('IN_PROGRESS')}
            id="filter-savings-in-progress"
          >
            In Progress ({activeGoalsCount})
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('COMPLETED')}
            id="filter-savings-completed"
          >
            Completed ({completedGoalsCount})
          </button>
        </div>
      </section>

      {/* Goals Content Area */}
      {loading && goals.length === 0 ? (
        <div className="savings-loading-card">
          <Loader2 size={32} className="spin" color="var(--accent-primary)" />
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>Loading your savings goals...</p>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="savings-empty-state" id="savings-empty-state">
          <div className="empty-icon-wrap">
            <PiggyBank size={40} />
          </div>
          <h3 className="empty-title">
            {searchQuery || statusFilter !== 'ALL' ? 'No matching savings goals found' : 'No Savings Goals Yet'}
          </h3>
          <p className="empty-text">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try changing your search keywords or status filter.'
              : 'Create your first savings goal to set a target, deposit contributions, and track your progress over time.'}
          </p>
          {searchQuery || statusFilter !== 'ALL' ? (
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={handleOpenCreateForm}
              id="btn-empty-create-savings"
            >
              <PlusCircle size={16} />
              <span>Create Your First Goal</span>
            </button>
          )}
        </div>
      ) : (
        <div className="savings-goals-grid">
          {filteredGoals.map((goal) => (
            <SavingsGoalCard
              key={goal._id}
              goal={goal}
              onEdit={handleOpenEditForm}
              onContribute={(g) => setContributingGoal(g)}
              onDelete={(g) => setDeletingGoal(g)}
              deleteLoading={deleteLoadingId}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <SavingsGoalForm
          initialData={editingGoal}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingGoal(null);
          }}
          loading={formSubmitting}
        />
      )}

      {/* Contribution Deposit Modal */}
      {contributingGoal && (
        <SavingsContributionModal
          goal={contributingGoal}
          onContribute={handleContributeSubmit}
          onCancel={() => setContributingGoal(null)}
          loading={contributeSubmitting}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingGoal && (
        <DeleteGoalModal
          goal={deletingGoal}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingGoal(null)}
          loading={deleteLoadingId === deletingGoal._id}
        />
      )}
    </div>
  );
}
