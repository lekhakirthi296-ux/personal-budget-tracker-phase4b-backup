import React, { useState, useEffect } from 'react';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants/categories';
import { toDateInputString } from '../utils/formatters';
import { 
  DollarSign, 
  Tag, 
  Calendar, 
  CreditCard, 
  FileText, 
  PlusCircle, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function TransactionForm({ 
  initialData = null, 
  onSubmit, 
  onCancel, 
  loading = false 
}) {
  const isEditMode = Boolean(initialData && initialData._id);

  const [formData, setFormData] = useState({
    type: initialData?.type || 'expense',
    amount: initialData?.amount !== undefined ? String(initialData.amount) : '',
    category: initialData?.category || EXPENSE_CATEGORIES[0],
    date: toDateInputString(initialData?.date),
    paymentMethod: initialData?.paymentMethod || PAYMENT_METHODS[0],
    description: initialData?.description || ''
  });

  const [error, setError] = useState(null);

  // When type changes, adjust default category if current category does not belong to new type
  const handleTypeChange = (newType) => {
    const defaultCategory = newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
    setFormData((prev) => ({
      ...prev,
      type: newType,
      category: defaultCategory
    }));
    if (error) setError(null);
  };

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

    // 1. Amount validation
    if (!formData.amount || !formData.amount.trim()) {
      setError('Please enter a transaction amount');
      return;
    }

    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      setError('Amount must be a valid positive number greater than zero');
      return;
    }

    // 2. Category validation
    if (!formData.category || !formData.category.trim()) {
      setError('Please select a category');
      return;
    }

    // 3. Date validation
    if (!formData.date) {
      setError('Please select a date');
      return;
    }

    const parsedDate = new Date(formData.date);
    if (isNaN(parsedDate.getTime())) {
      setError('Please enter a valid date');
      return;
    }

    // 4. Payment Method validation
    if (!formData.paymentMethod || !formData.paymentMethod.trim()) {
      setError('Please select a payment method');
      return;
    }

    try {
      await onSubmit({
        type: formData.type,
        amount: Math.round(numAmount * 100) / 100,
        category: formData.category.trim(),
        date: formData.date,
        paymentMethod: formData.paymentMethod.trim(),
        description: formData.description.trim()
      });
    } catch (err) {
      setError(err.message || 'Failed to save transaction');
    }
  };

  const categories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="transaction-form-wrapper">
      <div className="form-card-header">
        <div>
          <h3 className="card-title">
            {isEditMode ? 'Edit Transaction' : 'Record New Transaction'}
          </h3>
          <p className="card-subtitle">
            {isEditMode 
              ? 'Update the details of your recorded transaction.' 
              : 'Add an income or expense to keep your budget up-to-date.'}
          </p>
        </div>
        {onCancel && (
          <button 
            type="button" 
            className="btn-icon" 
            onClick={onCancel}
            title="Cancel"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Type Toggle Buttons */}
        <div className="form-group">
          <label className="form-label">Transaction Type</label>
          <div className="type-toggle-group">
            <button
              type="button"
              id="btn-type-expense"
              className={`type-toggle-btn ${formData.type === 'expense' ? 'active-expense' : ''}`}
              onClick={() => handleTypeChange('expense')}
              disabled={loading}
            >
              <ArrowDownRight size={16} />
              <span>Expense</span>
            </button>
            <button
              type="button"
              id="btn-type-income"
              className={`type-toggle-btn ${formData.type === 'income' ? 'active-income' : ''}`}
              onClick={() => handleTypeChange('income')}
              disabled={loading}
            >
              <ArrowUpRight size={16} />
              <span>Income</span>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="form-group">
          <label htmlFor="tx-amount" className="form-label">
            Amount (₹) <span className="required-star">*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-prefix">₹</span>
            <input
              id="tx-amount"
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

        <div className="grid-2col" style={{ gap: '1rem', marginBottom: 0 }}>
          {/* Category Dropdown */}
          <div className="form-group">
            <label htmlFor="tx-category" className="form-label">
              Category <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <Tag size={18} className="input-icon" />
              <select
                id="tx-category"
                name="category"
                className="form-input form-select"
                value={formData.category}
                onChange={handleChange}
                disabled={loading}
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label htmlFor="tx-paymentMethod" className="form-label">
              Payment Method <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <CreditCard size={18} className="input-icon" />
              <select
                id="tx-paymentMethod"
                name="paymentMethod"
                className="form-input form-select"
                value={formData.paymentMethod}
                onChange={handleChange}
                disabled={loading}
                required
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Date Input */}
        <div className="form-group">
          <label htmlFor="tx-date" className="form-label">
            Date <span className="required-star">*</span>
          </label>
          <div className="input-wrapper">
            <Calendar size={18} className="input-icon" />
            <input
              id="tx-date"
              type="date"
              name="date"
              className="form-input"
              value={formData.date}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Description (Optional) */}
        <div className="form-group">
          <label htmlFor="tx-description" className="form-label">
            Description <span className="optional-label">(Optional)</span>
          </label>
          <div className="input-wrapper">
            <FileText size={18} className="input-icon textarea-icon" />
            <textarea
              id="tx-description"
              name="description"
              rows={2}
              className="form-input form-textarea"
              placeholder="Add a note (e.g. Grocery shopping at DMart)"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              maxLength={500}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions-group">
          {onCancel && (
            <button
              type="button"
              className="btn-outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            id="btn-submit-transaction"
            className="btn-primary"
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isEditMode ? 'Updating...' : 'Adding...'}</span>
              </>
            ) : (
              <>
                {isEditMode ? <CheckCircle2 size={16} /> : <PlusCircle size={16} />}
                <span>{isEditMode ? 'Update Transaction' : 'Add Transaction'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
