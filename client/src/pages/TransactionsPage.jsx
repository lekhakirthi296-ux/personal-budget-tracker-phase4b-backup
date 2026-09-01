import React, { useState, useEffect, useCallback } from 'react';
import { transactionsApi } from '../services/api';
import TransactionForm from '../components/TransactionForm';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants/categories';
import { 
  Plus, 
  Search, 
  Filter, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Calendar,
  CreditCard,
  Tag
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    category: 'all',
    paymentMethod: 'all',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10
  });

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransaction, setDeletingTransaction] = useState(null);

  // Fetch Transactions from Server
  const fetchTransactions = useCallback(async (currentFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await transactionsApi.getAll(currentFilters);
      if (response && response.success && response.data) {
        setTransactions(response.data.transactions || []);
        setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search & filter trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTransactions(filters);
    }, 250);

    return () => clearTimeout(handler);
  }, [filters, fetchTransactions]);

  // Clear Success Message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1 // Reset to page 1 on filter change
    }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setFilters((prev) => ({ ...prev, page: newPage }));
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      category: 'all',
      paymentMethod: 'all',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 10
    });
  };

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.type !== 'all' || 
    filters.category !== 'all' || 
    filters.paymentMethod !== 'all' || 
    filters.startDate !== '' || 
    filters.endDate !== '';

  // Create or Update Transaction Submit Handler
  const handleSaveTransaction = async (formData) => {
    setActionLoading(true);
    try {
      if (editingTransaction) {
        // Update existing
        await transactionsApi.update(editingTransaction._id, formData);
        setSuccessMessage('Transaction updated successfully');
      } else {
        // Create new
        await transactionsApi.create(formData);
        setSuccessMessage('Transaction added successfully');
      }
      setIsFormOpen(false);
      setEditingTransaction(null);
      fetchTransactions(filters);
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Transaction Handler
  const handleDeleteConfirm = async (id) => {
    setActionLoading(true);
    try {
      await transactionsApi.delete(id);
      setSuccessMessage('Transaction deleted successfully');
      setDeletingTransaction(null);
      fetchTransactions(filters);
    } catch (err) {
      setError(err.message || 'Failed to delete transaction');
    } finally {
      setActionLoading(false);
    }
  };

  const allCategories = [
    ...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])
  ].sort();

  return (
    <div className="transactions-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h2 className="section-title">Transactions</h2>
          <p className="section-subtitle">
            Manage, filter, and track all your manual incomes and expenses.
          </p>
        </div>

        <button
          id="btn-add-transaction-open"
          className="btn-primary"
          onClick={() => {
            setEditingTransaction(null);
            setIsFormOpen(true);
          }}
        >
          <Plus size={18} />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="alert-banner alert-success" id="tx-success-alert">
          <CheckCircle2 size={18} className="alert-icon" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="alert-banner alert-danger" id="tx-error-alert">
          <AlertCircle size={18} className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-card modal-card-large">
            <TransactionForm
              initialData={editingTransaction}
              onSubmit={handleSaveTransaction}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingTransaction(null);
              }}
              loading={actionLoading}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTransaction && (
        <DeleteConfirmModal
          transaction={deletingTransaction}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingTransaction(null)}
          loading={actionLoading}
        />
      )}

      {/* Filter & Search Toolbar */}
      <div className="filter-toolbar card">
        {/* Search Bar */}
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            id="tx-search-input"
            type="text"
            className="search-input"
            placeholder="Search description, category, or payment method..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          {filters.search && (
            <button 
              type="button" 
              className="clear-search-btn"
              onClick={() => handleFilterChange('search', '')}
            >
              &times;
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="filters-row">
          {/* Type Filter */}
          <div className="filter-item">
            <label className="filter-label">Type</label>
            <select
              id="filter-type"
              className="filter-select"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="filter-item">
            <label className="filter-label">Category</label>
            <select
              id="filter-category"
              className="filter-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="all">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="filter-item">
            <label className="filter-label">Payment Method</label>
            <select
              id="filter-paymentMethod"
              className="filter-select"
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            >
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range - Start */}
          <div className="filter-item">
            <label className="filter-label">From Date</label>
            <input
              id="filter-startDate"
              type="date"
              className="filter-input-date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          {/* Date Range - End */}
          <div className="filter-item">
            <label className="filter-label">To Date</label>
            <input
              id="filter-endDate"
              type="date"
              className="filter-input-date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              id="btn-clear-filters"
              type="button"
              className="btn-outline btn-clear-filters"
              onClick={handleClearFilters}
              title="Clear all active filters"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table / Content */}
      <div className="card table-card">
        {loading ? (
          <div className="table-loading-state">
            <Loader2 size={32} className="animate-spin" color="var(--accent-primary)" />
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <Receipt size={32} color="var(--text-muted)" />
            </div>
            <h3>No Transactions Found</h3>
            <p>
              {hasActiveFilters
                ? 'No transactions match your current filters. Try changing or resetting them.'
                : "You haven't recorded any transactions yet. Start tracking your budget today!"}
            </p>
            {hasActiveFilters ? (
              <button className="btn-outline" onClick={handleClearFilters}>
                Clear All Filters
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingTransaction(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus size={16} />
                <span>Add Your First Transaction</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Payment Method</th>
                    <th>Description</th>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <tr key={tx._id} className="table-row">
                        {/* Type Badge */}
                        <td>
                          <span className={`badge-type ${isIncome ? 'badge-income' : 'badge-expense'}`}>
                            {isIncome ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            <span>{isIncome ? 'Income' : 'Expense'}</span>
                          </span>
                        </td>

                        {/* Category */}
                        <td>
                          <span className="category-cell">{tx.category}</span>
                        </td>

                        {/* Amount */}
                        <td>
                          <span className={`amount-cell ${isIncome ? 'amount-income' : 'amount-expense'}`}>
                            {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="date-cell">
                          {formatDate(tx.date)}
                        </td>

                        {/* Payment Method */}
                        <td>
                          <span className="tag">{tx.paymentMethod || 'Cash'}</span>
                        </td>

                        {/* Description */}
                        <td className="description-cell" title={tx.description || ''}>
                          {tx.description ? tx.description : <span className="text-muted-dash">-</span>}
                        </td>

                        {/* Source */}
                        <td>
                          <span className="tag-source">
                            ✍ Manual
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => {
                                setEditingTransaction(tx);
                                setIsFormOpen(true);
                              }}
                              title="Edit Transaction"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action btn-icon-delete"
                              onClick={() => setDeletingTransaction(tx)}
                              title="Delete Transaction"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pagination-bar">
                <div className="pagination-info">
                  Showing <strong>{transactions.length}</strong> of <strong>{pagination.total}</strong> transactions
                </div>

                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn-pagination"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>

                  <span className="page-indicator">
                    Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    className="btn-pagination"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    title="Next Page"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
