const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');

// All transaction endpoints require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/transactions
 * @desc    Create a new manual income/expense transaction
 * @access  Private
 */
router.post('/', transactionController.createTransaction);

/**
 * @route   GET /api/transactions
 * @desc    Get user's transactions with filtering, search, and pagination
 * @access  Private
 */
router.get('/', transactionController.getTransactions);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get a single transaction by ID
 * @access  Private
 */
router.get('/:id', transactionController.getTransactionById);

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update an existing transaction owned by authenticated user
 * @access  Private
 */
router.put('/:id', transactionController.updateTransaction);

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete a transaction owned by authenticated user
 * @access  Private
 */
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
