/**
 * Phase 4B End-to-End & Integration Test Suite
 * Validates budget management, enriched calculations, status tiers (<80%, 80-100%, >100%),
 * duplicate conflict handling (409), transaction spending aggregation, and ownership isolation.
 *
 * Run with: node server/tests/e2e_budgets.test.js
 */

'use strict';

const http = require('http');
const assert = require('assert');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
}

const app = require('../server');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const memoryStore = require('../config/inMemoryStore');
const db = require('../config/db');
db.setMongoConnected(true);

let server;
let port;
let baseUrl;

// In-memory test stores
const mockUsers = new Map();
const mockTransactions = new Map();
const mockBudgets = new Map();

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
    toObject: function() { return { ...this }; }
  };
  mockTransactions.set(_id, newTx);
  return newTx;
};

Transaction.findById = (id) => ({
  then: function(resolve) {
    const t = mockTransactions.get(String(id));
    resolve(t ? { ...t, toObject: () => ({ ...t }) } : null);
  },
  lean: async () => mockTransactions.get(String(id)) || null
});

Transaction.findOne = (query = {}) => ({
  then: function(resolve) {
    for (const t of mockTransactions.values()) {
      let match = true;
      if (query._id && String(t._id) !== String(query._id)) match = false;
      if (query.userId && String(t.userId) !== String(query.userId)) match = false;
      if (match) return resolve({ ...t, toObject: () => ({ ...t }) });
    }
    return resolve(null);
  },
  lean: async () => {
    for (const t of mockTransactions.values()) {
      let match = true;
      if (query._id && String(t._id) !== String(query._id)) match = false;
      if (query.userId && String(t.userId) !== String(query.userId)) match = false;
      if (match) return { ...t };
    }
    return null;
  }
});

Transaction.findOneAndDelete = async (query = {}) => {
  for (const [id, t] of mockTransactions.entries()) {
    let match = true;
    if (query._id && String(t._id) !== String(query._id)) match = false;
    if (query.userId && String(t.userId) !== String(query.userId)) match = false;
    if (match) {
      mockTransactions.delete(id);
      return { ...t };
    }
  }
  return null;
};

Transaction.aggregate = async (pipeline) => {
  const matchStage = pipeline.find(s => s.$match)?.$match || {};
  let list = Array.from(mockTransactions.values());

  if (matchStage.userId) {
    list = list.filter(t => String(t.userId) === String(matchStage.userId));
  }
  if (matchStage.type) {
    list = list.filter(t => t.type === matchStage.type);
  }
  if (matchStage.category) {
    if (matchStage.category instanceof RegExp) {
      list = list.filter(t => matchStage.category.test(t.category));
    } else {
      list = list.filter(t => t.category === matchStage.category);
    }
  }
  if (matchStage.date) {
    if (matchStage.date.$gte) {
      list = list.filter(t => new Date(t.date) >= matchStage.date.$gte);
    }
    if (matchStage.date.$lte) {
      list = list.filter(t => new Date(t.date) <= matchStage.date.$lte);
    }
  }

  const groupStage = pipeline.find(s => s.$group)?.$group;
  if (groupStage) {
    const total = list.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    if (list.length === 0) return [];
    return [{ _id: null, total: total }];
  }
  return list;
};

// Mock Budget DB operations
Budget.create = async (doc) => {
  const _id = new mongoose.Types.ObjectId().toString();
  const newBudget = {
    _id,
    ...doc,
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: function() { return { ...this }; }
  };
  mockBudgets.set(_id, newBudget);
  return newBudget;
};

