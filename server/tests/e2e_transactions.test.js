/**
 * End-to-End Express HTTP Integration Test for Phase 3 Transactions & Dashboard APIs
 */

const http = require('http');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

let server;
let port;
let baseUrl;

// In-memory test store
const mockUsers = new Map();
const mockTransactions = new Map();

async function startTestServer() {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    server.close(resolve);
  });
}

// Mock User DB lookup for authMiddleware
User.findById = (id) => ({
  select: async (fields) => {
    const user = mockUsers.get(String(id));
    if (!user) return null;
    const copy = { ...user };
    if (fields && fields.includes('-password')) {
      delete copy.password;
    }
    return copy;
  }
});

// Mock Transaction DB operations
Transaction.create = async (doc) => {
  const _id = new mongoose.Types.ObjectId().toString();
  const newTx = {
    _id,
    ...doc,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: async function() {
      mockTransactions.set(this._id, this);
      return this;
    }
  };
  mockTransactions.set(_id, newTx);
  return newTx;
};

Transaction.find = (query = {}) => {
  let list = Array.from(mockTransactions.values());

  // Apply userId filter
  if (query.userId) {
    list = list.filter(t => String(t.userId) === String(query.userId));
  }

  // Apply type filter
  if (query.type) {
    list = list.filter(t => t.type === query.type);
  }

  // Apply category filter
  if (query.category) {
    list = list.filter(t => t.category === query.category);
  }

  // Apply paymentMethod filter
  if (query.paymentMethod) {
    list = list.filter(t => t.paymentMethod === query.paymentMethod);
  }

  // Apply search ($or)
  if (query.$or) {
    list = list.filter(t => {
      return query.$or.some(condition => {
        if (condition.description) return condition.description.test(t.description || '');
        if (condition.category) return condition.category.test(t.category || '');
        if (condition.paymentMethod) return condition.paymentMethod.test(t.paymentMethod || '');
        return false;
      });
    });
  }

  // Chainable mock builder
  const builder = {
    _list: list,
    sort: function() {
      this._list.sort((a, b) => new Date(b.date) - new Date(a.date));
      return this;
    },
    skip: function(n) {
      this._list = this._list.slice(n);
      return this;
    },
    limit: function(n) {
      this._list = this._list.slice(0, n);
      return this;
    },
    select: function() {
      return this;
    },
    lean: async function() {
      return this._list;
    }
  };

  return builder;
};

Transaction.countDocuments = async (query = {}) => {
  let list = Array.from(mockTransactions.values());
  if (query.userId) {
    list = list.filter(t => String(t.userId) === String(query.userId));
  }
  if (query.type) {
    list = list.filter(t => t.type === query.type);
  }
  if (query.category) {
    list = list.filter(t => t.category === query.category);
  }
  if (query.$or) {
    list = list.filter(t => {
      return query.$or.some(condition => {
        if (condition.description) return condition.description.test(t.description || '');
        if (condition.category) return condition.category.test(t.category || '');
        if (condition.paymentMethod) return condition.paymentMethod.test(t.paymentMethod || '');
        return false;
      });
    });
  }
  return list.length;
};

Transaction.findOne = (query) => {
  let matched = null;
  for (const t of mockTransactions.values()) {
    if (String(t._id) === String(query._id) && String(t.userId) === String(query.userId)) {
      matched = {
        ...t,
        save: async function() {
          mockTransactions.set(this._id, this);
          return this;
        }
      };
      break;
    }
  }

  const promise = Promise.resolve(matched);
  promise.lean = async () => matched;
  return promise;
};

Transaction.findOneAndDelete = async (query) => {
  for (const [id, t] of mockTransactions.entries()) {
    if (String(t._id) === String(query._id) && String(t.userId) === String(query.userId)) {
      mockTransactions.delete(id);
      return t;
    }
  }
  return null;
};

