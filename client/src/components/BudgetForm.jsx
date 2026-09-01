import React, { useState, useEffect } from 'react';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import {
  Tag,
  DollarSign,
  Calendar,
  CheckCircle2,
  PlusCircle,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

export default function BudgetForm({ initialData = null, onSubmit, onCancel, loading = false }) {
  const isEditMode = Boolean(initialData && initialData._id);

  const currentDate = new Date();
  const [formData, setFormData] = useState({
    category: initialData?.category || EXPENSE_CATEGORIES[0],
    amount: initialData?.amount !== undefined ? String(initialData.amount) : '',
    month: initialData?.month ?? currentDate.getMonth() + 1,
    year: initialData?.year ?? currentDate.getFullYear()
  });

  const [error, setError] = useState(null);

  // Sync when editing a different budget
  useEffect(() => {
    if (initialData) {
      setFormData({
        category: initialData.category || EXPENSE_CATEGORIES[0],
        amount: initialData.amount !== undefined ? String(initialData.amount) : '',
        month: initialData.month ?? currentDate.getMonth() + 1,
        year: initialData.year ?? currentDate.getFullYear()
      });
      setError(null);
    }
  }, [initialData?._id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Category
    if (!formData.category || !formData.category.trim()) {
      setError('Please select a budget category');
      return;
    }

    // 2. Amount
    if (!formData.amount || !String(formData.amount).trim()) {
      setError('Please enter a budget amount');
      return;
    }
    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      setError('Budget amount must be a positive number greater than zero');
      return;
    }

    // 3. Month
    const numMonth = parseInt(formData.month, 10);
    if (!numMonth || numMonth < 1 || numMonth > 12) {
      setError('Please select a valid month');
      return;
    }

    // 4. Year
    const numYear = parseInt(formData.year, 10);
    if (!numYear || numYear < 2000 || numYear > 2100) {
      setError('Please select a valid year');
      return;
    }

    try {
      // NEVER send userId — backend derives it from JWT
      await onSubmit({
        category: formData.category.trim(),
        amount: Math.round(numAmount * 100) / 100,
        month: numMonth,
        year: numYear
      });
    } catch (err) {
      setError(err.message || 'Failed to save budget');
    }
  };

  return (
    <div className="transaction-form-wrapper">
      {/* Form Header */}
      <div className="form-card-header">
        <div>
          <h3 className="card-title">
            {isEditMode ? 'Edit Budget' : 'Create New Budget'}
          </h3>
          <p className="card-subtitle">
            {isEditMode
              ? 'Update the budget limit for this category.'
              : 'Set a monthly spending limit for a category.'}
          </p>
        </div>
        {onCancel && (
          <button type="button" className="btn-icon" onClick={onCancel} title="Cancel">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Category */}
        <div className="form-group">
          <label htmlFor="budget-category" className="form-label">
            Category <span className="required-star">*</span>
          </label>
          <div className="input-wrapper">
            <Tag size={18} className="input-icon" />
            <select
              id="budget-category"
              name="category"
              className="form-input form-select"
              value={formData.category}
              onChange={handleChange}
              disabled={loading}
              required
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div className="form-group">
          <label htmlFor="budget-amount" className="form-label">
            Budget Amount (₹) <span className="required-star">*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-prefix">₹</span>
            <input
              id="budget-amount"
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              className="form-input"
              placeholder="0.00"
              value={formData.amount}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Month & Year row */}
        <div className="grid-2col" style={{ gap: '1rem', marginBottom: 0 }}>
          {/* Month */}
          <div className="form-group">
            <label htmlFor="budget-month" className="form-label">
              Month <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <Calendar size={18} className="input-icon" />
              <select
                id="budget-month"
                name="month"
                className="form-input form-select"
                value={formData.month}
                onChange={handleChange}
                disabled={loading}
                required
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Year */}
          <div className="form-group">
            <label htmlFor="budget-year" className="form-label">
              Year <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <Calendar size={18} className="input-icon" />
              <select
                id="budget-year"
                name="year"
                className="form-input form-select"
                value={formData.year}
                onChange={handleChange}
                disabled={loading}
                required
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions-group">
          {onCancel && (
            <button type="button" className="btn-outline" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            id="btn-submit-budget"
            className="btn-primary"
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                {isEditMode ? <CheckCircle2 size={16} /> : <PlusCircle size={16} />}
                <span>{isEditMode ? 'Update Budget' : 'Create Budget'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