Budget.findOne = (query = {}) => ({
  then: function(resolve) {
    for (const [id, b] of mockBudgets.entries()) {
      let match = true;
      if (query._id) {
        if (query._id.$ne && String(id) === String(query._id.$ne)) match = false;
        else if (!query._id.$ne && String(id) !== String(query._id)) match = false;
      }
      if (query.userId && String(b.userId) !== String(query.userId)) match = false;
      if (query.category && b.category !== query.category) match = false;
      if (query.month !== undefined && b.month !== query.month) match = false;
      if (query.year !== undefined && b.year !== query.year) match = false;
      if (match) {
        const doc = {
          ...b,
          save: async function() {
            mockBudgets.set(id, { ...this });
            return this;
          },
          toObject: function() { return { ...this }; }
        };
        return resolve(doc);
      }
    }
    return resolve(null);
  },
  lean: async () => {
    for (const [id, b] of mockBudgets.entries()) {
      let match = true;
      if (query._id) {
        if (query._id.$ne && String(id) === String(query._id.$ne)) match = false;
        else if (!query._id.$ne && String(id) !== String(query._id)) match = false;
      }
      if (query.userId && String(b.userId) !== String(query.userId)) match = false;
      if (query.category && b.category !== query.category) match = false;
      if (query.month !== undefined && b.month !== query.month) match = false;
      if (query.year !== undefined && b.year !== query.year) match = false;
      if (match) return { ...b };
    }
    return null;
  }
});

Budget.find = (query = {}) => {
  let list = Array.from(mockBudgets.values());

  if (query.userId) {
    list = list.filter(b => String(b.userId) === String(query.userId));
  }
  if (query.month !== undefined) {
    list = list.filter(b => b.month === query.month);
  }
  if (query.year !== undefined) {
    list = list.filter(b => b.year === query.year);
  }

  const builder = {
    _list: list,
    sort: function() {
      return this;
    },
    lean: async function() {
      return this._list.map(b => ({ ...b }));
    }
  };
  return builder;
};

Budget.findById = (id) => ({
  then: function(resolve) {
    const b = mockBudgets.get(String(id));
    resolve(b ? { ...b, toObject: () => ({ ...b }) } : null);
  },
  lean: async () => mockBudgets.get(String(id)) || null
});

Budget.findOneAndUpdate = async (query = {}, update = {}, options = {}) => {
  for (const [id, b] of mockBudgets.entries()) {
    let match = true;
    if (query._id && String(b._id) !== String(query._id)) match = false;
    if (query.userId && String(b.userId) !== String(query.userId)) match = false;
    if (match) {
      const updated = {
        ...b,
        ...(update.$set || update),
        updatedAt: new Date()
      };
      mockBudgets.set(id, updated);
      return options.lean ? updated : { ...updated, toObject: () => updated };
    }
  }
  return null;
};

Budget.findOneAndDelete = async (query = {}) => {
  for (const [id, b] of mockBudgets.entries()) {
    let match = true;
    if (query._id && String(b._id) !== String(query._id)) match = false;
    if (query.userId && String(b.userId) !== String(query.userId)) match = false;
    if (match) {
      mockBudgets.delete(id);
      return { ...b };
    }
  }
  return null;
};

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function itAsync(description, fn) {
  totalTests++;
  return fn()
    .then(() => {
      console.log(`  ✓ PASS: ${description}`);
      passedTests++;
    })
    .catch((err) => {
      console.error(`  ✗ FAIL: ${description}`);
      console.error(`    ${err.message}`);
      failedTests++;
    });
}

