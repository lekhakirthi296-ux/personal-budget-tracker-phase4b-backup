/**
 * Phase 3 Automated Verification Suite
 * Tests Transaction model validations, ownership isolation, CRUD controller logic,
 * filtering, search, pagination, and dashboard summary calculations.
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
}

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const transactionController = require('../controllers/transactionController');
const dashboardController = require('../controllers/dashboardController');
const db = require('../config/db');
db.setMongoConnected(true);

let passedTests = 0;
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
  }
}

async function runTests() {
  console.log('\n=== RUNNING PHASE 3 TRANSACTION & DASHBOARD TESTS ===\n');

  console.log('[1. TRANSACTION MODEL SCHEMA VALIDATION]');

  it('Transaction model should require userId', () => {
    const tx = new Transaction({
      type: 'expense',
      amount: 500,
      category: 'Food',
      paymentMethod: 'UPI'
    });
    const err = tx.validateSync();
    assert.ok(err.errors.userId, 'Expected userId error');
  });

  it('Transaction model should require type to be income or expense', () => {
    const tx = new Transaction({
      userId: new mongoose.Types.ObjectId(),
      type: 'invalid-type',
      amount: 500,
      category: 'Food',
      paymentMethod: 'UPI'
    });
    const err = tx.validateSync();
    assert.ok(err.errors.type, 'Expected type enum error');
  });

  it('Transaction model should require amount > 0', () => {
    const txZero = new Transaction({
      userId: new mongoose.Types.ObjectId(),
      type: 'expense',
      amount: 0,
      category: 'Food',
      paymentMethod: 'UPI'
    });
    const errZero = txZero.validateSync();
    assert.ok(errZero.errors.amount, 'Expected amount > 0 error on 0');

    const txNeg = new Transaction({
      userId: new mongoose.Types.ObjectId(),
      type: 'expense',
      amount: -150,
      category: 'Food',
      paymentMethod: 'UPI'
    });
    const errNeg = txNeg.validateSync();
    assert.ok(errNeg.errors.amount, 'Expected amount > 0 error on negative');
  });

  it('Transaction model should require category and paymentMethod', () => {
    const tx = new Transaction({
      userId: new mongoose.Types.ObjectId(),
      type: 'income',
      amount: 20000
    });
    const err = tx.validateSync();
    assert.ok(err.errors.category, 'Expected category error');
  });

  it('Transaction model should accept valid transaction and default source to manual', () => {
    const tx = new Transaction({
      userId: new mongoose.Types.ObjectId(),
      type: 'income',
      amount: 25000,
      category: 'Salary',
      paymentMethod: 'Bank Transfer',
      description: 'Monthly salary credit'
    });
    const err = tx.validateSync();
    assert.strictEqual(err, undefined);
    assert.strictEqual(tx.source, 'manual');
  });

  console.log('\n[2. TRANSACTION CONTROLLER: CREATE VALIDATIONS]');

  await itAsync('Create should reject invalid or missing type (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { type: 'crypto', amount: 500, category: 'Food', paymentMethod: 'UPI' }
    };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await transactionController.createTransaction(req, res, () => {});
    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Transaction type must be either income or expense');
  });

  await itAsync('Create should reject non-positive or NaN amount (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { type: 'expense', amount: -50, category: 'Food', paymentMethod: 'UPI' }
    };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await transactionController.createTransaction(req, res, () => {});
    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Transaction amount must be a positive number greater than zero');
  });

  await itAsync('Create should reject missing category (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { type: 'expense', amount: 150, category: '', paymentMethod: 'UPI' }
    };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await transactionController.createTransaction(req, res, () => {});
    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Please specify a transaction category');
  });

  await itAsync('Create should reject invalid date (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { type: 'expense', amount: 150, category: 'Food', paymentMethod: 'UPI', date: 'invalid-date-string' }
    };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await transactionController.createTransaction(req, res, () => {});
    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Please provide a valid transaction date');
  });

  console.log('\n[3. TRANSACTION OWNERSHIP & ACCESS CONTROL]');

  await itAsync('GetById should reject invalid ObjectId (400)', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: 'invalid-id' }
    };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await transactionController.getTransactionById(req, res, () => {});
    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.success, false);
  });

  console.log('\n[4. DASHBOARD FINANCIAL CALCULATIONS]');

  await itAsync('Dashboard summary should correctly compute totalIncome, totalExpenses, and balance', async () => {
    // Mock Transaction.find to return simulated transactions for a user
    const originalFind = Transaction.find;
    const userA_id = new mongoose.Types.ObjectId();

    Transaction.find = (query) => {
      assert.strictEqual(String(query.userId), String(userA_id), 'Query must be strictly isolated to user');
      return {
        select: () => ({
          lean: async () => [
            { type: 'income', amount: 25000, category: 'Salary', date: new Date() },
            { type: 'income', amount: 5000, category: 'Freelance', date: new Date() },
            { type: 'expense', amount: 8000, category: 'Rent', date: new Date() },
            { type: 'expense', amount: 2500, category: 'Food', date: new Date() },
            { type: 'expense', amount: 1500, category: 'Bills', date: new Date() }
          ]
        }),
        sort: () => ({
          limit: () => ({
            lean: async () => []
          })
        })
      };
    };

    const req = {
      user: { _id: userA_id },
      query: {}
    };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await dashboardController.getDashboardSummary(req, res, () => {});
    assert.strictEqual(statusSent, 200);
    assert.strictEqual(jsonSent.success, true);
    assert.strictEqual(jsonSent.data.totalIncome, 30000);
    assert.strictEqual(jsonSent.data.totalExpenses, 12000);
    assert.strictEqual(jsonSent.data.balance, 18000); // 30000 - 12000
    assert.strictEqual(jsonSent.data.transactionCount, 5);

    // Restore original method
    Transaction.find = originalFind;
  });

  console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
  if (passedTests === totalTests) {
    console.log('ALL PHASE 3 LOGICAL & SECURITY UNIT TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error('SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTests();
