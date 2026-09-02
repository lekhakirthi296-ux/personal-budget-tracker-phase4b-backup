import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  DollarSign,
  Calendar,
  CheckCircle2,
  PlusCircle,
  X,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { toDateInputString } from '../utils/formatters';

export default function SavingsGoalForm({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false
}) {
  const isEditMode = Boolean(initialData && initialData._id);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    targetAmount: initialData?.targetAmount !== undefined ? String(initialData.targetAmount) : '',
    currentAmount: initialData?.currentAmount !== undefined ? String(initialData.currentAmount) : '0',
    targetDate: initialData?.targetDate ? toDateInputString(initialData.targetDate) : ''
  });

  const [error, setError] = useState(null);

  // Sync when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        targetAmount: initialData.targetAmount !== undefined ? String(initialData.targetAmount) : '',
        currentAmount: initialData.currentAmount !== undefined ? String(initialData.currentAmount) : '0',
        targetDate: initialData.targetDate ? toDateInputString(initialData.targetDate) : ''
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

    // 1. Validate Name
    if (!formData.name || !formData.name.trim()) {
      setError('Please provide a savings goal name');
      return;
    }
    if (formData.name.trim().length > 100) {
      setError('Savings goal name cannot exceed 100 characters');
      return;
    }

    // 2. Validate Target Amount
    if (!formData.targetAmount || !String(formData.targetAmount).trim()) {
      setError('Please enter a target amount');
      return;
    }
    const numTarget = Number(formData.targetAmount);
    if (isNaN(numTarget) || !isFinite(numTarget) || numTarget <= 0) {
      setError('Target amount must be a positive number greater than zero');
      return;
    }

    // 3. Validate Current Amount
    let numCurrent = 0;
    if (formData.currentAmount !== undefined && String(formData.currentAmount).trim() !== '') {
      numCurrent = Number(formData.currentAmount);
      if (isNaN(numCurrent) || !isFinite(numCurrent) || numCurrent < 0) {
        setError('Current amount cannot be negative');
        return;
      }
    }

    // 4. Validate Target Date (optional, but if provided must be future)
    let parsedTargetDate = null;
    if (formData.targetDate && formData.targetDate.trim() !== '') {
      const d = new Date(formData.targetDate + 'T23:59:59');
      if (isNaN(d.getTime())) {
        setError('Please select a valid target date');
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) {
        setError('Target date must be a future date');
        return;
      }
      parsedTargetDate = formData.targetDate;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        targetAmount: Math.round(numTarget * 100) / 100,
        currentAmount: Math.round(numCurrent * 100) / 100,
        targetDate: parsedTargetDate || undefined
      };

      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Failed to save savings goal');
    }
  };

  return (
    <div className="modal-overlay" id="savings-goal-form-modal">
      <div className="modal-card" style={{ maxWidth: '520px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="modal-icon-primary" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
              <PiggyBank size={22} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0 }}>
                {isEditMode ? 'Edit Savings Goal' : 'Create Savings Goal'}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isEditMode
                  ? 'Update your savings target or timeline'
                  : 'Define a dedicated target to track your financial milestone'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onCancel}
            disabled={loading}
            title="Close"
            id="savings-form-btn-close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="form-error-banner" id="savings-form-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }} id="savings-goal-form">
          {/* Goal Name Field */}
          <div className="form-group" style={{ marginBottom: '1.1rem' }}>
            <label className="form-label" htmlFor="savings-goal-name">
              <FileText size={14} />
              Goal Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="savings-goal-name"
              name="name"
              type="text"
              className="input-text"
              placeholder="e.g. Emergency Fund, New Car, Vacation"
              value={formData.name}
              onChange={handleChange}
              maxLength={100}
              disabled={loading}
              autoFocus
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              {formData.name.length}/100 characters
            </span>
          </div>

          {/* Target & Current Amount Fields (2-col grid) */}
          <div className="grid-2col" style={{ gap: '1rem', marginBottom: '1.1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="savings-goal-target">
                <DollarSign size={14} />
                Target Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="savings-goal-target"
                name="targetAmount"
                type="number"
                step="0.01"
                min="1"
                className="input-text"
                placeholder="50000"
                value={formData.targetAmount}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="savings-goal-current">
                <PiggyBank size={14} />
                Initial Saved (₹)
              </label>
              <input
                id="savings-goal-current"
                name="currentAmount"
                type="number"
                step="0.01"
                min="0"
                className="input-text"
                placeholder="0"
                value={formData.currentAmount}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Target Date Field */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="savings-goal-date">
              <Calendar size={14} />
              Target Completion Date (Optional)
            </label>
            <input
              id="savings-goal-date"
              name="targetDate"
              type="date"
              className="input-text"
              value={formData.targetDate}
              onChange={handleChange}
              disabled={loading}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Setting a target date helps you track your timeline and milestones.
            </span>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={onCancel}
              disabled={loading}
              id="savings-form-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              id="savings-form-btn-submit"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Saving...</span>
                </>
              ) : isEditMode ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Update Goal</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Create Goal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
