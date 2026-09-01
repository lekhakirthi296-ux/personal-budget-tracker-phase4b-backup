const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// In-Memory Database collections for fallback when MongoDB is offline
const users = [];
const transactions = [];
const budgets = [];

// Helper to generate mongo-like hex IDs
const generateId = () => crypto.randomBytes(12).toString('hex');

// Seed default demo user
(async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const demoUser = {
    _id: generateId(),
    name: 'Demo User',
    email: 'demo@example.com',
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
    async matchPassword(enteredPassword) {
      return await bcrypt.compare(enteredPassword, this.password);
    }
  };
  users.push(demoUser);

  // Seed some initial demo transactions for nice preview
  const now = new Date();
  const tx1 = {
    _id: generateId(),
    userId: demoUser._id,
    type: 'income',
    amount: 50000,
    category: 'Salary',
    date: new Date(now.getFullYear(), now.getMonth(), 1),
    paymentMethod: 'Bank Transfer',
    description: 'Monthly Salary Credit',
    source: 'manual',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const tx2 = {
    _id: generateId(),
    userId: demoUser._id,
    type: 'expense',
    amount: 4500,
    category: 'Food',
    date: new Date(now.getFullYear(), now.getMonth(), 5),
    paymentMethod: 'UPI',
    description: 'Grocery shopping',
    source: 'manual',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const tx3 = {
    _id: generateId(),
    userId: demoUser._id,
    type: 'expense',
    amount: 2200,
    category: 'Transportation',
    date: new Date(now.getFullYear(), now.getMonth(), 10),
    paymentMethod: 'Debit Card',
    description: 'Fuel & Commute',
    source: 'manual',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  transactions.push(tx1, tx2, tx3);

  // Seed sample budget
  const b1 = {
    _id: generateId(),
    userId: demoUser._id,
    category: 'Food',
    amount: 10000,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const b2 = {
    _id: generateId(),
    userId: demoUser._id,
    category: 'Transportation',
    amount: 5000,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  budgets.push(b1, b2);
})();

const memoryStore = {
  users,
  transactions,
  budgets,
  generateId,

  // User operations
  findUserByEmail: async (email) => {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  findUserById: async (id) => {
    return users.find((u) => String(u._id) === String(id)) || null;
  },
  createUser: async ({ name, email, password }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      _id: generateId(),
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      async matchPassword(enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
      }
    };
    users.push(user);
    return user;
  },

  // Transaction operations
  findTransactions: async (userId, filters = {}) => {
    let list = transactions.filter((t) => String(t.userId) === String(userId));

    if (filters.type && ['income', 'expense'].includes(filters.type)) {
      list = list.filter((t) => t.type === filters.type);
    }
    if (filters.category && filters.category !== 'all') {
      list = list.filter((t) => t.category === filters.category);
    }
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      list = list.filter((t) => t.paymentMethod === filters.paymentMethod);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter((t) => new Date(t.date) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((t) => new Date(t.date) <= end);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description && t.description.toLowerCase().includes(s)) ||
          (t.category && t.category.toLowerCase().includes(s)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(s))
      );
    }

    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = list.length;
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const paged = list.slice(skip, skip + limit);
    return { transactions: paged, total, page, limit, totalPages: Math.ceil(total / limit) || 0 };
  },

  findTransactionById: async (id, userId) => {
    return transactions.find((t) => String(t._id) === String(id) && String(t.userId) === String(userId)) || null;
  },

  createTransaction: async (data) => {
    const tx = {
      _id: generateId(),
      ...data,
      date: new Date(data.date || Date.now()),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    transactions.push(tx);
    return tx;
  },

  updateTransaction: async (id, userId, updates) => {
    const idx = transactions.findIndex((t) => String(t._id) === String(id) && String(t.userId) === String(userId));
    if (idx === -1) return null;

    transactions[idx] = {
      ...transactions[idx],
      ...updates,
      date: updates.date ? new Date(updates.date) : transactions[idx].date,
      updatedAt: new Date()
    };
    return transactions[idx];
  },

  deleteTransaction: async (id, userId) => {
    const idx = transactions.findIndex((t) => String(t._id) === String(id) && String(t.userId) === String(userId));
    if (idx === -1) return false;
    transactions.splice(idx, 1);
    return true;
  },

  // Budget operations
  findBudgets: async (userId, month, year) => {
    let list = budgets.filter((b) => String(b.userId) === String(userId));
    if (month !== undefined) {
      list = list.filter((b) => b.month === parseInt(month, 10));
    }
    if (year !== undefined) {
      list = list.filter((b) => b.year === parseInt(year, 10));
    }
    list.sort((a, b) => b.year - a.year || b.month - a.month || a.category.localeCompare(b.category));
    return list;
  },

  findBudgetById: async (id, userId) => {
    return budgets.find((b) => String(b._id) === String(id) && String(b.userId) === String(userId)) || null;
  },

  createBudget: async (data) => {
    const budget = {
      _id: generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    budgets.push(budget);
    return budget;
  },

  updateBudget: async (id, userId, updates) => {
    const idx = budgets.findIndex((b) => String(b._id) === String(id) && String(b.userId) === String(userId));
    if (idx === -1) return null;

    budgets[idx] = {
      ...budgets[idx],
      ...updates,
      updatedAt: new Date()
    };
    return budgets[idx];
  },

  deleteBudget: async (id, userId) => {
    const idx = budgets.findIndex((b) => String(b._id) === String(id) && String(b.userId) === String(userId));
    if (idx === -1) return false;
    budgets.splice(idx, 1);
    return true;
  },

  calcSpentAmount: (userId, category, month, year) => {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const total = transactions
      .filter((t) => {
        if (String(t.userId) !== String(userId)) return false;
        if (t.type !== 'expense') return false;
        if (t.category !== category) return false;
        const d = new Date(t.date);
        return d >= start && d <= end;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return Math.round(total * 100) / 100;
  }
};

module.exports = memoryStore;