function makeRequest(method, pathUrl, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, baseUrl);
    const options = {
      hostname: 'localhost',
      port: port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSuite() {
  await startTestServer();
  console.log('\n=== RUNNING PHASE 4B BUDGET E2E & INTEGRATION TESTS ===\n');

  // Create test tokens
  const userAId = new mongoose.Types.ObjectId().toString();
  const userBId = new mongoose.Types.ObjectId().toString();

  mockUsers.set(userAId, { _id: userAId, name: 'Alice Budget', email: 'alice@budget.test' });
  mockUsers.set(userBId, { _id: userBId, name: 'Bob Budget', email: 'bob@budget.test' });

  memoryStore.users.push(
    { _id: userAId, name: 'Alice Budget', email: 'alice@budget.test' },
    { _id: userBId, name: 'Bob Budget', email: 'bob@budget.test' }
  );

  const tokenA = jwt.sign({ userId: userAId }, process.env.JWT_SECRET, { expiresIn: '1d' });
  const tokenB = jwt.sign({ userId: userBId }, process.env.JWT_SECRET, { expiresIn: '1d' });

  // Test 1: User A creates a budget (Food - ₹5,000 for August 2026)
  await itAsync('User A can create a monthly budget (returns 201 & enriched metrics)', async () => {
    const res = await makeRequest('POST', '/api/budgets', {
      category: 'Food',
      amount: 5000,
      month: 8,
      year: 2026
    }, tokenA);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.budget.category, 'Food');
    assert.strictEqual(res.body.data.budget.amount, 5000);
    assert.strictEqual(res.body.data.budget.spentAmount, 0);
    assert.strictEqual(res.body.data.budget.remainingAmount, 5000);
    assert.strictEqual(res.body.data.budget.percentageUsed, 0);
    assert.strictEqual(res.body.data.budget.status, 'NORMAL');
  });

  // Test 2: Duplicate budget returns HTTP 409
  await itAsync('Duplicate budget creation returns HTTP 409 Conflict', async () => {
    const res = await makeRequest('POST', '/api/budgets', {
      category: 'Food',
      amount: 6000,
      month: 8,
      year: 2026
    }, tokenA);

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('already exists'), 'Expected conflict message');
  });

  // Test 3: User B creates separate budget for same category/month
  await itAsync('User B can create budget for same category/month independently', async () => {
    const res = await makeRequest('POST', '/api/budgets', {
      category: 'Food',
      amount: 10000,
      month: 8,
      year: 2026
    }, tokenB);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.budget.amount, 10000);
  });

  // Test 4: Dynamic status under 80% (NORMAL / On Track)
  await itAsync('Expense updates spentAmount and percentageUsed (< 80% = NORMAL status)', async () => {
    await makeRequest('POST', '/api/transactions', {
      type: 'expense',
      amount: 2000,
      category: 'Food',
      paymentMethod: 'UPI',
      date: '2026-08-15T12:00:00.000Z',
      description: 'Grocery shopping'
    }, tokenA);

    const res = await makeRequest('GET', '/api/budgets?month=8&year=2026', null, tokenA);
    assert.strictEqual(res.status, 200);
    const foodBudget = res.body.data.budgets.find(b => b.category === 'Food');
    assert.ok(foodBudget);
    assert.strictEqual(foodBudget.spentAmount, 2000);
    assert.strictEqual(foodBudget.remainingAmount, 3000);
    assert.strictEqual(foodBudget.percentageUsed, 40);
    assert.strictEqual(foodBudget.status, 'NORMAL');
  });

  // Test 5: Dynamic status 80%–100% (WARNING / Approaching Limit)
  await itAsync('Expense updates spentAmount to 80-100% range (WARNING status)', async () => {
    await makeRequest('POST', '/api/transactions', {
      type: 'expense',
      amount: 2200,
      category: 'Food',
      paymentMethod: 'Credit Card',
      date: '2026-08-20T12:00:00.000Z',
      description: 'Dinner at cafe'
    }, tokenA);

    const res = await makeRequest('GET', '/api/budgets?month=8&year=2026', null, tokenA);
    const foodBudget = res.body.data.budgets.find(b => b.category === 'Food');
    assert.strictEqual(foodBudget.spentAmount, 4200);
    assert.strictEqual(foodBudget.remainingAmount, 800);
    assert.strictEqual(foodBudget.percentageUsed, 84);
    assert.strictEqual(foodBudget.status, 'WARNING');
    assert.strictEqual(foodBudget.isOverBudget, false);
  });

  // Test 6: Dynamic status over 100% (OVER_BUDGET / Budget Exceeded)
  let extraExpenseId;
  await itAsync('Expense exceeding limit updates status to OVER_BUDGET (> 100%)', async () => {
    const txRes = await makeRequest('POST', '/api/transactions', {
      type: 'expense',
      amount: 1500,
      category: 'Food',
      paymentMethod: 'UPI',
      date: '2026-08-25T12:00:00.000Z',
      description: 'Party supplies'
    }, tokenA);
    extraExpenseId = txRes.body.data.transaction._id;

    const res = await makeRequest('GET', '/api/budgets?month=8&year=2026', null, tokenA);
    const foodBudget = res.body.data.budgets.find(b => b.category === 'Food');
    assert.strictEqual(foodBudget.spentAmount, 5700);
    assert.strictEqual(foodBudget.remainingAmount, -700);
    assert.strictEqual(foodBudget.percentageUsed, 114);
    assert.strictEqual(foodBudget.status, 'OVER_BUDGET');
    assert.strictEqual(foodBudget.isOverBudget, true);
  });

  // Test 7: Spending recalculates when transaction is deleted
  await itAsync('Deleting an expense transaction immediately recalculates budget spentAmount', async () => {
    await makeRequest('DELETE', `/api/transactions/${extraExpenseId}`, null, tokenA);

    const res = await makeRequest('GET', '/api/budgets?month=8&year=2026', null, tokenA);
    const foodBudget = res.body.data.budgets.find(b => b.category === 'Food');
    assert.strictEqual(foodBudget.spentAmount, 4200);
    assert.strictEqual(foodBudget.remainingAmount, 800);
    assert.strictEqual(foodBudget.percentageUsed, 84);
    assert.strictEqual(foodBudget.status, 'WARNING');
  });

  // Test 8: Income transactions do NOT affect budget spend
  await itAsync('Income transactions are strictly excluded from budget calculations', async () => {
    await makeRequest('POST', '/api/transactions', {
      type: 'income',
      amount: 50000,
      category: 'Salary',
      paymentMethod: 'Bank Transfer',
      date: '2026-08-01T10:00:00.000Z',
      description: 'Monthly salary'
    }, tokenA);

    const res = await makeRequest('GET', '/api/budgets?month=8&year=2026', null, tokenA);
    const foodBudget = res.body.data.budgets.find(b => b.category === 'Food');
    assert.strictEqual(foodBudget.spentAmount, 4200);
  });

  // Test 9: Update budget amount
  await itAsync('User can update budget amount and metrics dynamically refresh', async () => {
    const list = await makeRequest('GET', '/api/budgets?month=8&year=2026', null, tokenA);
    const foodBudgetId = list.body.data.budgets.find(b => b.category === 'Food')._id;

    const updateRes = await makeRequest('PUT', `/api/budgets/${foodBudgetId}`, {
      amount: 10000
    }, tokenA);

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.budget.amount, 10000);
    assert.strictEqual(updateRes.body.data.budget.spentAmount, 4200);
    assert.strictEqual(updateRes.body.data.budget.remainingAmount, 5800);
    assert.strictEqual(updateRes.body.data.budget.percentageUsed, 42);
    assert.strictEqual(updateRes.body.data.budget.status, 'NORMAL');
  });

  // Test 10: Delete budget
  await itAsync('User can delete a budget', async () => {
    const list = await makeRequest('GET', '/api/budgets?month=8&year=2026', null, tokenA);
    const foodBudgetId = list.body.data.budgets.find(b => b.category === 'Food')._id;

    const delRes = await makeRequest('DELETE', `/api/budgets/${foodBudgetId}`, null, tokenA);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);

    const listAfter = await makeRequest('GET', '/api/budgets?month=8&year=2026', null, tokenA);
    assert.strictEqual(listAfter.body.data.budgets.length, 0);
  });

  await stopTestServer();

  console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
  if (failedTests === 0) {
    console.log('ALL PHASE 4B INTEGRATION TESTS PASSED!\n');
  } else {
    process.exit(1);
  }
}

// Start test suite
runSuite().catch((err) => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
