/**
 * Utility formatting helpers for currency and dates
 */

/**
 * Format numeric value to INR currency string (₹)
 * @param {number} amount 
 * @param {boolean} includeSign 
 * @returns {string} e.g. "₹25,000.00"
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format Date to readable string (e.g., "01 Sep 2026")
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d);
};

/**
 * Format Date object to YYYY-MM-DD input string
 * @param {Date|string} date 
 * @returns {string} e.g. "2026-09-01"
 */
export const toDateInputString = (date) => {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export default {
  formatCurrency,
  formatDate,
  toDateInputString
};
