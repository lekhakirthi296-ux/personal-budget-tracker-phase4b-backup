const assert = require('assert');
const http = require('http');
const app = require('../server');

let server;
let port;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runDemoTests() {
  console.log('=== RUNNING DEMO ACCOUNT INTEGRATION & ISOLATION TESTS ===\n');
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  // Start test server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  try {
    // 1. Test Demo Login
    const demoRes = await request('POST', '/api/auth/demo');
    test('POST /api/auth/demo returns 200 and valid JWT token with isDemo flag', () => {
      assert.strictEqual(demoRes.status, 200);
      assert.strictEqual(demoRes.body.success, true);
      assert.ok(demoRes.body.data.token, 'Token must be provided');
      assert.strictEqual(demoRes.body.data.user.email, 'demo@budgettracker.app');
      assert.strictEqual(demoRes.body.data.user.isDemo, true);
      assert.strictEqual(demoRes.body.data.user.name, 'Demo User');
    });

    const demoToken = demoRes.body.data.token;

    // 2. Test GET /api/auth/me with Demo Token
    const meRes = await request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${demoToken}`
    });
    test('GET /api/auth/me returns authenticated demo user profile with isDemo: true', () => {
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.success, true);
      assert.strictEqual(meRes.body.data.user.email, 'demo@budgettracker.app');
      assert.strictEqual(meRes.body.data.user.isDemo, true);
    });

    // 3. Test Demo User Dashboard Summary
    const summaryRes = await request('GET', '/api/dashboard/summary', null, {
      Authorization: `Bearer ${demoToken}`
    });
    test('Demo user receives realistic server-computed totals on dashboard summary', () => {
      assert.strictEqual(summaryRes.status, 200);
      assert.strictEqual(summaryRes.body.success, true);
      assert.ok(summaryRes.body.data.totalIncome > 0, 'Demo income should be positive');
      assert.ok(summaryRes.body.data.totalExpenses > 0, 'Demo expenses should be positive');
      assert.strictEqual(typeof summaryRes.body.data.balance, 'number');
    });

    // 4. Test Demo User Transactions
    const txRes = await request('GET', '/api/transactions', null, {
      Authorization: `Bearer ${demoToken}`
    });
    test('Demo user has income and expense transactions populated across categories', () => {
      assert.strictEqual(txRes.status, 200);
      assert.strictEqual(txRes.body.success, true);
      assert.ok(txRes.body.data.transactions.length >= 5, 'Should have multiple sample transactions');
      const hasIncome = txRes.body.data.transactions.some(t => t.type === 'income');
      const hasExpense = txRes.body.data.transactions.some(t => t.type === 'expense');
      assert.ok(hasIncome, 'Must have sample income');
      assert.ok(hasExpense, 'Must have sample expenses');
    });

    // 5. Test Demo User Budgets
    const now = new Date();
    const budgetsRes = await request('GET', `/api/budgets?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, null, {
      Authorization: `Bearer ${demoToken}`
    });
    test('Demo user has populated category budgets with utilization calculations', () => {
      assert.strictEqual(budgetsRes.status, 200);
      assert.strictEqual(budgetsRes.body.success, true);
      assert.ok(budgetsRes.body.data.budgets.length >= 2, 'Should have multiple sample budgets');
      const b = budgetsRes.body.data.budgets[0];
      assert.ok(b.category);
      assert.ok(typeof b.spentAmount === 'number');
      assert.ok(typeof b.percentageUsed === 'number');
    });

    // 6. Test Demo User Savings Goals
    const savingsRes = await request('GET', '/api/savings', null, {
      Authorization: `Bearer ${demoToken}`
    });
    test('Demo user has multiple savings goals with progress tracking', () => {
      assert.strictEqual(savingsRes.status, 200);
      assert.strictEqual(savingsRes.body.success, true);
      const goals = savingsRes.body.data.savingsGoals || [];
      assert.ok(goals.length >= 2, 'Should have at least 2 savings goals');
      const completedGoal = goals.find(g => g.status === 'COMPLETED' || g.progressPercentage === 100);
      const inProgressGoal = goals.find(g => g.status === 'IN_PROGRESS');
      assert.ok(completedGoal || inProgressGoal, 'Should have formatted savings goals');
    });

    // 7. Test Normal User Registration & Strict Isolation from Demo
    const uniqueEmail = `regular_user_${Date.now()}@example.com`;
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Regular Test User',
      email: uniqueEmail,
      password: 'StrongPassword123!'
    });
    test('Regular user registration works normally with isDemo: false', () => {
      assert.strictEqual(regRes.status, 201);
      assert.strictEqual(regRes.body.success, true);
      assert.ok(regRes.body.data.token);
      assert.strictEqual(regRes.body.data.user.email, uniqueEmail);
      assert.strictEqual(Boolean(regRes.body.data.user.isDemo), false);
    });

    const userToken = regRes.body.data.token;

    // 8. Test Regular User Sees 0 Transactions Initially (Not Demo Data)
    const userTxRes = await request('GET', '/api/transactions', null, {
      Authorization: `Bearer ${userToken}`
    });
    test('Regular user is strictly isolated and does not see Demo user transactions', () => {
      assert.strictEqual(userTxRes.status, 200);
      assert.strictEqual(userTxRes.body.data.transactions.length, 0);
    });

    // 9. Test Regular User Cannot Mutate or Delete Demo User Goals
    const demoGoals = savingsRes.body.data.savingsGoals || [];
    if (demoGoals.length > 0) {
      const demoGoalId = demoGoals[0].id || demoGoals[0]._id;
      const deleteAttempt = await request('DELETE', `/api/savings/${demoGoalId}`, null, {
        Authorization: `Bearer ${userToken}`
      });
      test('Regular user cannot delete or tamper with demo user savings goal (returns 404)', () => {
        assert.strictEqual(deleteAttempt.status, 404);
      });
    }

    // 10. Test Normal Login Still Works
    const loginRes = await request('POST', '/api/auth/login', {
      email: uniqueEmail,
      password: 'StrongPassword123!'
    });
    test('Normal email/password login succeeds unchanged for standard users', () => {
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginRes.body.success, true);
      assert.ok(loginRes.body.data.token);
    });

    console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===\n`);
    if (passed !== total) {
      process.exit(1);
    }
  } finally {
    if (server) {
      server.close();
    }
  }
}

if (require.main === module) {
  runDemoTests().catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runDemoTests };
