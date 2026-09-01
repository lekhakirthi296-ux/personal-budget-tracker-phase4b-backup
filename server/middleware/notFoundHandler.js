const { sendError } = require('../utils/apiResponse');

/**
 * 404 Not Found Middleware for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  return sendError(res, `Cannot ${req.method} ${req.originalUrl}`, 'Resource Not Found', 404);
};

module.exports = notFoundHandler;
