const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the UTC start and end Date objects for a given month/year.
 * Month is 1-indexed (January = 1).
 */
const monthBounds = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  // Day 0 of the next month is the last day of this month
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
};

/**
 * Aggregate the total expense amount for the authenticated user in a specific
 * category during the given month/year. Income transactions are intentionally
 * excluded. Transactions belonging to other users are never included because
 * the query always filters by req.user._id.
 *
 * @param {ObjectId} userId  - Authenticated user's _id
 * @param {string}   category
 * @param {number}   month   - 1–12
 * @param {number}   year
 * @returns {Promise<number>} Total spent (≥ 0, rounded to 2 dp)
 */
const calcSpentAmount = async (userId, category, month, year) => {
  const { start, end } = monthBounds(month, year);

  const result = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(String(userId)),
        type: 'expense',          // Income MUST NOT affect budget spending
        category: category,       // Exact category match
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  const raw = result.length > 0 ? result[0].total : 0;
  return Math.round(raw * 100) / 100;
};

/**
 * Enrich a raw budget document (plain object from .lean()) with the computed
 * spend-related fields.
 */
const enrichBudget = async (budget) => {
  const spentAmount = await calcSpentAmount(
    budget.userId,
    budget.category,
    budget.month,
    budget.year
  );

  const budgetAmount = Math.round(budget.amount * 100) / 100;
  const remainingAmount = Math.round((budgetAmount - spentAmount) * 100) / 100;
  const utilizationPercentage =
    budgetAmount > 0
      ? Math.round((spentAmount / budgetAmount) * 10000) / 100 // 2 dp
      : 0;

  const status =
    utilizationPercentage > 100
      ? 'OVER_BUDGET'
      : utilizationPercentage >= 80
      ? 'WARNING'
      : 'NORMAL';

  return {
    ...budget,
    budgetAmount,
    spentAmount,
    remainingAmount,
    utilizationPercentage,
    percentageUsed: utilizationPercentage,
    status,
    isOverBudget: spentAmount > budgetAmount
  };
};

// ---------------------------------------------------------------------------
// Controller Actions
// ---------------------------------------------------------------------------

/**
 * @desc   Create a new budget for the authenticated user
 * @route  POST /api/budgets
 * @access Private
 */
const createBudget = async (req, res, next) => {
  try {
    const { category, amount, month, year } = req.body;

    // 1. Validate category
    if (!category || typeof category !== 'string' || !category.trim()) {
      return sendError(res, 'Please provide a valid budget category', null, 400);
    }

    // 2. Validate amount
    const numericAmount = Number(amount);
    if (
      amount === undefined ||
      amount === null ||
      isNaN(numericAmount) ||
      !isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return sendError(
        res,
        'Budget amount must be a positive number greater than zero',
        null,
        400
      );
    }

    // 3. Validate month
    const numericMonth = parseInt(month, 10);
    if (isNaN(numericMonth) || numericMonth < 1 || numericMonth > 12) {
      return sendError(res, 'Month must be a number between 1 and 12', null, 400);
    }

    // 4. Validate year
    const numericYear = parseInt(year, 10);
    if (isNaN(numericYear) || numericYear < 2000 || numericYear > 2100) {
      return sendError(res, 'Year must be a valid 4-digit year (2000–2100)', null, 400);
    }

    // 5. Check for duplicate (user + category + month + year) before hitting DB
    const existing = await Budget.findOne({
      userId: req.user._id,
      category: category.trim(),
      month: numericMonth,
      year: numericYear
    });
    if (existing) {
      return sendError(
        res,
        `A budget for '${category.trim()}' in ${numericMonth}/${numericYear} already exists`,
        null,
        409
      );
    }

    // 6. Persist – userId is always taken from the authenticated session
    const budget = await Budget.create({
      userId: req.user._id,
      category: category.trim(),
      amount: Math.round(numericAmount * 100) / 100,
      month: numericMonth,
      year: numericYear
    });

    const enriched = await enrichBudget(budget.toObject());

    return sendSuccess(res, 'Budget created successfully', { budget: enriched }, 201);
  } catch (error) {
    // Mongoose duplicate key (race condition fallback)
    if (error.code === 11000) {
      return sendError(
        res,
        'A budget for this category and month/year already exists',
        null,
        409
      );
    }
    next(error);
  }
};

/**
 * @desc   Get all budgets for the authenticated user (with optional month/year filter)
 * @route  GET /api/budgets
 * @access Private
 */
