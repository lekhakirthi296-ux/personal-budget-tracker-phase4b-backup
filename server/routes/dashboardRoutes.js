const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// All dashboard endpoints require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/dashboard/summary
 * @desc    Get aggregated financial totals (Income, Expenses, Balance)
 * @access  Private
 */
router.get('/summary', dashboardController.getDashboardSummary);

module.exports = router;
