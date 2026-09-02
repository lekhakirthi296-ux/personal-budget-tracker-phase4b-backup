/**
 * Phase 5 Savings Management Unit & Logical Verification Suite
 * Tests SavingsGoal model schema validations, ownership isolation,
 * CRUD controller logic, contributions, progress calculations, remaining amounts,
 * and error responses.
 *
 * Run with: node server/tests/phase5_savings.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
}

const mongoose = require('mongoose');
const SavingsGoal = require('../models/SavingsGoal');
const savingsController = require('../controllers/savingsController');
const memoryStore = require('../config/inMemoryStore');
const db = require('../config/db');

// Enable simulated database connection for tests
db.setMongoConnected(true);

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

async function runTests() {
  console.log('\n=== RUNNING PHASE 5 SAVINGS TESTS ===\n');

  // =========================================================================
  // 1. SAVINGS GOAL MODEL SCHEMA VALIDATION
  // =========================================================================
  console.log('[1. SAVINGS GOAL MODEL SCHEMA VALIDATION]');

  it('SavingsGoal model should require userId', () => {
    const goal = new SavingsGoal({ name: 'Emergency Fund', targetAmount: 50000 });
    const err = goal.validateSync();
    assert.ok(err && err.errors.userId, 'Expected userId validation error');
  });

  it('SavingsGoal model should require name', () => {
    const goal = new SavingsGoal({ userId: new mongoose.Types.ObjectId(), targetAmount: 50000 });
    const err = goal.validateSync();
    assert.ok(err && err.errors.name, 'Expected name validation error');
  });

  it('SavingsGoal model should reject targetAmount <= 0', () => {
    const goalZero = new SavingsGoal({
      userId: new mongoose.Types.ObjectId(),
      name: 'Car Fund',
      targetAmount: 0
    });
    const errZero = goalZero.validateSync();
    assert.ok(errZero && errZero.errors.targetAmount, 'Expected targetAmount > 0 error on 0');

    const goalNeg = new SavingsGoal({
      userId: new mongoose.Types.ObjectId(),
      name: 'Car Fund',
      targetAmount: -500
    });
    const errNeg = goalNeg.validateSync();
    assert.ok(errNeg && errNeg.errors.targetAmount, 'Expected targetAmount > 0 error on negative');
  });

  it('SavingsGoal model should reject negative currentAmount', () => {
    const goal = new SavingsGoal({
      userId: new mongoose.Types.ObjectId(),
      name: 'Vacation',
      targetAmount: 10000,
      currentAmount: -100
    });
    const err = goal.validateSync();
    assert.ok(err && err.errors.currentAmount, 'Expected currentAmount >= 0 error');
  });

  it('SavingsGoal model should reject name exceeding 100 characters', () => {
    const longName = 'A'.repeat(101);
    const goal = new SavingsGoal({
      userId: new mongoose.Types.ObjectId(),
      name: longName,
      targetAmount: 10000
    });
    const err = goal.validateSync();
    assert.ok(err && err.errors.name, 'Expected name maxlength error');
  });

  it('SavingsGoal model should accept valid goal data', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const goal = new SavingsGoal({
      userId: new mongoose.Types.ObjectId(),
      name: 'House Down Payment',
      targetAmount: 1000000,
      currentAmount: 250000,
      targetDate: futureDate
    });
    const err = goal.validateSync();
    assert.strictEqual(err, undefined, 'Expected valid savings goal document without errors');
  });

  // =========================================================================
  // 2. CREATE SAVINGS GOAL – CONTROLLER INPUT VALIDATIONS
  // =========================================================================
  console.log('\n[2. CREATE SAVINGS GOAL – CONTROLLER INPUT VALIDATIONS]');

  const testUserId = new mongoose.Types.ObjectId();
  const testUser = { _id: testUserId, name: 'Saver User' };

  await itAsync('Create should reject missing or empty name (400)', async () => {
    const { res, getStatus, getJson } = mockRes();
    await savingsController.createSavingsGoal(
      { user: testUser, body: { name: '', targetAmount: 50000 } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /valid savings goal name/i);
  });

  await itAsync('Create should reject name exceeding 100 characters (400)', async () => {
    const { res, getStatus, getJson } = mockRes();
    await savingsController.createSavingsGoal(
      { user: testUser, body: { name: 'A'.repeat(101), targetAmount: 50000 } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /cannot exceed 100 characters/i);
  });

  await itAsync('Create should reject zero or negative targetAmount (400)', async () => {
    const { res, getStatus, getJson } = mockRes();
    await savingsController.createSavingsGoal(
      { user: testUser, body: { name: 'Bike Fund', targetAmount: 0 } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /positive number greater than zero/i);
  });

  await itAsync('Create should reject negative currentAmount (400)', async () => {
    const { res, getStatus, getJson } = mockRes();
    await savingsController.createSavingsGoal(
      { user: testUser, body: { name: 'Bike Fund', targetAmount: 5000, currentAmount: -100 } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /cannot be negative/i);
  });

  await itAsync('Create should reject past targetDate (400)', async () => {
    const pastDate = new Date('2020-01-01');
    const { res, getStatus, getJson } = mockRes();
    await savingsController.createSavingsGoal(
      { user: testUser, body: { name: 'Laptop', targetAmount: 60000, targetDate: pastDate } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /future date/i);
  });

  // =========================================================================
  // 3. ID VALIDATION & ACCESS CONTROL
  // =========================================================================
  console.log('\n[3. ID VALIDATION & ACCESS CONTROL]');

  await itAsync('GetById should reject invalid ObjectId (400)', async () => {
    const { res, getStatus, getJson } = mockRes();
    await savingsController.getSavingsGoalById(
      { user: testUser, params: { id: 'invalid-id-xyz' } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.match(getJson().message, /invalid savings goal id/i);
  });

  await itAsync('UpdateSavingsGoal should reject invalid ObjectId (400)', async () => {
    const { res, getStatus, getJson } = mockRes();
    await savingsController.updateSavingsGoal(
      { user: testUser, params: { id: 'bad-id' }, body: { targetAmount: 10000 } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.match(getJson().message, /invalid savings goal id/i);
  });

  await itAsync('AddContribution should reject invalid ObjectId (400)', async () => {
    const { res, getStatus, getJson } = mockRes();
    await savingsController.addContribution(
      { user: testUser, params: { id: 'bad-id' }, body: { amount: 500 } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.match(getJson().message, /invalid savings goal id/i);
  });

  await itAsync('DeleteSavingsGoal should reject invalid ObjectId (400)', async () => {
    const { res, getStatus, getJson } = mockRes();
    await savingsController.deleteSavingsGoal(
      { user: testUser, params: { id: 'bad-id' } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.match(getJson().message, /invalid savings goal id/i);
  });

  // =========================================================================
  // 4. METRIC & PROGRESS CALCULATIONS (enrichSavingsGoal)
  // =========================================================================
  console.log('\n[4. METRIC & PROGRESS CALCULATIONS]');

  it('Calculates progress, remaining, and IN_PROGRESS status correctly', () => {
    const enriched = savingsController.enrichSavingsGoal({
      name: 'MacBook Pro',
      targetAmount: 200000,
      currentAmount: 50000
    });
    assert.strictEqual(enriched.progressPercentage, 25);
    assert.strictEqual(enriched.remainingAmount, 150000);
    assert.strictEqual(enriched.status, 'IN_PROGRESS');
    assert.strictEqual(enriched.isCompleted, false);
  });

  it('Calculates COMPLETED status and caps progressPercentage at 100 when over-funded', () => {
    const enriched = savingsController.enrichSavingsGoal({
      name: 'Tablet',
      targetAmount: 50000,
      currentAmount: 60000
    });
    assert.strictEqual(enriched.progressPercentage, 100);
    assert.strictEqual(enriched.remainingAmount, 0);
    assert.strictEqual(enriched.status, 'COMPLETED');
    assert.strictEqual(enriched.isCompleted, true);
  });

  it('Handles zero current amount correctly', () => {
    const enriched = savingsController.enrichSavingsGoal({
      name: 'Retirement',
      targetAmount: 1000000,
      currentAmount: 0
    });
    assert.strictEqual(enriched.progressPercentage, 0);
    assert.strictEqual(enriched.remainingAmount, 1000000);
    assert.strictEqual(enriched.status, 'IN_PROGRESS');
    assert.strictEqual(enriched.isCompleted, false);
  });

  // =========================================================================
  // 5. CONTRIBUTION VALIDATIONS
  // =========================================================================
  console.log('\n[5. CONTRIBUTION VALIDATIONS]');

  await itAsync('AddContribution rejects <= 0 or missing amount (400)', async () => {
    const goalId = new mongoose.Types.ObjectId().toString();
    const { res, getStatus, getJson } = mockRes();
    await savingsController.addContribution(
      { user: testUser, params: { id: goalId }, body: { amount: 0 } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 400);
    assert.strictEqual(getJson().success, false);
    assert.match(getJson().message, /positive number greater than zero/i);
  });

  // =========================================================================
  // 6. CROSS-USER OWNERSHIP ISOLATION
  // =========================================================================
  console.log('\n[6. CROSS-USER OWNERSHIP ISOLATION]');

  // Mock SavingsGoal Mongoose model findOne / findOneAndDelete for unit isolation tests
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();
  const goalUserAId = new mongoose.Types.ObjectId();

  const mockGoalDoc = {
    _id: goalUserAId,
    userId: userAId,
    name: 'Emergency Fund A',
    targetAmount: 50000,
    currentAmount: 10000,
    toObject() { return { ...this }; },
    save: async function() { return this; }
  };

  SavingsGoal.findOne = (query) => {
    return {
      lean: async () => {
        if (
          String(query._id) === String(goalUserAId) &&
          String(query.userId) === String(userAId)
        ) {
          return { ...mockGoalDoc };
        }
        return null;
      },
      then(resolve) {
        if (
          String(query._id) === String(goalUserAId) &&
          String(query.userId) === String(userAId)
        ) {
          resolve(mockGoalDoc);
        } else {
          resolve(null);
        }
      }
    };
  };

  SavingsGoal.findOneAndDelete = async (query) => {
    if (
      String(query._id) === String(goalUserAId) &&
      String(query.userId) === String(userAId)
    ) {
      return mockGoalDoc;
    }
    return null;
  };

  await itAsync('GetById returns 404 when goal belongs to another user', async () => {
    const { res, getStatus } = mockRes();
    await savingsController.getSavingsGoalById(
      { user: { _id: userBId }, params: { id: goalUserAId.toString() } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 404);
  });

  await itAsync('UpdateSavingsGoal returns 404 when goal belongs to another user', async () => {
    const { res, getStatus } = mockRes();
    await savingsController.updateSavingsGoal(
      { user: { _id: userBId }, params: { id: goalUserAId.toString() }, body: { targetAmount: 70000 } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 404);
  });

  await itAsync('AddContribution returns 404 when goal belongs to another user', async () => {
    const { res, getStatus } = mockRes();
    await savingsController.addContribution(
      { user: { _id: userBId }, params: { id: goalUserAId.toString() }, body: { amount: 5000 } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 404);
  });

  await itAsync('DeleteSavingsGoal returns 404 when goal belongs to another user', async () => {
    const { res, getStatus } = mockRes();
    await savingsController.deleteSavingsGoal(
      { user: { _id: userBId }, params: { id: goalUserAId.toString() } },
      res,
      () => {}
    );
    assert.strictEqual(getStatus(), 404);
  });

  console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
  if (failedTests > 0) {
    console.error(`FAILED: ${failedTests} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('ALL PHASE 5 SAVINGS BACKEND UNIT & LOGICAL TESTS PASSED!\n');
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