const getBudgets = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    // Base query — always scoped to authenticated user
    const query = { userId: req.user._id };

    // Optional month/year filter
    if (month !== undefined || year !== undefined) {
      if (month !== undefined) {
        const m = parseInt(month, 10);
        if (isNaN(m) || m < 1 || m > 12) {
          return sendError(res, 'Month must be a number between 1 and 12', null, 400);
        }
        query.month = m;
      }
      if (year !== undefined) {
        const y = parseInt(year, 10);
        if (isNaN(y) || y < 2000 || y > 2100) {
          return sendError(res, 'Year must be a valid 4-digit year (2000–2100)', null, 400);
        }
        query.year = y;
      }
    }

    const rawBudgets = await Budget.find(query)
      .sort({ year: -1, month: -1, category: 1 })
      .lean();

    // Enrich all budgets in parallel
    const budgets = await Promise.all(rawBudgets.map(enrichBudget));

    return sendSuccess(res, 'Budgets retrieved successfully', { budgets }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get a single budget by ID for the authenticated user
 * @route  GET /api/budgets/:id
 * @access Private
 */
const getBudgetById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid budget ID', null, 400);
    }

    const raw = await Budget.findOne({
      _id: id,
      userId: req.user._id   // Strict ownership — other users' budgets are invisible
    }).lean();

    if (!raw) {
      return sendError(res, 'Budget not found or unauthorized', null, 404);
    }

    const budget = await enrichBudget(raw);

    return sendSuccess(res, 'Budget retrieved successfully', { budget }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update a budget owned by the authenticated user
 * @route  PUT /api/budgets/:id
 * @access Private
 */
const updateBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, amount, month, year } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid budget ID', null, 400);
    }

    // Find budget ensuring strict user ownership
    const budget = await Budget.findOne({ _id: id, userId: req.user._id });

    if (!budget) {
      return sendError(res, 'Budget not found or unauthorized', null, 404);
    }

    // Track whether uniqueness-relevant fields changed
    let newCategory = budget.category;
    let newMonth = budget.month;
    let newYear = budget.year;

    // 1. Validate & update category
    if (category !== undefined) {
      if (typeof category !== 'string' || !category.trim()) {
        return sendError(res, 'Category cannot be empty', null, 400);
      }
      newCategory = category.trim();
      budget.category = newCategory;
    }

    // 2. Validate & update amount
    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || !isFinite(numericAmount) || numericAmount <= 0) {
        return sendError(
          res,
          'Budget amount must be a positive number greater than zero',
          null,
          400
        );
      }
      budget.amount = Math.round(numericAmount * 100) / 100;
    }

    // 3. Validate & update month
    if (month !== undefined) {
      const m = parseInt(month, 10);
      if (isNaN(m) || m < 1 || m > 12) {
        return sendError(res, 'Month must be a number between 1 and 12', null, 400);
      }
      newMonth = m;
      budget.month = newMonth;
    }

    // 4. Validate & update year
    if (year !== undefined) {
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 2000 || y > 2100) {
        return sendError(res, 'Year must be a valid 4-digit year (2000–2100)', null, 400);
      }
      newYear = y;
      budget.year = newYear;
    }

    // 5. Check uniqueness constraint for new key combination (excluding self)
    const duplicate = await Budget.findOne({
      userId: req.user._id,
      category: newCategory,
      month: newMonth,
      year: newYear,
      _id: { $ne: budget._id }
    });
    if (duplicate) {
      return sendError(
        res,
        `A budget for '${newCategory}' in ${newMonth}/${newYear} already exists`,
        null,
        409
      );
    }

    await budget.save();

    const enriched = await enrichBudget(budget.toObject());

    return sendSuccess(res, 'Budget updated successfully', { budget: enriched }, 200);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(
        res,
        'A budget for this category and month/year already exists',
        null,
        409
      );
    }
    next(error);
  }
};

/**
 * @desc   Delete a budget owned by the authenticated user
 * @route  DELETE /api/budgets/:id
 * @access Private
 */
const deleteBudget = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid budget ID', null, 400);
    }

    const budget = await Budget.findOneAndDelete({
      _id: id,
      userId: req.user._id   // Prevents deleting another user's budget
    });

    if (!budget) {
      return sendError(res, 'Budget not found or unauthorized', null, 404);
    }

    return sendSuccess(res, 'Budget deleted successfully', null, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget
};
