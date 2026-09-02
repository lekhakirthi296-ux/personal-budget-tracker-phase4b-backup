const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const { isMongoConnected } = require('../config/db');
const memoryStore = require('../config/inMemoryStore');

const DEMO_EMAIL = 'demo@budgettracker.app';
const DEMO_NAME = 'Demo User';

/**
 * Generates sample data fixtures for demo user
 * @param {string|ObjectId} userId 
 */
const getDemoFixtures = (userId) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  const transactions = [
    {
      userId,
      type: 'income',
      amount: 65000,
      category: 'Salary',
      date: new Date(year, month - 1, 1, 10, 0, 0),
      paymentMethod: 'Bank Transfer',
      description: 'Monthly Salary Credit',
      source: 'manual'
    },
    {
      userId,
      type: 'income',
      amount: 18500,
      category: 'Freelance',
      date: new Date(year, month - 1, 8, 14, 30, 0),
      paymentMethod: 'UPI',
      description: 'UI/UX Design Consulting Project',
      source: 'manual'
    },
    {
      userId,
      type: 'income',
      amount: 4200,
      category: 'Investments',
      date: new Date(year, month - 1, 15, 11, 0, 0),
      paymentMethod: 'Bank Transfer',
      description: 'Mutual Fund Dividend Distribution',
      source: 'manual'
    },
    {
      userId,
      type: 'expense',
      amount: 22000,
      category: 'Housing',
      date: new Date(year, month - 1, 2, 9, 15, 0),
      paymentMethod: 'Bank Transfer',
      description: 'Apartment Monthly Rent',
      source: 'manual'
    },
    {
      userId,
      type: 'expense',
      amount: 6400,
      category: 'Food',
      date: new Date(year, month - 1, 5, 18, 20, 0),
      paymentMethod: 'Debit Card',
      description: 'Organic Supermarket & Fresh Groceries',
      source: 'manual'
    },
    {
      userId,
      type: 'expense',
      amount: 3800,
      category: 'Food',
      date: new Date(year, month - 1, 12, 20, 45, 0),
      paymentMethod: 'Credit Card',
      description: 'Weekend Dining & Artisan Coffee',
      source: 'sms'
    },
    {
      userId,
      type: 'expense',
      amount: 3200,
      category: 'Transportation',
      date: new Date(year, month - 1, 9, 8, 30, 0),
      paymentMethod: 'UPI',
      description: 'Metro Card Reload & Fuel',
      source: 'sms'
    },
    {
      userId,
      type: 'expense',
      amount: 3100,
      category: 'Utilities',
      date: new Date(year, month - 1, 7, 16, 0, 0),
      paymentMethod: 'Net Banking',
      description: 'High-speed Fiber Internet & Electric Bill',
      source: 'manual'
    },
    {
      userId,
      type: 'expense',
      amount: 1800,
      category: 'Entertainment',
      date: new Date(year, month - 1, 14, 21, 15, 0),
      paymentMethod: 'Credit Card',
      description: 'Streaming Subscriptions & Movie Tickets',
      source: 'manual'
    },
    {
      userId,
      type: 'expense',
      amount: 1500,
      category: 'Healthcare',
      date: new Date(year, month - 1, 18, 12, 10, 0),
      paymentMethod: 'UPI',
      description: 'Pharmacy & Wellness Supplements',
      source: 'manual'
    }
  ];

  const budgets = [
    {
      userId,
      category: 'Housing',
      amount: 25000,
      month,
      year
    },
    {
      userId,
      category: 'Food',
      amount: 14000,
      month,
      year
    },
    {
      userId,
      category: 'Transportation',
      amount: 4500,
      month,
      year
    },
    {
      userId,
      category: 'Utilities',
      amount: 3500,
      month,
      year
    },
    {
      userId,
      category: 'Entertainment',
      amount: 3000,
      month,
      year
    }
  ];

  const savingsGoals = [
    {
      userId,
      name: 'Emergency Fund',
      targetAmount: 150000,
      currentAmount: 95000,
      targetDate: new Date(year, month + 5, 1)
    },
    {
      userId,
      name: 'New Laptop / Tech Upgrade',
      targetAmount: 75000,
      currentAmount: 75000,
      targetDate: new Date(year, month, 1)
    },
    {
      userId,
      name: 'Japan Vacation Fund',
      targetAmount: 120000,
      currentAmount: 42000,
      targetDate: new Date(year, month + 8, 1)
    }
  ];

  return { transactions, budgets, savingsGoals };
};

/**
 * Gets or creates the dedicated Demo User and ensures realistic sample data exists
 */
const getOrCreateDemoAccount = async () => {
  if (isMongoConnected()) {
    let demoUser = await User.findOne({ email: DEMO_EMAIL });

    if (!demoUser) {
      const randomPassword = crypto.randomBytes(24).toString('hex') + 'D3m0!';
      demoUser = await User.create({
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        password: randomPassword
      });
    }

    const { transactions, budgets, savingsGoals } = getDemoFixtures(demoUser._id);

    // Seed transactions if empty
    const txCount = await Transaction.countDocuments({ userId: demoUser._id });
    if (txCount === 0) {
      await Transaction.insertMany(transactions);
    }

    // Seed budgets if empty
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const budgetCount = await Budget.countDocuments({ 
      userId: demoUser._id, 
      month: currentMonth, 
      year: currentYear 
    });
    if (budgetCount === 0) {
      for (const b of budgets) {
        await Budget.create(b);
      }
    }

    // Seed savings goals if empty
    const savingsCount = await SavingsGoal.countDocuments({ userId: demoUser._id });
    if (savingsCount === 0) {
      await SavingsGoal.insertMany(savingsGoals);
    }

    return {
      id: demoUser._id,
      name: demoUser.name,
      email: demoUser.email,
      isDemo: true
    };
  } else {
    // In-memory fallback
    let demoUser = await memoryStore.findUserByEmail(DEMO_EMAIL);

    if (!demoUser) {
      demoUser = await memoryStore.createUser({
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        password: 'demo_password_secure'
      });
    }

    const { transactions, budgets, savingsGoals } = getDemoFixtures(demoUser._id);

    // Seed transactions in memory if empty
    const existingTx = await memoryStore.findTransactions(demoUser._id);
    if (!existingTx.transactions || existingTx.transactions.length === 0) {
      for (const tx of transactions) {
        await memoryStore.createTransaction(tx);
      }
    }

    // Seed budgets in memory if empty
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const existingBudgets = await memoryStore.findBudgets(demoUser._id, currentMonth, currentYear);
    if (!existingBudgets || existingBudgets.length === 0) {
      for (const b of budgets) {
        await memoryStore.createBudget(b);
      }
    }

    // Seed savings goals in memory if empty
    const existingSavings = await memoryStore.findSavingsGoals(demoUser._id);
    if (!existingSavings || existingSavings.length === 0) {
      for (const s of savingsGoals) {
        await memoryStore.createSavingsGoal(s);
      }
    }

    return {
      id: demoUser._id,
      name: demoUser.name,
      email: demoUser.email,
      isDemo: true
    };
  }
};

module.exports = {
  DEMO_EMAIL,
  DEMO_NAME,
  getOrCreateDemoAccount,
  getDemoFixtures
};
