const Transaction = require('../models/Transaction');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * @desc   Get calculated financial summary (Total Income, Total Expenses, Balance)
 * @route  GET /api/dashboard/summary
 * @access Private
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const query = {
      userId: req.user._id
    };

    let selectedMonth = null;
    let selectedYear = null;

    // Optional Date Filtering by Month & Year
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);

      if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 2000 || y > 2100) {
        return sendError(res, 'Invalid month (1-12) or year provided', null, 400);
      }

      selectedMonth = m;
      selectedYear = y;

      // Start & End of the target month in UTC
      const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (year) {
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 2000 || y > 2100) {
        return sendError(res, 'Invalid year provided', null, 400);
      }

      selectedYear = y;
      const startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));

      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Fetch user's matching transactions and recent 5 transactions
    const [transactions, recentTransactions] = await Promise.all([
      Transaction.find(query).select('type amount category date').lean(),
      Transaction.find({ userId: req.user._id })
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions) {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount;
      }
    }

    totalIncome = Math.round(totalIncome * 100) / 100;
    totalExpenses = Math.round(totalExpenses * 100) / 100;
    const balance = Math.round((totalIncome - totalExpenses) * 100) / 100;

    return sendSuccess(res, 'Dashboard summary retrieved successfully', {
      totalIncome,
      totalExpenses,
      balance,
      transactionCount: transactions.length,
      recentTransactions,
      month: selectedMonth,
      year: selectedYear
    }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary
};
