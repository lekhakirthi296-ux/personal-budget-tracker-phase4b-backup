import React, { useState, useEffect, useCallback } from 'react';
import { budgetsApi } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import BudgetForm from '../components/BudgetForm';
import {
  Target,
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  TrendingUp,
  AlertTriangle,
  X,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

// ─────────────────────────────────────────────────────────────────────────────
// Budget status helpers
// ─────────────────────────────────────────────────────────────────────────────

function getBudgetStatus(utilizationPercentage) {
  if (utilizationPercentage > 100) {
    return { label: 'Budget exceeded', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', barColor: '#ef4444' };
  }
  if (utilizationPercentage >= 90) {
    return { label: 'Near limit', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', barColor: '#f59e0b' };
  }
  if (utilizationPercentage >= 70) {
    return { label: 'Approaching limit', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.35)', barColor: '#fb923c' };
  }
  return { label: 'On track', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', barColor: '#10b981' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget Card
// ─────────────────────────────────────────────────────────────────────────────

function BudgetCard({ budget, onEdit, onDelete, deleteLoading }) {
  const util = Math.max(0, budget.utilizationPercentage ?? 0);
  const status = getBudgetStatus(budget.utilizationPercentage ?? 0);
  const barWidth = Math.min(util, 100);

  return (
    <div className="budget-card">
      {/* Top bar accent */}
      <div className="budget-card-accent" style={{ background: status.barColor }} />

      {/* Header row */}
      <div className="budget-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="budget-category-icon">
            <Target size={18} />
          </div>
          <div>
            <div className="budget-category-name">{budget.category}</div>
            <div className="budget-period">
              {MONTH_NAMES[(budget.month ?? 1) - 1]} {budget.year}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div
          className="budget-status-badge"
          style={{ color: status.color, background: status.bg, border: `1px solid ${status.border}` }}
        >
          {budget.utilizationPercentage > 100
            ? <AlertTriangle size={11} />
            : budget.utilizationPercentage >= 70
            ? <TrendingUp size={11} />
            : <CheckCircle2 size={11} />}
          {status.label}
        </div>
      </div>

      {/* Financial rows */}
      <div className="budget-financials">
        <div className="budget-fin-row">
          <span className="budget-fin-label">Budget</span>
          <span className="budget-fin-value">{formatCurrency(budget.budgetAmount ?? budget.amount)}</span>
        </div>
        <div className="budget-fin-row">
          <span className="budget-fin-label">Spent</span>
          <span className="budget-fin-value" style={{ color: budget.spentAmount > 0 ? '#f87171' : 'var(--text-secondary)' }}>
            {formatCurrency(budget.spentAmount ?? 0)}
          </span>
        </div>
        <div className="budget-fin-row">
          <span className="budget-fin-label">Remaining</span>
          <span
            className="budget-fin-value"
            style={{ color: (budget.remainingAmount ?? 0) < 0 ? '#ef4444' : '#10b981' }}
          >
            {formatCurrency(budget.remainingAmount ?? (budget.amount - (budget.spentAmount ?? 0)))}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="budget-progress-wrap">
        <div className="budget-progress-bar-bg">
          <div
            className="budget-progress-bar-fill"
            style={{
              width: `${barWidth}%`,
              background: status.barColor,
              boxShadow: `0 0 8px ${status.barColor}60`
            }}
          />
        </div>
        <div className="budget-progress-labels">
          <span>{util.toFixed(1)}% used</span>
          <span style={{ color: status.color }}>{status.label}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="budget-card-actions">
        <button
          id={`btn-edit-budget-${budget._id}`}
          className="btn-icon-action"
          onClick={() => onEdit(budget)}
          title="Edit budget"
          disabled={deleteLoading}
        >
          <Pencil size={14} />
          <span>Edit</span>
        </button>
        <button
          id={`btn-delete-budget-${budget._id}`}
          className="btn-icon-action btn-icon-delete"
          onClick={() => onDelete(budget)}
          title="Delete budget"
          disabled={deleteLoading}
        >
          {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirm Modal (budget-specific)
// ─────────────────────────────────────────────────────────────────────────────

function BudgetDeleteModal({ budget, onConfirm, onCancel, loading }) {
  if (!budget) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-icon-danger">
            <AlertTriangle size={24} color="var(--danger)" />
          </div>
          <button type="button" className="btn-icon" onClick={onCancel} disabled={loading} title="Close">
            <X size={18} />
          </button>
        </div>

        <h3 className="modal-title">Delete Budget</h3>
        <p className="modal-text">
          Are you sure you want to delete this budget? This action cannot be undone.
          Your transactions will <strong>not</strong> be affected.
        </p>

        <div className="modal-transaction-preview">
          <div className="status-row">
            <span className="status-label">Category:</span>
            <span className="status-value">{budget.category}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Period:</span>
            <span className="status-value">{MONTH_NAMES[(budget.month ?? 1) - 1]} {budget.year}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Budget Limit:</span>
            <span className="status-value">{formatCurrency(budget.budgetAmount ?? budget.amount)}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            id="btn-confirm-delete-budget"
            className="btn-danger"
            onClick={() => onConfirm(budget._id)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main BudgetsPage
// ─────────────────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const currentDate = new Date();

  // Month/Year filter (defaults to current month/year)
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Budgets list state
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Success toast
  const [successMsg, setSuccessMsg] = useState(null);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete modal state
  const [deletingBudget, setDeletingBudget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch budgets ──────────────────────────────────────────────────────────
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await budgetsApi.getAll({ month: selectedMonth, year: selectedYear });
      if (response && response.success && response.data) {
        setBudgets(response.data.budgets ?? []);
      }
    } catch (err) {
      if (err.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError(err.message || 'Failed to load budgets. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // ── Auto-dismiss success message ───────────────────────────────────────────
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ── Open form for create ───────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingBudget(null);
    setShowForm(true);
  };

  // ── Open form for edit ─────────────────────────────────────────────────────
  const handleOpenEdit = (budget) => {
    setEditingBudget(budget);
    setShowForm(true);
  };

  // ── Close form ─────────────────────────────────────────────────────────────
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBudget(null);
  };

  // ── Submit create or update ────────────────────────────────────────────────
  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      if (editingBudget) {
        await budgetsApi.update(editingBudget._id, formData);
        setSuccessMsg('Budget updated successfully!');
      } else {
        await budgetsApi.create(formData);
        setSuccessMsg('Budget created successfully!');
      }
      handleCloseForm();
      fetchBudgets();
    } catch (err) {
      // Re-throw so BudgetForm catches it and shows the error inline
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // ── Confirm delete ─────────────────────────────────────────────────────────
  const handleConfirmDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await budgetsApi.delete(id);
      setDeletingBudget(null);
      setSuccessMsg('Budget deleted successfully!');
      fetchBudgets();
    } catch (err) {
      setDeletingBudget(null);
      setError(err.message || 'Failed to delete budget.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">
      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-card modal-card-large">
            <BudgetForm
              initialData={editingBudget}
              onSubmit={handleFormSubmit}
              onCancel={handleCloseForm}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingBudget && (
        <BudgetDeleteModal
          budget={deletingBudget}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingBudget(null)}
          loading={deleteLoading}
        />
      )}

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Target size={28} color="var(--accent-primary)" />
            Budgets
          </h2>
          <p className="section-subtitle">
            Set and track monthly spending limits by category.
          </p>
        </div>

        <button
          id="btn-add-budget"
          className="btn-primary"
          onClick={handleOpenCreate}
          disabled={loading}
        >
          <PlusCircle size={16} />
          <span>Add Budget</span>
        </button>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="alert-banner alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={18} className="alert-icon" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Month / Year Selector */}
      <div className="card summary-period-bar" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Calendar size={18} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Viewing period:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="filter-item" style={{ minWidth: '140px' }}>
            <label className="filter-label">Month</label>
            <select
              id="budget-filter-month"
              className="filter-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          <div className="filter-item" style={{ minWidth: '100px' }}>
            <label className="filter-label">Year</label>
            <select
              id="budget-filter-year"
              className="filter-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            className="btn-outline"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', height: '36px', alignSelf: 'flex-end' }}
            onClick={fetchBudgets}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert-banner alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} className="alert-icon" />
          <span>{error}</span>
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 0.25rem' }}
            onClick={() => setError(null)}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="table-loading-state" style={{ minHeight: '280px' }}>
          <Loader2 size={32} className="animate-spin" color="var(--accent-primary)" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading budgets…</p>
        </div>
      ) : budgets.length === 0 ? (
        /* Empty State */
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <Target size={28} color="var(--text-muted)" />
            </div>
            <h3>No budgets set for this month</h3>
            <p>
              Create spending limits for {MONTH_NAMES[selectedMonth - 1]} {selectedYear} to track
              where your money goes.
            </p>
            <button
              id="btn-create-first-budget"
              className="btn-primary"
              onClick={handleOpenCreate}
              style={{ marginTop: '0.5rem' }}
            >
              <PlusCircle size={16} />
              <span>Create your first budget</span>
            </button>
          </div>
        </div>
      ) : (
        /* Budget Cards Grid */
        <>
          {/* Summary row */}
          <div className="budget-summary-row">
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {budgets.length} budget{budgets.length !== 1 ? 's' : ''} for{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </strong>
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Spending data sourced from backend
            </span>
          </div>

          <div className="budget-grid">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget._id}
                budget={budget}
                onEdit={handleOpenEdit}
                onDelete={setDeletingBudget}
                deleteLoading={deleteLoading && deletingBudget?._id === budget._id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