async function runE2ETests() {
  console.log('\n=== RUNNING COMPLETE PHASE 3 E2E HTTP INTEGRATION TESTS ===\n');
  await startTestServer();

  // Create two distinct users
  const userA_id = new mongoose.Types.ObjectId().toString();
  const userB_id = new mongoose.Types.ObjectId().toString();

  mockUsers.set(userA_id, { _id: userA_id, name: 'Alice Investor', email: 'alice@example.com' });
  mockUsers.set(userB_id, { _id: userB_id, name: 'Bob Spender', email: 'bob@example.com' });

  const tokenUserA = jwt.sign({ userId: userA_id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  const tokenUserB = jwt.sign({ userId: userB_id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  try {
    // 1. Unauthenticated request to /api/transactions
    console.log('[Test 1] Unauthenticated request to /api/transactions');
    const unauthRes = await fetch(`${baseUrl}/api/transactions`);
    assert.strictEqual(unauthRes.status, 401);
    console.log('  ✓ PASS: Unauthenticated access rejected with 401');

    // 2. User A creates Income
    console.log('\n[Test 2] User A creates Income (₹30,000 Salary)');
    const createIncomeRes = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenUserA}`
      },
      body: JSON.stringify({
        type: 'income',
        amount: 30000,
        category: 'Salary',
        paymentMethod: 'Bank Transfer',
        description: 'September Monthly Salary'
      })
    });
    const incomeData = await createIncomeRes.json();
    assert.strictEqual(createIncomeRes.status, 201);
    assert.strictEqual(incomeData.success, true);
    assert.strictEqual(incomeData.data.transaction.amount, 30000);
    assert.strictEqual(incomeData.data.transaction.source, 'manual');
    assert.strictEqual(String(incomeData.data.transaction.userId), userA_id);
    const txA_IncomeId = incomeData.data.transaction._id;
    console.log('  ✓ PASS: User A created Income transaction with source=manual and userId=userA');

    // 3. User A creates Expense
    console.log('\n[Test 3] User A creates Expense (₹450 Food via UPI)');
    const createExpenseRes = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenUserA}`
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 450,
        category: 'Food',
        paymentMethod: 'UPI',
        description: 'Lunch with colleagues at restaurant'
      })
    });
    const expenseData = await createExpenseRes.json();
    assert.strictEqual(createExpenseRes.status, 201);
    assert.strictEqual(expenseData.data.transaction.amount, 450);
    const txA_ExpenseId = expenseData.data.transaction._id;
    console.log('  ✓ PASS: User A created Expense transaction');

    // 4. User B creates Income
    console.log('\n[Test 4] User B creates Income (₹50,000 Business)');
    const createB_Res = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenUserB}`
      },
      body: JSON.stringify({
        type: 'income',
        amount: 50000,
        category: 'Business',
        paymentMethod: 'Bank Transfer',
        description: 'Client project payment'
      })
    });
    const dataB = await createB_Res.json();
    assert.strictEqual(createB_Res.status, 201);
    const txB_IncomeId = dataB.data.transaction._id;
    console.log('  ✓ PASS: User B created separate Income transaction');

    // 5. User Ownership Isolation: User A list should only have 2 transactions, not User B's
    console.log('\n[Test 5] User A gets list of transactions (Isolation check)');
    const listARes = await fetch(`${baseUrl}/api/transactions`, {
      headers: { 'Authorization': `Bearer ${tokenUserA}` }
    });
    const listAData = await listARes.json();
    assert.strictEqual(listARes.status, 200);
    assert.strictEqual(listAData.data.transactions.length, 2);
    assert.strictEqual(listAData.data.pagination.total, 2);
    console.log('  ✓ PASS: User A only sees their own 2 transactions');

    // 6. User Ownership Isolation: User A cannot read User B's transaction by ID
    console.log('\n[Test 6] User A attempts to read User B\'s transaction by ID');
    const readB_Res = await fetch(`${baseUrl}/api/transactions/${txB_IncomeId}`, {
      headers: { 'Authorization': `Bearer ${tokenUserA}` }
    });
    const readB_Data = await readB_Res.json();
    assert.strictEqual(readB_Res.status, 404);
    assert.strictEqual(readB_Data.success, false);
    assert.strictEqual(readB_Data.message, 'Transaction not found or unauthorized');
    console.log('  ✓ PASS: User A cross-user read attempt rejected with 404');

    // 7. User Ownership Isolation: User A cannot update User B's transaction
    console.log('\n[Test 7] User A attempts to update User B\'s transaction');
    const updateB_Res = await fetch(`${baseUrl}/api/transactions/${txB_IncomeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenUserA}`
      },
      body: JSON.stringify({ amount: 99999 })
    });
    assert.strictEqual(updateB_Res.status, 404);
    console.log('  ✓ PASS: User A cross-user update attempt rejected with 404');

    // 8. User Ownership Isolation: User A cannot delete User B's transaction
    console.log('\n[Test 8] User A attempts to delete User B\'s transaction');
    const deleteB_Res = await fetch(`${baseUrl}/api/transactions/${txB_IncomeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenUserA}` }
    });
    assert.strictEqual(deleteB_Res.status, 404);
    console.log('  ✓ PASS: User A cross-user delete attempt rejected with 404');

    // 9. User A updates own expense transaction
    console.log('\n[Test 9] User A updates own expense transaction amount and description');
    const updateOwnRes = await fetch(`${baseUrl}/api/transactions/${txA_ExpenseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenUserA}`
      },
      body: JSON.stringify({
        amount: 550,
        description: 'Buffet lunch with team'
      })
    });
    const updateOwnData = await updateOwnRes.json();
    assert.strictEqual(updateOwnRes.status, 200);
    assert.strictEqual(updateOwnData.data.transaction.amount, 550);
    assert.strictEqual(updateOwnData.data.transaction.description, 'Buffet lunch with team');
    console.log('  ✓ PASS: User A successfully updated own transaction');

    // 10. Filter by Type (type=expense)
    console.log('\n[Test 10] Filter transactions by type=expense');
    const filterTypeRes = await fetch(`${baseUrl}/api/transactions?type=expense`, {
      headers: { 'Authorization': `Bearer ${tokenUserA}` }
    });
    const filterTypeData = await filterTypeRes.json();
    assert.strictEqual(filterTypeRes.status, 200);
    assert.strictEqual(filterTypeData.data.transactions.length, 1);
    assert.strictEqual(filterTypeData.data.transactions[0].type, 'expense');
    console.log('  ✓ PASS: Type filter returned only expense records');

    // 11. Keyword Search (search=buffet)
    console.log('\n[Test 11] Keyword search for "buffet"');
    const searchRes = await fetch(`${baseUrl}/api/transactions?search=buffet`, {
      headers: { 'Authorization': `Bearer ${tokenUserA}` }
    });
    const searchData = await searchRes.json();
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchData.data.transactions.length, 1);
    assert.strictEqual(searchData.data.transactions[0].category, 'Food');
    console.log('  ✓ PASS: Search query correctly found matching transaction');

    // 12. Dashboard summary calculation for User A
    console.log('\n[Test 12] GET /api/dashboard/summary for User A');
    const summaryARes = await fetch(`${baseUrl}/api/dashboard/summary`, {
      headers: { 'Authorization': `Bearer ${tokenUserA}` }
    });
    const summaryAData = await summaryARes.json();
    assert.strictEqual(summaryARes.status, 200);
    assert.strictEqual(summaryAData.data.totalIncome, 30000);
    assert.strictEqual(summaryAData.data.totalExpenses, 550);
    assert.strictEqual(summaryAData.data.balance, 29450); // 30000 - 550
    console.log(`  ✓ PASS: User A summary: Income=₹${summaryAData.data.totalIncome}, Expenses=₹${summaryAData.data.totalExpenses}, Balance=₹${summaryAData.data.balance}`);

    // 13. Dashboard summary calculation for User B
    console.log('\n[Test 13] GET /api/dashboard/summary for User B (Separate totals)');
    const summaryBRes = await fetch(`${baseUrl}/api/dashboard/summary`, {
      headers: { 'Authorization': `Bearer ${tokenUserB}` }
    });
    const summaryBData = await summaryBRes.json();
    assert.strictEqual(summaryBRes.status, 200);
    assert.strictEqual(summaryBData.data.totalIncome, 50000);
    assert.strictEqual(summaryBData.data.totalExpenses, 0);
    assert.strictEqual(summaryBData.data.balance, 50000);
    console.log(`  ✓ PASS: User B summary: Income=₹${summaryBData.data.totalIncome}, Expenses=₹${summaryBData.data.totalExpenses}, Balance=₹${summaryBData.data.balance}`);

    // 14. User A deletes own transaction
    console.log('\n[Test 14] User A deletes own expense transaction');
    const deleteRes = await fetch(`${baseUrl}/api/transactions/${txA_ExpenseId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenUserA}` }
    });
    const deleteData = await deleteRes.json();
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteData.success, true);
    console.log('  ✓ PASS: User A successfully deleted own transaction');

    // 15. Verify dashboard summary recalculation after deletion
    console.log('\n[Test 15] User A summary after deletion');
    const summaryAfterRes = await fetch(`${baseUrl}/api/dashboard/summary`, {
      headers: { 'Authorization': `Bearer ${tokenUserA}` }
    });
    const summaryAfterData = await summaryAfterRes.json();
    assert.strictEqual(summaryAfterData.data.totalExpenses, 0);
    assert.strictEqual(summaryAfterData.data.balance, 30000);
    console.log('  ✓ PASS: Balance updated correctly to ₹30,000 after expense deletion');

    // 16. Verify GET /api/health still works
    console.log('\n[Test 16] Verify GET /api/health endpoint');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthData.success, true);
    console.log('  ✓ PASS: Health check endpoint remains operational');

    console.log('\nALL 16 PHASE 3 HTTP INTEGRATION TESTS PASSED!\n');
  } finally {
    await stopTestServer();
  }
}

runE2ETests().catch(err => {
  console.error('Integration test failure:', err);
  process.exit(1);
});
