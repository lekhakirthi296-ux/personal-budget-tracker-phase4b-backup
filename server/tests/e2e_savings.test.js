/**
 * Phase 5 E2E & Integration Test Suite
 * Validates Savings Goal CRUD, Authentication, Cross-User Isolation,
 * Contribution Increments, Progress Calculations, and Completion Status.
 *
 * Run with: node server/tests/e2e_savings.test.js
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
const SavingsGoal = require('../models/SavingsGoal');
const memoryStore = require('../config/inMemoryStore');
const db = require('../config/db');
db.setMongoConnected(true);

let server;
let port;
let baseUrl;

// In-memory test stores
const mockUsers = new Map();
const mockSavingsGoals = new Map();

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

// Mock SavingsGoal DB operations
SavingsGoal.create = async (doc) => {
  const _id = new mongoose.Types.ObjectId().toString();
  const newGoal = {
    _id,
    ...doc,
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: function() { return { ...this }; },
    save: async function() {
      mockSavingsGoals.set(_id, this);
      return this;
    }
  };
  mockSavingsGoals.set(_id, newGoal);
  return newGoal;
};

SavingsGoal.find = (query = {}) => ({
  sort: () => ({
    lean: async () => {
      let list = Array.from(mockSavingsGoals.values());
      if (query.userId) {
        list = list.filter((g) => String(g.userId) === String(query.userId));
      }
      return list.map((g) => ({ ...g }));
    }
  })
});

SavingsGoal.findOne = (query = {}) => ({
  then: function(resolve) {
    for (const g of mockSavingsGoals.values()) {
      let match = true;
      if (query._id && String(g._id) !== String(query._id)) match = false;
      if (query.userId && String(g.userId) !== String(query.userId)) match = false;
      if (match) {
        const goalDoc = {
          ...g,
          toObject: function() { return { ...this }; },
          save: async function() {
            mockSavingsGoals.set(String(this._id), this);
            return this;
          }
        };
        return resolve(goalDoc);
      }
    }
    return resolve(null);
  },
  lean: async () => {
    for (const g of mockSavingsGoals.values()) {
      let match = true;
      if (query._id && String(g._id) !== String(query._id)) match = false;
      if (query.userId && String(g.userId) !== String(query.userId)) match = false;
      if (match) return { ...g };
    }
    return null;
  }
});

SavingsGoal.findOneAndDelete = async (query = {}) => {
  for (const [id, g] of mockSavingsGoals.entries()) {
    let match = true;
    if (query._id && String(g._id) !== String(query._id)) match = false;
    if (query.userId && String(g.userId) !== String(query.userId)) match = false;
    if (match) {
      mockSavingsGoals.delete(id);
      return { ...g };
    }
  }
  return null;
};

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch (e) {
            data = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main E2E Test Suite
// ---------------------------------------------------------------------------
let passed = 0;
let total = 0;

async function test(desc, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
  }
}

async function runE2ESuite() {
  console.log('\n=== RUNNING PHASE 5 SAVINGS E2E & INTEGRATION TESTS ===\n');
  await startTestServer();

  const userAId = new mongoose.Types.ObjectId().toString();
  const userBId = new mongoose.Types.ObjectId().toString();

  mockUsers.set(userAId, { _id: userAId, name: 'Alice Saver', email: 'alice@saver.test' });
  mockUsers.set(userBId, { _id: userBId, name: 'Bob Saver', email: 'bob@saver.test' });

  memoryStore.users.push(
    { _id: userAId, name: 'Alice Saver', email: 'alice@saver.test' },
    { _id: userBId, name: 'Bob Saver', email: 'bob@saver.test' }
  );

  const tokenA = jwt.sign({ userId: userAId }, process.env.JWT_SECRET, { expiresIn: '1d' });
  const tokenB = jwt.sign({ userId: userBId }, process.env.JWT_SECRET, { expiresIn: '1d' });

  let goalAId;
  let goalBId;

  // 1. Unauthenticated request rejected with 401
  await test('Unauthenticated access to /api/savings returns 401', async () => {
    const res = await makeRequest('GET', '/api/savings');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  // 2. User A creates a savings goal
  await test('User A can create a savings goal (201 & enriched metrics)', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const res = await makeRequest(
      'POST',
      '/api/savings',
      {
        name: 'Emergency Fund',
        targetAmount: 50000,
        currentAmount: 10000,
        targetDate: futureDate.toISOString()
      },
      tokenA
    );

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    const goal = res.data.data.savingsGoal;
    assert.strictEqual(goal.name, 'Emergency Fund');
    assert.strictEqual(goal.targetAmount, 50000);
    assert.strictEqual(goal.currentAmount, 10000);
    assert.strictEqual(goal.remainingAmount, 40000);
    assert.strictEqual(goal.progressPercentage, 20);
    assert.strictEqual(goal.status, 'IN_PROGRESS');
    assert.strictEqual(goal.isCompleted, false);

    goalAId = goal._id;
  });

  // 3. User B creates their own savings goal
  await test('User B creates independent savings goal', async () => {
    const res = await makeRequest(
      'POST',
      '/api/savings',
      {
        name: 'New Car',
        targetAmount: 300000,
        currentAmount: 0
      },
      tokenB
    );

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.data.savingsGoal.name, 'New Car');
    goalBId = res.data.data.savingsGoal._id;
  });

  // 4. User A fetches list of savings goals (isolation check)
  await test('User A only sees their own savings goals', async () => {
    const res = await makeRequest('GET', '/api/savings', null, tokenA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.savingsGoals.length, 1);
    assert.strictEqual(res.data.data.savingsGoals[0].name, 'Emergency Fund');
  });

  // 5. User A gets single savings goal by ID
  await test('User A retrieves goal by ID', async () => {
    const res = await makeRequest('GET', `/api/savings/${goalAId}`, null, tokenA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.savingsGoal._id, goalAId);
    assert.strictEqual(res.data.data.savingsGoal.name, 'Emergency Fund');
  });

  // 6. Cross-User Access Isolation (User B cannot read/update/contribute/delete User A's goal)
  await test('Cross-user isolation: User B cannot access User A goal (returns 404)', async () => {
    const getRes = await makeRequest('GET', `/api/savings/${goalAId}`, null, tokenB);
    assert.strictEqual(getRes.status, 404);

    const updateRes = await makeRequest('PUT', `/api/savings/${goalAId}`, { name: 'Hacked' }, tokenB);
    assert.strictEqual(updateRes.status, 404);

    const contributeRes = await makeRequest('PATCH', `/api/savings/${goalAId}/contribute`, { amount: 100 }, tokenB);
    assert.strictEqual(contributeRes.status, 404);

    const deleteRes = await makeRequest('DELETE', `/api/savings/${goalAId}`, null, tokenB);
    assert.strictEqual(deleteRes.status, 404);
  });

  // 7. User A adds contribution to goal
  await test('User A adds contribution to savings goal (metrics recalculate)', async () => {
    const res = await makeRequest(
      'PATCH',
      `/api/savings/${goalAId}/contribute`,
      { amount: 15000 },
      tokenA
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const goal = res.data.data.savingsGoal;
    assert.strictEqual(goal.currentAmount, 25000);
    assert.strictEqual(goal.remainingAmount, 25000);
    assert.strictEqual(goal.progressPercentage, 50);
    assert.strictEqual(goal.status, 'IN_PROGRESS');
  });

  // 8. User A adds contribution that completes the goal (100% cap and COMPLETED status)
  await test('Goal reaches COMPLETED status and progress is capped at 100%', async () => {
    const res = await makeRequest(
      'PATCH',
      `/api/savings/${goalAId}/contribute`,
      { amount: 35000 }, // Total becomes 60,000 against target 50,000
      tokenA
    );

    assert.strictEqual(res.status, 200);
    const goal = res.data.data.savingsGoal;
    assert.strictEqual(goal.currentAmount, 60000);
    assert.strictEqual(goal.remainingAmount, 0);
    assert.strictEqual(goal.progressPercentage, 100);
    assert.strictEqual(goal.status, 'COMPLETED');
    assert.strictEqual(goal.isCompleted, true);
  });

  // 9. User A updates target amount on goal
  await test('User A can update savings goal target and metrics refresh', async () => {
    const res = await makeRequest(
      'PUT',
      `/api/savings/${goalAId}`,
      { targetAmount: 80000 },
      tokenA
    );

    assert.strictEqual(res.status, 200);
    const goal = res.data.data.savingsGoal;
    assert.strictEqual(goal.targetAmount, 80000);
    assert.strictEqual(goal.currentAmount, 60000);
    assert.strictEqual(goal.remainingAmount, 20000);
    assert.strictEqual(goal.progressPercentage, 75);
    assert.strictEqual(goal.status, 'IN_PROGRESS');
  });

  // 10. User A deletes the savings goal
  await test('User A can delete their savings goal', async () => {
    const delRes = await makeRequest('DELETE', `/api/savings/${goalAId}`, null, tokenA);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.success, true);

    const checkRes = await makeRequest('GET', `/api/savings/${goalAId}`, null, tokenA);
    assert.strictEqual(checkRes.status, 404);
  });

  await stopTestServer();
  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===\n`);
  if (passed !== total) {
    console.error('Some E2E tests failed!');
    process.exit(1);
  } else {
    console.log('ALL PHASE 5 SAVINGS E2E & INTEGRATION TESTS PASSED!\n');
  }
}

runE2ESuite().catch((err) => {
  console.error('Fatal error in E2E tests:', err);
  process.exit(1);
});
