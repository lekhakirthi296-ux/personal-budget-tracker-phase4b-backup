/**
 * Standard API response helper utilities
 */

/**
 * Send a standardized success response
 * @param {Object} res Express response object
 * @param {string} message Descriptive success message
 * @param {*} data Optional response payload
 * @param {number} statusCode HTTP status code (default: 200)
 */
const sendSuccess = (res, message, data = null, statusCode = 200) => {
  const payload = {
    success: true,
    message
  };

  if (data !== null && data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

/**
 * Send a standardized error response
 * @param {Object} res Express response object
 * @param {string} message High-level error summary
 * @param {string|Object} error Error details or message
 * @param {number} statusCode HTTP status code (default: 500)
 */
const sendError = (res, message, error = null, statusCode = 500) => {
  const payload = {
    success: false,
    message
  };

  if (error !== null && error !== undefined) {
    payload.error = typeof error === 'object' && error.message ? error.message : error;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError
};
