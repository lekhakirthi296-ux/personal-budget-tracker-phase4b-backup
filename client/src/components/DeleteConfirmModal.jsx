import React from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export default function DeleteConfirmModal({ 
  transaction, 
  onConfirm, 
  onCancel, 
  loading = false 
}) {
  if (!transaction) return null;

  return (
    <div className="modal-overlay">
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

        <h3 className="modal-title">Delete Transaction</h3>
        <p className="modal-text">
          Are you sure you want to delete this transaction? This action cannot be undone.
        </p>

        {/* Transaction Brief */}
        <div className="modal-transaction-preview">
          <div className="status-row">
            <span className="status-label">Category:</span>
            <span className="status-value">{transaction.category}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Amount:</span>
            <span className="status-value" style={{ color: transaction.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
              {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Date:</span>
            <span className="status-value">{formatDate(transaction.date)}</span>
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
            id="btn-confirm-delete"
            className="btn-danger"
            onClick={() => onConfirm(transaction._id)}
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
