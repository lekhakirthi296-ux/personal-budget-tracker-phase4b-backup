/**
 * Phase 7 Notifications System Test Suite
 * Tests Notification model, controller endpoints, user ownership isolation,
 * single mark-as-read, mark-all-read, automatic event triggers (budget threshold,
 * savings contribution & completion, smart import), and demo account seeding.
 *
 * Run with: node server/tests/phase7_notifications.test.js
 */

'use strict';

const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Models & Controllers & Services
const Notification = require('../models/Notification');
const notificationRoutes = require('../routes/notificationRoutes');
const savingsRoutes = require('../routes/savingsRoutes');
const transactionRoutes = require('../routes/transactionRoutes');
const notificationService = require('../services/notificationService');
const demoService = require('../services/demoService');
const memoryStore = require('../config/inMemoryStore');
const db = require('../config/db');

// Ensure in-memory fallback is active for deterministic testing
db.setMongoConnected(false);

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_notifications_123';
process.env.JWT_SECRET = JWT_SECRET;

const mockUserA = {
  _id: new mongoose.Types.ObjectId('8a9712a76f2723652c42d881'),
  name: 'Alice Investor',
  email: 'alice@notifications.test'
};

const mockUserB = {
  _id: new mongoose.Types.ObjectId('8a9712a76f2723652c42d882'),
  name: 'Bob Saver',
  email: 'bob@notifications.test'
};

const tokenA = jwt.sign({ userId: mockUserA._id, email: mockUserA.email, name: mockUserA.name }, JWT_SECRET);
const tokenB = jwt.sign({ userId: mockUserB._id, email: mockUserB.email, name: mockUserB.name }, JWT_SECRET);

// Setup Express test app
const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);
app.use('/api/savings', savingsRoutes);
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

