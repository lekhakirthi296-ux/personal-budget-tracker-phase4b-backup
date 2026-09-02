const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { isMongoConnected } = require('../config/db');
const memoryStore = require('../config/inMemoryStore');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { parseTransactionText, checkDuplicateTransaction } = require('../services/transactionImportService');

/**
 * Helper to escape regex special characters
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc   Create a new manual transaction (Income or Expense)
 * @route  POST /api/transactions
 * @access Private
 */
const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, date, paymentMethod, description } = req.body;

    // 1. Validate Transaction Type
    if (!type || !['income', 'expense'].includes(type.toLowerCase())) {
      return sendError(res, 'Transaction type must be either income or expense', null, 400);
    }

    // 2. Validate Amount (Numeric, > 0, not NaN/Infinity)
    const numericAmount = Number(amount);
    if (amount === undefined || amount === null || isNaN(numericAmount) || !isFinite(numericAmount) || numericAmount <= 0) {
      return sendError(res, 'Transaction amount must be a positive number greater than zero', null, 400);
    }

    // 3. Validate Category
    if (!category || typeof category !== 'string' || !category.trim()) {
      return sendError(res, 'Please specify a transaction category', null, 400);
    }

    // 4. Validate Payment Method
    if (!paymentMethod || typeof paymentMethod !== 'string' || !paymentMethod.trim()) {
      return sendError(res, 'Please specify a payment method', null, 400);
    }

    // 5. Validate Date (Defaults to now if not provided)
    let transactionDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return sendError(res, 'Please provide a valid transaction date', null, 400);
      }
      transactionDate = parsedDate;
    }

    // 6. Validate Description
    let formattedDescription = '';
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return sendError(res, 'Description must be a text string', null, 400);
      }
      if (description.trim().length > 500) {
        return sendError(res, 'Description cannot exceed 500 characters', null, 400);
      }
      formattedDescription = description.trim();
    }

    const allowedSources = ['manual', 'sms', 'imported'];
    const selectedSource = (req.body.source && allowedSources.includes(req.body.source.toLowerCase()))
      ? req.body.source.toLowerCase()
      : 'manual';

    const txData = {
      userId: req.user._id,
      type: type.toLowerCase(),
      amount: Math.round(numericAmount * 100) / 100, // Normalized to 2 decimal places
      category: category.trim(),
      date: transactionDate,
      paymentMethod: paymentMethod.trim(),
      description: formattedDescription,
      source: selectedSource
    };

    let transaction;
    if (isMongoConnected()) {
      transaction = await Transaction.create(txData);
    } else {
      transaction = await memoryStore.createTransaction(txData);
    }

    return sendSuccess(res, 'Transaction added successfully', { transaction }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get transactions for authenticated user with filters, search, and pagination
 * @route  GET /api/transactions
 * @access Private
 */
const getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      category,
      paymentMethod,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10
    } = req.query;

    if (!isMongoConnected()) {
      const result = await memoryStore.findTransactions(req.user._id, {
        type,
        category,
        paymentMethod,
        startDate,
        endDate,
        search,
        page,
        limit
      });

      return sendSuccess(res, 'Transactions retrieved successfully', {
        transactions: result.transactions,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      }, 200);
    }

    // Base query strictly scoped to authenticated user
    const query = {
      userId: req.user._id
    };

    // Filter: Type (income/expense)
    if (type && ['income', 'expense'].includes(type.toLowerCase())) {
      query.type = type.toLowerCase();
    }

    // Filter: Category
    if (category && typeof category === 'string' && category.trim() && category.toLowerCase() !== 'all') {
      query.category = category.trim();
    }

    // Filter: Payment Method
    if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod.trim() && paymentMethod.toLowerCase() !== 'all') {
      query.paymentMethod = paymentMethod.trim();
    }

    // Filter: Date Range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          query.date.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }
    }

    // Search: Multi-field keyword query (description, category, paymentMethod)
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { description: searchRegex },
        { category: searchRegex },
        { paymentMethod: searchRegex }
      ];
    }

    // Pagination Calculation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Fetch transactions & total count in parallel
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 0;

    return sendSuccess(res, 'Transactions retrieved successfully', {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single transaction by ID for authenticated user
 * @route  GET /api/transactions/:id
 * @access Private
 */
const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 'Invalid transaction ID', null, 400);
      }

      const transaction = await Transaction.findOne({
        _id: id,
        userId: req.user._id
      }).lean();

      if (!transaction) {
        return sendError(res, 'Transaction not found or unauthorized', null, 404);
      }

      return sendSuccess(res, 'Transaction retrieved successfully', { transaction }, 200);
    } else {
      const transaction = await memoryStore.findTransactionById(id, req.user._id);
      if (!transaction) {
        return sendError(res, 'Transaction not found or unauthorized', null, 404);
      }
      return sendSuccess(res, 'Transaction retrieved successfully', { transaction }, 200);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update transaction owned by authenticated user
 * @route  PUT /api/transactions/:id
 * @access Private
 */
const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, amount, category, date, paymentMethod, description } = req.body;

    const updates = {};

    // 1. Validate & Update Type if provided
    if (type !== undefined) {
      if (!['income', 'expense'].includes(type.toLowerCase())) {
        return sendError(res, 'Transaction type must be either income or expense', null, 400);
      }
      updates.type = type.toLowerCase();
    }

    // 2. Validate & Update Amount if provided
    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || !isFinite(numericAmount) || numericAmount <= 0) {
        return sendError(res, 'Transaction amount must be a positive number greater than zero', null, 400);
      }
      updates.amount = Math.round(numericAmount * 100) / 100;
    }

    // 3. Validate & Update Category if provided
    if (category !== undefined) {
      if (typeof category !== 'string' || !category.trim()) {
        return sendError(res, 'Category cannot be empty', null, 400);
      }
      updates.category = category.trim();
    }

    // 4. Validate & Update Payment Method if provided
    if (paymentMethod !== undefined) {
      if (typeof paymentMethod !== 'string' || !paymentMethod.trim()) {
        return sendError(res, 'Payment method cannot be empty', null, 400);
      }
      updates.paymentMethod = paymentMethod.trim();
    }

    // 5. Validate & Update Date if provided
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return sendError(res, 'Please provide a valid transaction date', null, 400);
      }
      updates.date = parsedDate;
    }

    // 6. Validate & Update Description if provided
    if (description !== undefined) {
      if (typeof description !== 'string') {
        return sendError(res, 'Description must be a text string', null, 400);
      }
      if (description.trim().length > 500) {
        return sendError(res, 'Description cannot exceed 500 characters', null, 400);
      }
      updates.description = description.trim();
    }

    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 'Invalid transaction ID', null, 400);
      }

      const transaction = await Transaction.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!transaction) {
        return sendError(res, 'Transaction not found or unauthorized', null, 404);
      }

      Object.assign(transaction, updates);
      await transaction.save();

      return sendSuccess(res, 'Transaction updated successfully', { transaction }, 200);
    } else {
      const transaction = await memoryStore.updateTransaction(id, req.user._id, updates);
      if (!transaction) {
        return sendError(res, 'Transaction not found or unauthorized', null, 404);
      }
      return sendSuccess(res, 'Transaction updated successfully', { transaction }, 200);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete transaction owned by authenticated user
 * @route  DELETE /api/transactions/:id
 * @access Private
 */
const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 'Invalid transaction ID', null, 400);
      }

      const transaction = await Transaction.findOneAndDelete({
        _id: id,
        userId: req.user._id
      });

      if (!transaction) {
        return sendError(res, 'Transaction not found or unauthorized', null, 404);
      }

      return sendSuccess(res, 'Transaction deleted successfully', null, 200);
    } else {
      const deleted = await memoryStore.deleteTransaction(id, req.user._id);
      if (!deleted) {
        return sendError(res, 'Transaction not found or unauthorized', null, 404);
      }
      return sendSuccess(res, 'Transaction deleted successfully', null, 200);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Parse and detect transaction details from raw SMS / notification text
 * @route  POST /api/transactions/import/detect
 * @access Private
 */
const detectImportedTransaction = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return sendError(res, 'Please provide transaction text or SMS message to detect', null, 400);
    }

    // 1. Parse SMS text to extract candidate transaction fields & confidence score
    const parseResult = parseTransactionText(text);

    if (!parseResult.success) {
      return sendError(res, parseResult.error || 'Failed to detect transaction details', null, 400);
    }

    // 2. Check for duplicate transactions in user's history
    const duplicateCheck = await checkDuplicateTransaction(req.user._id, parseResult.detected);

    return sendSuccess(res, 'Transaction details detected successfully', {
      detected: parseResult.detected,
      confidence: parseResult.confidence,
      duplicateCheck: {
        isDuplicate: duplicateCheck.isDuplicate,
        duplicateWarning: duplicateCheck.duplicateWarning,
        matchingTransaction: duplicateCheck.matchingTransaction
      }
    }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  detectImportedTransaction
};

