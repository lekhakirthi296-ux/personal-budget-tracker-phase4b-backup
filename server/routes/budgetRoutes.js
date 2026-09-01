const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/authMiddleware');

// All budget endpoints require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/budgets
 * @desc    Create a new budget for the authenticated user
 * @access  Private
 */
router.post('/', budgetController.createBudget);

/**
 * @route   GET /api/budgets
 * @desc    Get all budgets for the authenticated user (supports ?month=&year= filters)
 * @access  Private
 */
router.get('/', budgetController.getBudgets);

/**
 * @route   GET /api/budgets/:id
 * @desc    Get a single budget by ID (must belong to authenticated user)
 * @access  Private
 */
router.get('/:id', budgetController.getBudgetById);

/**
 * @route   PUT /api/budgets/:id
 * @desc    Update a budget owned by the authenticated user
 * @access  Private
 */
router.put('/:id', budgetController.updateBudget);

/**
 * @route   DELETE /api/budgets/:id
 * @desc    Delete a budget owned by the authenticated user
 * @access  Private
 */
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;
