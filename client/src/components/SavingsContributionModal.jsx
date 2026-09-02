import React, { useState } from 'react';
import {
  Coins,
  DollarSign,
  PlusCircle,
  X,
  AlertCircle,
  Loader2,
  TrendingUp,
  Target
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function SavingsContributionModal({
  goal,
  onContribute,
  onCancel,
  loading = false
}) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);

  if (!goal) return null;

  const currentAmount = Number(goal.currentAmount || 0);
  const targetAmount = Number(goal.targetAmount || 0);
  const remainingAmount = Math.max(0, targetAmount - currentAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!amount || !String(amount).trim()) {
      setError('Please enter a contribution amount');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      setError('Contribution amount must be a positive number greater than zero');
      return;
    }

    try {
      await onContribute(goal._id, Math.round(numAmount * 100) / 100);
    } catch (err) {
      setError(err.message || 'Failed to add contribution');
    }
  };

  const setQuickAmount = (val) => {
    setAmount(String(val));
    if (error) setError(null);
  };

  return (
    <div className="modal-overlay" id="savings-contribution-modal">
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="modal-icon-primary" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
              <Coins size={22} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0 }}>
                Add Contribution
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Deposit funds towards <strong style={{ color: 'var(--text-primary)' }}>{goal.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onCancel}
            disabled={loading}
            title="Close"
            id="contribution-modal-btn-close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Goal Status Summary */}
        <div className="savings-contrib-summary">
          <div className="status-row">
            <span className="status-label">Current Saved:</span>
            <span className="status-value" style={{ color: 'var(--success)', fontWeight: 700 }}>
              {formatCurrency(currentAmount)}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Target Amount:</span>
            <span className="status-value" style={{ fontWeight: 700 }}>
              {formatCurrency(targetAmount)}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Remaining to Goal:</span>
            <span className="status-value" style={{ color: remainingAmount === 0 ? 'var(--success)' : 'var(--text-primary)', fontWeight: 700 }}>
              {formatCurrency(remainingAmount)}
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="form-error-banner" id="contribution-modal-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Contribution Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }} id="contribution-form">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" htmlFor="contribution-amount">
              <DollarSign size={14} />
              Contribution Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="contribution-amount"
              type="number"
              step="0.01"
              min="1"
              className="input-text"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          {/* Quick preset buttons */}
          <div className="contrib-presets-wrap">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick add:</span>
            <div className="contrib-presets-list">
              {[500, 1000, 5000, 10000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="contrib-preset-chip"
                  onClick={() => setQuickAmount(preset)}
                  disabled={loading}
                >
                  +{formatCurrency(preset)}
                </button>
              ))}
              {remainingAmount > 0 && (
                <button
                  type="button"
                  className="contrib-preset-chip"
                  style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: 'var(--success)' }}
                  onClick={() => setQuickAmount(remainingAmount)}
                  disabled={loading}
                >
                  Full Remaining ({formatCurrency(remainingAmount)})
                </button>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={onCancel}
              disabled={loading}
              id="contribution-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              id="contribution-btn-submit"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Depositing...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Deposit Contribution</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
