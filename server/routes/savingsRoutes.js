const express = require('express');
const router = express.Router();
const savingsController = require('../controllers/savingsController');
const authMiddleware = require('../middleware/authMiddleware');

// All savings routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/savings
 * @desc    Create a new savings goal for the authenticated user
 * @access  Private
 */
router.post('/', savingsController.createSavingsGoal);

/**
 * @route   GET /api/savings
 * @desc    Get all savings goals for the authenticated user
 * @access  Private
 */
router.get('/', savingsController.getSavingsGoals);

/**
 * @route   GET /api/savings/:id
 * @desc    Get a single savings goal by ID
 * @access  Private
 */
router.get('/:id', savingsController.getSavingsGoalById);

/**
 * @route   PUT /api/savings/:id
 * @desc    Update a savings goal owned by the authenticated user
 * @access  Private
 */
router.put('/:id', savingsController.updateSavingsGoal);

/**
 * @route   PATCH /api/savings/:id/contribute
 * @desc    Add a contribution to a savings goal owned by the authenticated user
 * @access  Private
 */
router.patch('/:id/contribute', savingsController.addContribution);

/**
 * @route   DELETE /api/savings/:id
 * @desc    Delete a savings goal owned by the authenticated user
 * @access  Private
 */
router.delete('/:id', savingsController.deleteSavingsGoal);

module.exports = router;
