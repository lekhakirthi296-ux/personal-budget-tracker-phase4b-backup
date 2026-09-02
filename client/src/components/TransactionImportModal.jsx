import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Smartphone, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Calendar, 
  Tag, 
  CreditCard, 
  FileText,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { transactionsApi } from '../services/api';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants/categories';
import { formatCurrency, formatDate } from '../utils/formatters';

const SAMPLE_PRESETS = [
  {
    label: 'UPI ₹450 Expense',
    text: '₹450 spent at ABC Store via UPI on 31 Aug 2026'
  },
  {
    label: 'Swiggy ₹680 Food',
    text: 'A/C *1234 debited by Rs 680.00 on 28-Aug-2026 towards Swiggy UPI:swiggy@icici'
  },
  {
    label: 'Salary ₹50,000 Credit',
    text: 'Your A/C *4829 is credited with Rs 50,000.00 on 01-Sep-2026 by Monthly Salary'
  },
  {
    label: 'Uber ₹320 Commute',
    text: 'Rs 320.00 paid for Uber ride via Debit Card ending 4412 on 29-Aug-2026'
  }
];

export default function TransactionImportModal({ isOpen, onClose, onSuccess }) {
  const [rawText, setRawText] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Detection State
  const [detectedData, setDetectedData] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState(null);

  // Editable Form State after detection
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
    description: '',
    source: 'sms'
  });

  if (!isOpen) return null;

  const handleApplyPreset = (sampleText) => {
    setRawText(sampleText);
    setError(null);
  };

  const handleDetect = async (e) => {
    if (e) e.preventDefault();
    if (!rawText.trim()) {
      setError('Please paste SMS or transaction notification text to scan.');
      return;
    }

    setDetecting(true);
    setError(null);
    try {
      const response = await transactionsApi.detectImport(rawText.trim());
      if (response && response.success && response.data) {
        const { detected, confidence: conf, duplicateCheck: dup } = response.data;
        setDetectedData(detected);
        setConfidence(conf);
        setDuplicateCheck(dup);

        // Populate editable form
        setFormData({
          type: detected.type || 'expense',
          amount: detected.amount !== undefined && detected.amount !== null ? detected.amount : '',
          category: detected.category || (detected.type === 'income' ? 'Salary' : 'Food'),
          date: detected.date || new Date().toISOString().split('T')[0],
          paymentMethod: detected.paymentMethod || 'UPI',
          description: detected.description || '',
          source: 'sms'
        });
      } else {
        setError(response?.message || 'Failed to detect transaction details.');
      }
    } catch (err) {
      setError(err.message || 'Unable to detect transaction from text. Please check connection and try again.');
    } finally {
      setDetecting(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // If type changes, adjust default category if current is not in target type list
      if (name === 'type') {
        const allowedCats = value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        if (!allowedCats.includes(prev.category)) {
          updated.category = allowedCats[0];
        }
      }
      return updated;
    });
  };

  const handleConfirmAndSave = async () => {
    // Validation
    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        type: formData.type,
        amount: numericAmount,
        category: formData.category,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        description: formData.description,
        source: 'sms'
      };

      const result = await transactionsApi.create(payload);
      if (result && result.success) {
        if (onSuccess) {
          onSuccess('Transaction imported and confirmed successfully via SMS scan!');
        }
        onClose();
      } else {
        setError(result?.message || 'Failed to save transaction.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDetection = () => {
    setDetectedData(null);
    setConfidence(null);
    setDuplicateCheck(null);
    setError(null);
  };

  const currentCategories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card-large" style={{ maxWidth: '680px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
            }}>
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <h3 className="modal-title">Smart Transaction Import</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Extract and review transaction details from SMS or notification text
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-icon-action" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body import-modal-wrapper">
          {/* Help & Privacy Notice */}
          <div className="import-help-banner">
            <Smartphone size={20} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Save time with notification import</strong>
              <span>
                Save time by importing transaction details from bank or UPI notifications. Paste the message, review the detected details, and confirm.
              </span>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={13} color="var(--success)" />
                <span>Client-side paste processing &bull; Scoped strictly to your account &bull; No silent phone SMS scraping</span>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert-banner alert-danger">
              <AlertCircle size={16} className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Paste & Detection Section */}
          {!detectedData ? (
            <div className="import-textarea-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Paste Bank / UPI SMS Text</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  e.g. ₹450 spent at ABC Store via UPI
                </span>
              </label>
              
              <textarea
                id="sms-paste-textarea"
                className="import-textarea"
                placeholder="Paste your transaction notification here... (e.g. 'A/C debited with Rs 450 at Coffee Shop via UPI on 31-Aug-2026')"
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  if (error) setError(null);
                }}
                disabled={detecting}
              />

              {/* Sample Presets for Quick Testing */}
              <div className="import-presets-row">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Try sample:</span>
                {SAMPLE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="import-preset-chip"
                    onClick={() => handleApplyPreset(preset.text)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={detecting}
                >
                  Cancel
                </button>
                <button
                  id="btn-detect-sms"
                  type="button"
                  className="btn-primary"
                  onClick={handleDetect}
                  disabled={detecting || !rawText.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {detecting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Scanning Text...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Detect Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Review & Edit Detected Data */
            <div className="import-review-card">
              {/* Confidence Indicator */}
              <div className="confidence-badge-wrapper">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Scan Confidence:
                  </span>
                  <span className={`confidence-chip ${
                    confidence?.level === 'high' ? 'confidence-high' :
                    confidence?.level === 'medium' ? 'confidence-medium' : 'confidence-low'
                  }`}>
                    {confidence?.level === 'high' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    <span>{confidence?.level?.toUpperCase()} CONFIDENCE ({Math.round((confidence?.score || 0.5) * 100)}%)</span>
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-link"
                  onClick={handleResetDetection}
                  style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <RotateCcw size={13} />
                  <span>Scan Different Text</span>
                </button>
              </div>

              {/* Confidence Explanations */}
              {confidence?.reasons && confidence.reasons.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {confidence.reasons.map((reason, idx) => (
                    <span key={idx} style={{
                      fontSize: '0.72rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)'
                    }}>
                      &bull; {reason}
                    </span>
                  ))}
                </div>
              )}

              {/* Low Confidence Review Warning */}
              {confidence?.level === 'low' && (
                <div className="alert-banner alert-danger" style={{ margin: 0, padding: '0.6rem 0.8rem' }}>
                  <AlertTriangle size={15} />
                  <span style={{ fontSize: '0.78rem' }}>
                    Low confidence detection. Please carefully verify the amount, date, and category below before confirming.
                  </span>
                </div>
              )}

              {/* Duplicate Detection Warning */}
              {duplicateCheck?.isDuplicate && (
                <div className="duplicate-alert">
                  <div className="duplicate-alert-header">
                    <AlertTriangle size={16} />
                    <span>Possible duplicate transaction detected!</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#fef08a' }}>
                    A matching transaction was found in your recent history:
                  </p>
                  {duplicateCheck.matchingTransaction && (
                    <div className="duplicate-match-box">
                      <span><strong>Amount:</strong> {formatCurrency(duplicateCheck.matchingTransaction.amount)}</span>
                      <span><strong>Type:</strong> {duplicateCheck.matchingTransaction.type}</span>
                      <span><strong>Category:</strong> {duplicateCheck.matchingTransaction.category}</span>
                      <span><strong>Date:</strong> {formatDate(duplicateCheck.matchingTransaction.date)}</span>
                      <span><strong>Description:</strong> {duplicateCheck.matchingTransaction.description || '-'}</span>
                    </div>
                  )}
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    You may cancel to avoid duplicating records, or review and confirm if this was an intentional repeated expense.
                  </span>
                </div>
              )}

              {/* Editable Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* Transaction Type */}
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`nav-pill-btn ${formData.type === 'expense' ? 'active' : ''}`}
                      onClick={() => handleFormChange({ target: { name: 'type', value: 'expense' } })}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <ArrowDownRight size={14} />
                      <span>Expense</span>
                    </button>
                    <button
                      type="button"
                      className={`nav-pill-btn ${formData.type === 'income' ? 'active' : ''}`}
                      onClick={() => handleFormChange({ target: { name: 'type', value: 'income' } })}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <ArrowUpRight size={14} />
                      <span>Income</span>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="form-group">
                  <label className="form-label" htmlFor="import-amount">
                    Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="input-with-icon">
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      ₹
                    </span>
                    <input
                      id="import-amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input"
                      style={{ paddingLeft: '2rem' }}
                      value={formData.amount}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label" htmlFor="import-category">
                    Category <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    id="import-category"
                    name="category"
                    className="form-input"
                    value={formData.category}
                    onChange={handleFormChange}
                    required
                  >
                    {currentCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div className="form-group">
                  <label className="form-label" htmlFor="import-paymentMethod">
                    Payment Method <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    id="import-paymentMethod"
                    name="paymentMethod"
                    className="form-input"
                    value={formData.paymentMethod}
                    onChange={handleFormChange}
                    required
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="form-group">
                  <label className="form-label" htmlFor="import-date">
                    Transaction Date <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="import-date"
                    name="date"
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                {/* Source Indicator */}
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <div style={{
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 0.75rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem'
                  }}>
                    <span className="tag-source tag-source-sms">
                      📱 SMS (Imported)
                    </span>
                  </div>
                </div>
              </div>

              {/* Description / Merchant */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="import-description">
                  Merchant / Note Description
                </label>
                <input
                  id="import-description"
                  name="description"
                  type="text"
                  maxLength={500}
                  className="form-input"
                  placeholder="e.g. Swiggy food delivery, Grocery shopping at Mart"
                  value={formData.description}
                  onChange={handleFormChange}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-import"
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirmAndSave}
                  disabled={saving || !formData.amount || parseFloat(formData.amount) <= 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Transaction...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm & Add Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
