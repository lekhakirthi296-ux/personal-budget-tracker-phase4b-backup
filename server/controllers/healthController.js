const { sendSuccess } = require('../utils/apiResponse');

/**
 * @desc   Check API server status and health
 * @route  GET /api/health
 * @access Public
 */
const getHealthStatus = (req, res) => {
  return sendSuccess(res, 'Personal Budget Tracker API is running');
};

module.exports = {
  getHealthStatus
};
