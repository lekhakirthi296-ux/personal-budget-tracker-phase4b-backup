/**
 * Phase 4 Automated Verification Suite
 * Tests Budget model schema validations, ownership isolation, CRUD controller logic,
 * duplicate prevention, spend calculations, income exclusion, and month/year filtering.
 *
 * Uses the same lightweight test harness (custom it/itAsync + assert) as previous phases.
 * No external test runner required — run with: node tests/phase4_budgets.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
}

const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const budgetController = require('../controllers/budgetController');

// ---------------------------------------------------------------------------
// Lightweight test harness (mirrors Phase 2 / Phase 3 style)
// ---------------------------------------------------------------------------
let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

// ---------------------------------------------------------------------------
// Minimal mock helpers
// ---------------------------------------------------------------------------

/**
 * Build a mock Express res object that captures status + json calls.
 * Returns { res, getStatus, getJson }.
 */
function mockRes() {
  let statusSent = null;
  let jsonSent = null;
  const res = {
    status(code) { statusSent = code; return this; },
    json(data) { jsonSent = data; return this; }
  };
  return {
    res,
    getStatus: () => statusSent,
    getJson: () => jsonSent
  };
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

async function runTests() {
  console.log('\n=== RUNNING PHASE 4 BUDGET TESTS ===\n');

  // =========================================================================
  // 1. BUDGET MODEL SCHEMA VALIDATION
  // =========================================================================
  console.log('[1. BUDGET MODEL SCHEMA VALIDATION]');

  it('Budget model should require userId', () => {
    const b = new Budget({ category: 'Food', amount: 5000, month: 8, year: 2026 });
    const err = b.validateSync();
    assert.ok(err && err.errors.userId, 'Expected userId validation error');
  });

  it('Budget model should require category', () => {
    const b = new Budget({ userId: new mongoose.Types.ObjectId(), amount: 5000, month: 8, year: 2026 });
    const err = b.validateSync();
    assert.ok(err && err.errors.category, 'Expected category validation error');
  });

  it('Budget model should reject amount <= 0', () => {
    const bZero = new Budget({
      userId: new mongoose.Types.ObjectId(), category: 'Food', amount: 0, month: 8, year: 2026
    });
    const errZero = bZero.validateSync();
    assert.ok(errZero && errZero.errors.amount, 'Expected amount > 0 error on 0');

    const bNeg = new Budget({
      userId: new mongoose.Types.ObjectId(), category: 'Food', amount: -100, month: 8, year: 2026
    });
    const errNeg = bNeg.validateSync();
    assert.ok(errNeg && errNeg.errors.amount, 'Expected amount > 0 error on negative');
  });

  it('Budget model should reject month outside 1–12', () => {
    const b = new Budget({
      userId: new mongoose.Types.ObjectId(), category: 'Food', amount: 5000, month: 13, year: 2026
    });
    const err = b.validateSync();
    assert.ok(err && err.errors.month, 'Expected month range error');
  });

  it('Budget model should reject year outside 2000–2100', () => {
    const b = new Budget({
      userId: new mongoose.Types.ObjectId(), category: 'Food', amount: 5000, month: 8, year: 1999
    });
    const err = b.validateSync();
    assert.ok(err && err.errors.year, 'Expected year range error');
  });

  it('Budget model should pass validation for a fully valid document', () => {
    const b = new Budget({
      userId: new mongoose.Types.ObjectId(),
      category: 'Groceries',
      amount: 8000,
      month: 8,
      year: 2026
    });
    const err = b.validateSync();
    assert.strictEqual(err, undefined, 'Expected no validation error');
  });

  it('Budget model should have a unique compound index on userId+category+month+year', () => {
    const indexList = Budget.schema.indexes();
    const hasUniqueIndex = indexList.some(([fields, opts]) =>
      fields.userId === 1 &&
      fields.category === 1 &&
      fields.month === 1 &&
      fields.year === 1 &&
      opts.unique === true
    );
    assert.ok(hasUniqueIndex, 'Expected unique compound index on userId+category+month+year');
  });

  // =========================================================================
  // 2. CREATE BUDGET – INPUT VALIDATION (controller unit tests, no DB)
  // =========================================================================
  console.log('\n[2. CREATE BUDGET – CONTROLLER INPUT VALIDATION]');

  await itAsync('Create should reject missing category (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { amount: 5000, month: 8, year: 2026 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.createBudget(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
  });

  await itAsync('Create should reject empty string category (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { category: '   ', amount: 5000, month: 8, year: 2026 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.createBudget(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
  });

  await itAsync('Create should reject zero or negative amount (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { category: 'Food', amount: -50, month: 8, year: 2026 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.createBudget(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /positive number/i);
  });

  await itAsync('Create should reject NaN amount (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { category: 'Food', amount: 'abc', month: 8, year: 2026 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.createBudget(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
  });

  await itAsync('Create should reject month out of range (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { category: 'Food', amount: 5000, month: 0, year: 2026 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.createBudget(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /month/i);
  });

  await itAsync('Create should reject month 13 (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { category: 'Food', amount: 5000, month: 13, year: 2026 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.createBudget(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
  });

  await itAsync('Create should reject invalid year (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { category: 'Food', amount: 5000, month: 8, year: 1999 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.createBudget(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /year/i);
  });

  // =========================================================================
  // 3. GET BUDGET BY ID – INPUT VALIDATION
  // =========================================================================
  console.log('\n[3. GET/UPDATE/DELETE BUDGET – ID VALIDATION]');

  await itAsync('GetById should reject invalid ObjectId (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: 'not-an-objectid' }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.getBudgetById(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /invalid budget id/i);
  });

  await itAsync('UpdateBudget should reject invalid ObjectId (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: 'bad-id' },
      body: { amount: 6000 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.updateBudget(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
  });

  await itAsync('DeleteBudget should reject invalid ObjectId (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: 'bad-id' }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.deleteBudget(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
  });

  // =========================================================================
  // 4. UPDATE BUDGET – FIELD VALIDATION
  // =========================================================================
  console.log('\n[4. UPDATE BUDGET – FIELD VALIDATION]');

  await itAsync('UpdateBudget should reject empty category string (400)', async () => {
    // Fake findOne returning a budget so we reach field validation
    const originalFindOne = Budget.findOne;
    Budget.findOne = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      category: 'Food',
      amount: 5000,
      month: 8,
      year: 2026,
      save: async () => {}
    });

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { category: '' }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.updateBudget(req, res, () => {});
    Budget.findOne = originalFindOne;
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
  });

  await itAsync('UpdateBudget should reject negative amount (400)', async () => {
    const originalFindOne = Budget.findOne;
    Budget.findOne = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      category: 'Food',
      amount: 5000,
      month: 8,
      year: 2026,
      save: async () => {}
    });

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { amount: -100 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.updateBudget(req, res, () => {});
    Budget.findOne = originalFindOne;
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /positive number/i);
  });

  await itAsync('UpdateBudget should reject invalid month (400)', async () => {
    const originalFindOne = Budget.findOne;
    Budget.findOne = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      category: 'Food',
      amount: 5000,
      month: 8,
      year: 2026,
      save: async () => {}
    });

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { month: 99 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.updateBudget(req, res, () => {});
    Budget.findOne = originalFindOne;
    assert.strictEqual(getStatus(), 400);
    assert.match(getJson().message, /month/i);
  });

  // =========================================================================
  // 5. GET BUDGETS – FILTER VALIDATION
  // =========================================================================
  console.log('\n[5. GET BUDGETS – FILTER VALIDATION]');

  await itAsync('GetBudgets should reject invalid month query param (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      query: { month: '15' }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.getBudgets(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /month/i);
  });

  await itAsync('GetBudgets should reject invalid year query param (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      query: { year: '1800' }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.getBudgets(req, res, () => {});
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /year/i);
  });

  // =========================================================================
  // 6. OWNERSHIP ISOLATION (no DB – mock Budget.findOne returning null)
  // =========================================================================
  console.log('\n[6. OWNERSHIP ISOLATION]');

  await itAsync('GetById should return 404 when budget belongs to another user', async () => {
    const originalFindOne = Budget.findOne;
    // Simulate: DB found nothing (query already includes userId scoping)
    Budget.findOne = () => ({ lean: async () => null });

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.getBudgetById(req, res, () => {});
    Budget.findOne = originalFindOne;
    assert.strictEqual(getStatus(), 404);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /not found or unauthorized/i);
  });

  await itAsync('UpdateBudget should return 404 when budget belongs to another user', async () => {
    const originalFindOne = Budget.findOne;
    Budget.findOne = () => Promise.resolve(null);

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { amount: 9000 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.updateBudget(req, res, () => {});
    Budget.findOne = originalFindOne;
    assert.strictEqual(getStatus(), 404);
    assert.match(getJson().message, /not found or unauthorized/i);
  });

  await itAsync('DeleteBudget should return 404 when budget belongs to another user', async () => {
    const originalFindOneAndDelete = Budget.findOneAndDelete;
    Budget.findOneAndDelete = () => Promise.resolve(null);

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.deleteBudget(req, res, () => {});
    Budget.findOneAndDelete = originalFindOneAndDelete;
    assert.strictEqual(getStatus(), 404);
    assert.match(getJson().message, /not found or unauthorized/i);
  });

  // =========================================================================
  // 7. SPEND CALCULATION – income excluded, cross-user isolation (mock agg)
  // =========================================================================
  console.log('\n[7. SPEND CALCULATION – income excluded & cross-user isolation]');

  await itAsync('spentAmount must EXCLUDE income transactions from calculation', async () => {
    /**
     * Simulate two users:
     *   userA has expense 2000 + income 10000 in Food/8/2026
     *   userB has expense 5000 in Food/8/2026
     *
     * When userA's budget is enriched, spentAmount must be 2000
     * (income excluded, userB's expense excluded).
     */
    const userA_id = new mongoose.Types.ObjectId();
    const userB_id = new mongoose.Types.ObjectId();

    const originalAggregate = Transaction.aggregate;

    Transaction.aggregate = (pipeline) => {
      // Extract the $match stage to validate query scoping
      const matchStage = pipeline.find(s => s.$match);
      const match = matchStage ? matchStage.$match : {};

      // Determine which user is querying
      const queriedUserId = String(match.userId);

      // Only return expense documents for the matching user
      if (queriedUserId === String(userA_id)) {
        // userA has: 1 expense (Food, Aug, 2026) and 1 income — income must not appear here
        // because the controller's $match already filters type: 'expense'
        assert.strictEqual(match.type, 'expense', 'Aggregation must filter type: expense');
        return Promise.resolve([{ _id: null, total: 2000 }]);
      }
      // Other user → no results
      return Promise.resolve([]);
    };

    // Build a lean budget for userA
    const rawBudget = {
      _id: new mongoose.Types.ObjectId(),
      userId: userA_id,
      category: 'Food',
      amount: 10000,
      month: 8,
      year: 2026
    };

    // Directly call the enrichBudget logic via a GET (mock Budget.findOne)
    const originalFindOne = Budget.findOne;
    Budget.findOne = () => ({
      lean: async () => rawBudget
    });

    const req = {
      user: { _id: userA_id },
      params: { id: rawBudget._id.toString() }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.getBudgetById(req, res, () => {});

    Budget.findOne = originalFindOne;
    Transaction.aggregate = originalAggregate;

    assert.strictEqual(getStatus(), 200);
    const b = getJson().data.budget;
    assert.strictEqual(b.spentAmount, 2000, 'spentAmount should be 2000 (expense only)');
    assert.strictEqual(b.budgetAmount, 10000, 'budgetAmount should equal budget.amount');
    assert.strictEqual(b.remainingAmount, 8000, 'remainingAmount = budgetAmount - spentAmount');
    assert.strictEqual(b.utilizationPercentage, 20, 'utilizationPercentage = 20%');
  });

  await itAsync('Aggregation pipeline must include userId filter (cross-user isolation)', async () => {
    const userA_id = new mongoose.Types.ObjectId();
    const originalAggregate = Transaction.aggregate;

    let capturedMatch = null;
    Transaction.aggregate = (pipeline) => {
      const matchStage = pipeline.find(s => s.$match);
      capturedMatch = matchStage ? matchStage.$match : {};
      return Promise.resolve([]);
    };

    const rawBudget = {
      _id: new mongoose.Types.ObjectId(),
      userId: userA_id,
      category: 'Rent',
      amount: 20000,
      month: 8,
      year: 2026
    };

    const originalFindOne = Budget.findOne;
    Budget.findOne = () => ({ lean: async () => rawBudget });

    const req = {
      user: { _id: userA_id },
      params: { id: rawBudget._id.toString() }
    };
    const { res } = mockRes();
    await budgetController.getBudgetById(req, res, () => {});

    Budget.findOne = originalFindOne;
    Transaction.aggregate = originalAggregate;

    assert.ok(capturedMatch, 'Aggregation $match stage must exist');
    assert.ok(
      capturedMatch.userId,
      'Aggregation $match must include userId to prevent cross-user data leakage'
    );
    assert.strictEqual(
      String(capturedMatch.userId),
      String(userA_id),
      'Aggregation userId must equal the budget owner id'
    );
    assert.strictEqual(capturedMatch.type, 'expense', 'Aggregation must filter type: expense');
    assert.strictEqual(capturedMatch.category, 'Rent', 'Aggregation must filter by category');
  });

  await itAsync('utilizationPercentage should be 0 when no expenses exist', async () => {
    const userA_id = new mongoose.Types.ObjectId();
    const originalAggregate = Transaction.aggregate;
    Transaction.aggregate = () => Promise.resolve([]); // No matching expenses

    const rawBudget = {
      _id: new mongoose.Types.ObjectId(),
      userId: userA_id,
      category: 'Travel',
      amount: 15000,
      month: 8,
      year: 2026
    };

    const originalFindOne = Budget.findOne;
    Budget.findOne = () => ({ lean: async () => rawBudget });

    const req = {
      user: { _id: userA_id },
      params: { id: rawBudget._id.toString() }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.getBudgetById(req, res, () => {});

    Budget.findOne = originalFindOne;
    Transaction.aggregate = originalAggregate;

    assert.strictEqual(getStatus(), 200);
    const b = getJson().data.budget;
    assert.strictEqual(b.spentAmount, 0);
    assert.strictEqual(b.remainingAmount, 15000);
    assert.strictEqual(b.utilizationPercentage, 0);
  });

  await itAsync('remainingAmount may be negative when spending exceeds budget', async () => {
    const userA_id = new mongoose.Types.ObjectId();
    const originalAggregate = Transaction.aggregate;
    Transaction.aggregate = () => Promise.resolve([{ _id: null, total: 18000 }]); // Over budget

    const rawBudget = {
      _id: new mongoose.Types.ObjectId(),
      userId: userA_id,
      category: 'Shopping',
      amount: 10000,
      month: 8,
      year: 2026
    };

    const originalFindOne = Budget.findOne;
    Budget.findOne = () => ({ lean: async () => rawBudget });

    const req = {
      user: { _id: userA_id },
      params: { id: rawBudget._id.toString() }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.getBudgetById(req, res, () => {});

    Budget.findOne = originalFindOne;
    Transaction.aggregate = originalAggregate;

    assert.strictEqual(getStatus(), 200);
    const b = getJson().data.budget;
    assert.strictEqual(b.spentAmount, 18000);
    assert.strictEqual(b.remainingAmount, -8000, 'remainingAmount should be negative when over budget');
    assert.strictEqual(b.utilizationPercentage, 180, '180% utilization when 18000/10000');
  });

  // =========================================================================
  // 8. DUPLICATE BUDGET PREVENTION
  // =========================================================================
  console.log('\n[8. DUPLICATE BUDGET PREVENTION]');

  await itAsync('Create should return 409 when duplicate budget already exists', async () => {
    const originalFindOne = Budget.findOne;
    // Simulate existing budget found
    Budget.findOne = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      category: 'Food',
      month: 8,
      year: 2026
    });

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { category: 'Food', amount: 5000, month: 8, year: 2026 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.createBudget(req, res, () => {});
    Budget.findOne = originalFindOne;

    assert.strictEqual(getStatus(), 409);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /already exists/i);
  });

  await itAsync('Create should propagate 409 on MongoDB duplicate key error (race condition)', async () => {
    const originalFindOne = Budget.findOne;
    Budget.findOne = () => Promise.resolve(null); // No existing found

    const originalCreate = Budget.create;
    const dupError = new Error('Duplicate key');
    dupError.code = 11000;
    dupError.keyValue = { category: 'Food' };
    Budget.create = () => Promise.reject(dupError);

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { category: 'Food', amount: 5000, month: 8, year: 2026 }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.createBudget(req, res, () => {});
    Budget.findOne = originalFindOne;
    Budget.create = originalCreate;

    assert.strictEqual(getStatus(), 409);
    assert.match(getJson().message, /already exists/i);
  });

  await itAsync('UpdateBudget should return 409 when update creates a duplicate', async () => {
    const userId = new mongoose.Types.ObjectId();
    const budgetId = new mongoose.Types.ObjectId();
    const otherId = new mongoose.Types.ObjectId();

    const originalFindOne = Budget.findOne;
    let callCount = 0;
    Budget.findOne = (query) => {
      callCount++;
      if (callCount === 1) {
        // First call: find budget by _id + userId
        return Promise.resolve({
          _id: budgetId,
          userId,
          category: 'Food',
          amount: 5000,
          month: 8,
          year: 2026,
          save: async () => {}
        });
      }
      // Second call: duplicate check (finds another budget)
      return Promise.resolve({ _id: otherId });
    };

    const req = {
      user: { _id: userId },
      params: { id: budgetId.toString() },
      body: { category: 'Rent' } // Change category to one that conflicts
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.updateBudget(req, res, () => {});
    Budget.findOne = originalFindOne;

    assert.strictEqual(getStatus(), 409);
    assert.match(getJson().message, /already exists/i);
  });

  // =========================================================================
  // 9. GET BUDGETS – LIST RESPONSE SHAPE
  // =========================================================================
  console.log('\n[9. GET BUDGETS – RESPONSE SHAPE]');

  await itAsync('GetBudgets should return success with budgets array and enriched fields', async () => {
    const userId = new mongoose.Types.ObjectId();

    const originalFind = Budget.find;
    const rawBudgets = [
      { _id: new mongoose.Types.ObjectId(), userId, category: 'Food', amount: 5000, month: 8, year: 2026 },
      { _id: new mongoose.Types.ObjectId(), userId, category: 'Rent', amount: 20000, month: 8, year: 2026 }
    ];
    Budget.find = () => ({
      sort: () => ({ lean: async () => rawBudgets })
    });

    const originalAggregate = Transaction.aggregate;
    Transaction.aggregate = () => Promise.resolve([{ _id: null, total: 3000 }]);

    const req = {
      user: { _id: userId },
      query: {}
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.getBudgets(req, res, () => {});

    Budget.find = originalFind;
    Transaction.aggregate = originalAggregate;

    assert.strictEqual(getStatus(), 200);
    assert.strictEqual(getJson().success, true);
    assert.ok(Array.isArray(getJson().data.budgets), 'data.budgets must be an array');
    assert.strictEqual(getJson().data.budgets.length, 2, 'Should return 2 budgets');

    // Verify each budget is enriched
    for (const b of getJson().data.budgets) {
      assert.ok('budgetAmount' in b, 'budgetAmount should be present');
      assert.ok('spentAmount' in b, 'spentAmount should be present');
      assert.ok('remainingAmount' in b, 'remainingAmount should be present');
      assert.ok('utilizationPercentage' in b, 'utilizationPercentage should be present');
    }
  });

  // =========================================================================
  // 10. DELETE BUDGET – SUCCESS RESPONSE
  // =========================================================================
  console.log('\n[10. DELETE BUDGET – SUCCESS RESPONSE]');

  await itAsync('DeleteBudget should return 200 and success message when found', async () => {
    const originalFindOneAndDelete = Budget.findOneAndDelete;
    Budget.findOneAndDelete = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      category: 'Food',
      amount: 5000,
      month: 8,
      year: 2026
    });

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() }
    };
    const { res, getStatus, getJson } = mockRes();
    await budgetController.deleteBudget(req, res, () => {});
    Budget.findOneAndDelete = originalFindOneAndDelete;

    assert.strictEqual(getStatus(), 200);
    assert.strictEqual(getJson().success, true);
    assert.match(getJson().message, /deleted/i);
  });

  // =========================================================================
  // RESULTS
  // =========================================================================
  console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
  if (passedTests === totalTests) {
    console.log('ALL PHASE 4 BUDGET BACKEND TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`${failedTests} TEST(S) FAILED!\n`);
    process.exit(1);
  }
}

runTests();
