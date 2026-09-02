/**
 * Phase 6 Smart Transaction Import Tests
 * Tests SMS & text parsing, confidence scoring, duplicate detection,
 * source tagging, and user isolation.
 */

const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Models & Services
const Transaction = require('../models/Transaction');
const transactionRoutes = require('../routes/transactionRoutes');
const { parseTransactionText, checkDuplicateTransaction } = require('../services/transactionImportService');
const memoryStore = require('../config/inMemoryStore');

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_dev_key_12345';
process.env.JWT_SECRET = JWT_SECRET;

const mockUserA = {
  _id: new mongoose.Types.ObjectId('7a9712a76f2723652c42d771'),
  name: 'User A',
  email: 'usera@smartimport.test'
};

const mockUserB = {
  _id: new mongoose.Types.ObjectId('7a9712a76f2723652c42d772'),
  name: 'User B',
  email: 'userb@smartimport.test'
};

const tokenA = jwt.sign({ id: mockUserA._id, email: mockUserA.email }, JWT_SECRET);
const tokenB = jwt.sign({ id: mockUserB._id, email: mockUserB.email }, JWT_SECRET);

// Setup Express Test App
const app = express();
app.use(express.json());
app.use('/api/transactions', transactionRoutes);

function makeRequest(server, options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        ...options
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : null;
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: rawData });
          }
        });
      }
    );

    req.on('error', reject);

    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runPhase6Tests() {
  console.log('=== RUNNING PHASE 6 SMART TRANSACTION IMPORT TESTS ===\n');
  let passed = 0;
  let total = 0;

  function pass(desc) {
    passed++;
    total++;
    console.log(`  ✓ PASS: ${desc}`);
  }

  function fail(desc, err) {
    total++;
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(err);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // UNIT TESTS: SMS PARSING ENGINE
  // -------------------------------------------------------------
  console.log('[1. SMS PARSING ENGINE UNIT TESTS]');

  // Test 1: Standard UPI Expense SMS
  try {
    const res = parseTransactionText('₹450 spent at ABC Store via UPI on 31 Aug 2026');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.detected.type, 'expense');
    assert.strictEqual(res.detected.amount, 450);
    assert.strictEqual(res.detected.paymentMethod, 'UPI');
    assert.strictEqual(res.detected.category, 'Shopping');
    assert.strictEqual(res.detected.source, 'sms');
    assert(res.confidence.score >= 0.75, 'Confidence score should be high');
    assert.strictEqual(res.confidence.level, 'high');
    pass('Parses standard UPI expense SMS with high confidence');
  } catch (e) {
    fail('Parses standard UPI expense SMS with high confidence', e);
  }

  // Test 2: Salary Credit Income SMS
  try {
    const res = parseTransactionText('Your A/C *4829 is credited with Rs 50,000.00 on 01-Sep-2026 by Monthly Salary');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.detected.type, 'income');
    assert.strictEqual(res.detected.amount, 50000);
    assert.strictEqual(res.detected.category, 'Salary');
    assert.strictEqual(res.detected.source, 'sms');
    assert.strictEqual(res.confidence.level, 'high');
    pass('Parses salary credit income notification accurately');
  } catch (e) {
    fail('Parses salary credit income notification accurately', e);
  }

  // Test 3: Food Delivery & Card SMS
  try {
    const res = parseTransactionText('A/C *1234 debited by Rs 680.00 on 28-Aug-2026 towards Swiggy UPI:swiggy@icici');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.detected.type, 'expense');
    assert.strictEqual(res.detected.amount, 680);
    assert.strictEqual(res.detected.category, 'Food');
    assert.strictEqual(res.detected.paymentMethod, 'UPI');
    pass('Identifies Swiggy food delivery and categorizes as Food');
  } catch (e) {
    fail('Identifies Swiggy food delivery and categorizes as Food', e);
  }

  // Test 4: Transportation / Ride SMS
  try {
    const res = parseTransactionText('Rs 320.00 paid for Uber ride via Debit Card ending 4412 on 29-Aug-2026');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.detected.type, 'expense');
    assert.strictEqual(res.detected.amount, 320);
    assert.strictEqual(res.detected.category, 'Transportation');
    assert.strictEqual(res.detected.paymentMethod, 'Debit Card');
    pass('Identifies Uber ride and maps to Transportation & Debit Card');
  } catch (e) {
    fail('Identifies Uber ride and maps to Transportation & Debit Card', e);
  }

  // Test 5: Comma Amount Formatting & Utility Bill
  try {
    const res = parseTransactionText('INR 2,450.50 paid towards Electricity bill via Net Banking on 15 Aug 2026');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.detected.amount, 2450.5);
    assert.strictEqual(res.detected.category, 'Utilities');
    assert.strictEqual(res.detected.paymentMethod, 'Net Banking');
    pass('Handles comma formatted amounts (INR 2,450.50) and categorizes Utilities');
  } catch (e) {
    fail('Handles comma formatted amounts (INR 2,450.50) and categorizes Utilities', e);
  }

  // Test 6: Low Confidence / Vague Input
  try {
    const res = parseTransactionText('Hey check this out some numbers 99999999');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.confidence.level, 'low');
    pass('Flags vague/unstructured messages as low confidence');
  } catch (e) {
    fail('Flags vague/unstructured messages as low confidence', e);
  }

  // Test 7: Empty or Invalid Input Validation
  try {
    const res = parseTransactionText('');
    assert.strictEqual(res.success, false);
    assert(res.error, 'Should contain validation error');
    pass('Rejects empty input with validation error');
  } catch (e) {
    fail('Rejects empty input with validation error', e);
  }

  // -------------------------------------------------------------
  // HTTP END-TO-END INTEGRATION TESTS
  // -------------------------------------------------------------
  console.log('\n[2. HTTP END-TO-END & INTEGRATION TESTS]');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    // Test 8: Unauthenticated detection request rejected (401)
    const unauthRes = await makeRequest(
      server,
      { path: '/api/transactions/import/detect', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { text: 'Rs 500 spent on Food' }
    );
    assert.strictEqual(unauthRes.statusCode, 401);
    pass('POST /api/transactions/import/detect rejects unauthenticated requests with 401');

    // Test 9: Detect endpoint returns structured payload without mutating database
    const initialTxCount = memoryStore.transactions.length;
    const detectRes = await makeRequest(
      server,
      {
        path: '/api/transactions/import/detect',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        }
      },
      { text: 'A/C debited with Rs 1,850 at Zara Store via Credit Card on 30-Aug-2026' }
    );
    assert.strictEqual(detectRes.statusCode, 200);
    assert.strictEqual(detectRes.data.success, true);
    assert.strictEqual(detectRes.data.data.detected.amount, 1850);
    assert.strictEqual(detectRes.data.data.detected.category, 'Shopping');
    assert.strictEqual(detectRes.data.data.detected.paymentMethod, 'Credit Card');
    assert.strictEqual(detectRes.data.data.detected.source, 'sms');
    assert.strictEqual(memoryStore.transactions.length, initialTxCount, 'Detection must not silently save record');
    pass('POST /api/transactions/import/detect extracts data without mutating transactions table');

    // Test 10: Confirm & Save transaction with source='sms'
    const createRes = await makeRequest(
      server,
      {
        path: '/api/transactions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        }
      },
      {
        type: detectRes.data.data.detected.type,
        amount: detectRes.data.data.detected.amount,
        category: detectRes.data.data.detected.category,
        date: detectRes.data.data.detected.date,
        paymentMethod: detectRes.data.data.detected.paymentMethod,
        description: 'Zara shopping import',
        source: 'sms'
      }
    );
    assert.strictEqual(createRes.statusCode, 201);
    assert.strictEqual(createRes.data.data.transaction.source, 'sms');
    assert.strictEqual(createRes.data.data.transaction.amount, 1850);
    pass('Explicit confirmation creates transaction with source=sms');

    // Test 11: Duplicate detection warning for same user and amount
    const dupDetectRes = await makeRequest(
      server,
      {
        path: '/api/transactions/import/detect',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        }
      },
      { text: 'Rs 1,850 paid at Zara via Credit Card on 30-Aug-2026' }
    );
    assert.strictEqual(dupDetectRes.statusCode, 200);
    assert.strictEqual(dupDetectRes.data.data.duplicateCheck.isDuplicate, true);
    assert(dupDetectRes.data.data.duplicateCheck.duplicateWarning.includes('duplicate'));
    assert.strictEqual(dupDetectRes.data.data.duplicateCheck.matchingTransaction.amount, 1850);
    pass('Detects duplicate transaction warning when matching record exists');

    // Test 12: Cross-user isolation in duplicate detection
    const userBDupRes = await makeRequest(
      server,
      {
        path: '/api/transactions/import/detect',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        }
      },
      { text: 'Rs 1,850 paid at Zara on 30-Aug-2026' }
    );
    assert.strictEqual(userBDupRes.statusCode, 200);
    assert.strictEqual(userBDupRes.data.data.duplicateCheck.isDuplicate, false, 'User B must not see User A duplicates');
    pass('Duplicate checks are strictly isolated to authenticated user');

  } finally {
    server.close();
  }

  console.log(`\n=== RESULTS: ${passed}/${total} PHASE 6 TESTS PASSED ===\n`);
}

runPhase6Tests().catch((e) => {
  console.error(e);
  process.exit(1);
});