async function runNotificationTests() {
  console.log('=== RUNNING PHASE 7 NOTIFICATION SYSTEM TESTS ===\n');
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
  // 1. MODEL SCHEMA VALIDATION
  // -------------------------------------------------------------
  console.log('[1. NOTIFICATION MODEL SCHEMA VALIDATION]');

  try {
    const notif = new Notification({});
    const err = notif.validateSync();
    assert(err.errors.userId, 'Should require userId');
    assert(err.errors.title, 'Should require title');
    assert(err.errors.message, 'Should require message');
    pass('Notification model requires userId, title, and message');
  } catch (e) {
    fail('Notification model requires userId, title, and message', e);
  }

  try {
    const notif = new Notification({
      userId: mockUserA._id,
      title: 'Valid Alert',
      message: 'This is a test notification message.',
      type: 'budget_warning'
    });
    const err = notif.validateSync();
    assert.strictEqual(err, undefined);
    assert.strictEqual(notif.isRead, false);
    pass('Notification model validates valid notification document');
  } catch (e) {
    fail('Notification model validates valid notification document', e);
  }

  // -------------------------------------------------------------
  // 2. HTTP ENDPOINTS & ACCESS CONTROL
  // -------------------------------------------------------------
  console.log('\n[2. HTTP ENDPOINTS & ACCESS CONTROL]');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    // Test 1: Unauthenticated request rejected
    const unauthRes = await makeRequest(server, {
      path: '/api/notifications',
      method: 'GET'
    });
    assert.strictEqual(unauthRes.statusCode, 401);
    pass('GET /api/notifications rejects unauthenticated requests with 401');

    // Test 2: Create direct notifications for User A & User B
    const notifA1 = await notificationService.createNotification({
      userId: mockUserA._id,
      title: 'Budget Alert (85%)',
      message: 'Food budget has reached 85% utilization.',
      type: 'budget_warning',
      isRead: false
    });

    const notifA2 = await notificationService.createNotification({
      userId: mockUserA._id,
      title: 'Contribution Recorded',
      message: '₹2,000 deposited into Emergency Fund.',
      type: 'savings_contribution',
      isRead: false
    });

    const notifB1 = await notificationService.createNotification({
      userId: mockUserB._id,
      title: 'Bob Alert',
      message: 'Private alert for Bob only.',
      type: 'info',
      isRead: false
    });

    // Test 3: User A retrieves only their notifications & unread count
    const getResA = await makeRequest(server, {
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(getResA.statusCode, 200);
    assert.strictEqual(getResA.data.success, true);
    assert.strictEqual(getResA.data.data.unreadCount, 2);
    assert.strictEqual(getResA.data.data.total, 2);
    assert.strictEqual(getResA.data.data.notifications.some((n) => n._id === notifB1._id), false, 'User A must not see User B notification');
    pass('GET /api/notifications returns user notifications with strict cross-user isolation');

    // Test 4: User B cannot mark User A notification as read (returns 404)
    const unauthorizedMark = await makeRequest(server, {
      path: `/api/notifications/${notifA1._id}/read`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(unauthorizedMark.statusCode, 404);
    pass('Cross-user isolation: User B cannot mark User A notification as read (returns 404)');

    // Test 5: User A marks single notification as read
    const markSingleRes = await makeRequest(server, {
      path: `/api/notifications/${notifA1._id}/read`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(markSingleRes.statusCode, 200);
    assert.strictEqual(markSingleRes.data.data.notification.isRead, true);
    assert.strictEqual(markSingleRes.data.data.unreadCount, 1);
    pass('PATCH /api/notifications/:id/read marks single notification as read');

    // Test 6: User A marks all as read
    const markAllRes = await makeRequest(server, {
      path: '/api/notifications/read-all',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(markAllRes.statusCode, 200);
    assert.strictEqual(markAllRes.data.data.unreadCount, 0);

    const getResAAfter = await makeRequest(server, {
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(getResAAfter.data.data.unreadCount, 0);
    assert.strictEqual(getResAAfter.data.data.notifications.every((n) => n.isRead), true);
    pass('PATCH /api/notifications/read-all marks all user notifications as read');

    // -------------------------------------------------------------
    // 3. AUTOMATIC NOTIFICATION TRIGGERS
    // -------------------------------------------------------------
    console.log('\n[3. AUTOMATIC NOTIFICATION TRIGGERS]');

    // Test 7: Savings Contribution & Goal Completion Trigger
    const createGoalRes = await makeRequest(
      server,
      {
        path: '/api/savings',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` }
      },
      { name: 'Trip to Paris', targetAmount: 10000, currentAmount: 8000 }
    );
    assert.strictEqual(createGoalRes.statusCode, 201);
    const goalId = createGoalRes.data.data.savingsGoal._id;

    // Contribute ₹2,000 to reach 100%
    const contributeRes = await makeRequest(
      server,
      {
        path: `/api/savings/${goalId}/contribute`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` }
      },
      { amount: 2000 }
    );
    assert.strictEqual(contributeRes.statusCode, 200);

    const notifsAfterContribution = await makeRequest(server, {
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const contributionNotif = notifsAfterContribution.data.data.notifications.find(
      (n) => n.type === 'savings_contribution' && n.message.includes('Trip to Paris')
    );
    const completedNotif = notifsAfterContribution.data.data.notifications.find(
      (n) => n.type === 'savings_completed' && n.message.includes('Trip to Paris')
    );
    assert(contributionNotif, 'Should generate savings contribution notification');
    assert(completedNotif, 'Should generate savings goal completed notification when 100% is reached');
    pass('Savings deposit automatically generates contribution and 100% completion notifications');

    // Test 8: Smart Import Notification Trigger
    const importTxRes = await makeRequest(
      server,
      {
        path: '/api/transactions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` }
      },
      {
        type: 'expense',
        amount: 850,
        category: 'Food',
        date: new Date().toISOString(),
        paymentMethod: 'UPI',
        description: 'Swiggy Dinner Order',
        source: 'sms'
      }
    );
    assert.strictEqual(importTxRes.statusCode, 201);

    const notifsAfterImport = await makeRequest(server, {
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const importNotif = notifsAfterImport.data.data.notifications.find(
      (n) => n.type === 'import_success' && n.message.includes('850')
    );
    assert(importNotif, 'Should generate smart import notification');
    pass('Confirmed smart import automatically generates import_success notification');

    // -------------------------------------------------------------
    // 4. DEMO ACCOUNT NOTIFICATION SEEDING
    // -------------------------------------------------------------
    console.log('\n[4. DEMO ACCOUNT NOTIFICATION SEEDING]');

    const demoAccount = await demoService.getOrCreateDemoAccount();
    const demoToken = jwt.sign({ userId: demoAccount.id, email: demoAccount.email, isDemo: true }, JWT_SECRET);

    const demoNotifsRes = await makeRequest(server, {
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    assert.strictEqual(demoNotifsRes.statusCode, 200);
    assert(demoNotifsRes.data.data.notifications.length >= 3, 'Demo user must have sample notifications seeded');
    assert(demoNotifsRes.data.data.unreadCount > 0, 'Demo user should have unread notifications for demonstration');
    pass('Demo account is pre-seeded with realistic sample notifications and unread badge');

  } finally {
    server.close();
  }

  console.log(`\n=== RESULTS: ${passed}/${total} PHASE 7 NOTIFICATION TESTS PASSED ===\n`);
}

runNotificationTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
