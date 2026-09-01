/**
 * Express HTTP Integration Test for Phase 2 Auth Endpoints
 */

const http = require('http');
const assert = require('assert');
const app = require('../server');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
db.setMongoConnected(true);

let server;
let port;
let baseUrl;

// In-memory fake database store for integration testing
const userDatabase = new Map();

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

// Intercept Mongoose model calls for mock testing
User.findOne = async ({ email }) => {
  return userDatabase.get(email) || null;
};

User.create = async ({ name, email, password }) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const user = {
    _id: 'usr_' + Math.random().toString(36).substr(2, 9),
    name,
    email,
    password: hashedPassword,
    matchPassword: async function(enteredPassword) {
      return await bcrypt.compare(enteredPassword, this.password);
    },
    toJSON: function() {
      const copy = { ...this };
      delete copy.password;
      delete copy.__v;
      return copy;
    }
  };
  userDatabase.set(email, user);
  return user;
};

User.findById = (id) => ({
  select: async (fields) => {
    for (const u of userDatabase.values()) {
      if (u._id === id) {
        const copy = { ...u };
        if (fields.includes('-password')) {
          delete copy.password;
        }
        return copy;
      }
    }
    return null;
  }
});

async function runE2ETests() {
  console.log('\n=== RUNNING EXPRESS HTTP ROUTE INTEGRATION TESTS ===\n');
  await startTestServer();

  let registeredToken = null;
  let testUserId = null;

  try {
    // 1. Test GET /api/health
    console.log('[Test 1] GET /api/health');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthData.success, true);
    console.log('  ✓ PASS: GET /api/health returns 200 OK and success: true');

    // 2. Test POST /api/auth/register (Valid registration)
    console.log('\n[Test 2] POST /api/auth/register (Success case)');
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123'
      })
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regData.success, true);
    assert.strictEqual(regData.data.user.name, 'Jane Doe');
    assert.strictEqual(regData.data.user.email, 'jane@example.com');
    assert.strictEqual(regData.data.user.password, undefined);
    assert.ok(regData.data.token, 'Must return JWT token');
    registeredToken = regData.data.token;
    testUserId = regData.data.user.id;
    console.log('  ✓ PASS: Registration creates user, returns safe user data, and issues JWT');

    // 3. Test POST /api/auth/register (Duplicate email)
    console.log('\n[Test 3] POST /api/auth/register (Duplicate email rejection)');
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Clone',
        email: 'jane@example.com',
        password: 'Password123'
      })
    });
    const dupData = await dupRes.json();
    assert.strictEqual(dupRes.status, 400);
    assert.strictEqual(dupData.success, false);
    assert.strictEqual(dupData.message, 'User with this email already exists');
    console.log('  ✓ PASS: Duplicate email correctly rejected with 400');

    // 4. Test POST /api/auth/login (Success case)
    console.log('\n[Test 4] POST /api/auth/login (Valid credentials)');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jane@example.com',
        password: 'Password123'
      })
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginData.success, true);
    assert.strictEqual(loginData.data.user.email, 'jane@example.com');
    assert.ok(loginData.data.token);
    console.log('  ✓ PASS: Login successful with valid credentials');

    // 5. Test POST /api/auth/login (Invalid password)
    console.log('\n[Test 5] POST /api/auth/login (Wrong password)');
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jane@example.com',
        password: 'WrongPassword999'
      })
    });
    const wrongPassData = await wrongPassRes.json();
    assert.strictEqual(wrongPassRes.status, 401);
    assert.strictEqual(wrongPassData.success, false);
    assert.strictEqual(wrongPassData.message, 'Invalid email or password');
    console.log('  ✓ PASS: Wrong password rejected with generic 401 message');

    // 6. Test POST /api/auth/login (Non-existent email)
    console.log('\n[Test 6] POST /api/auth/login (Unknown email)');
    const unknownRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@example.com',
        password: 'Password123'
      })
    });
    const unknownData = await unknownRes.json();
    assert.strictEqual(unknownRes.status, 401);
    assert.strictEqual(unknownData.success, false);
    assert.strictEqual(unknownData.message, 'Invalid email or password');
    console.log('  ✓ PASS: Unknown email rejected with identical generic 401 message');

    // 7. Test GET /api/auth/me (Valid Bearer Token)
    console.log('\n[Test 7] GET /api/auth/me (Authenticated request)');
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${registeredToken}` }
    });
    const meData = await meRes.json();
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meData.success, true);
    assert.strictEqual(meData.data.user.id, testUserId);
    assert.strictEqual(meData.data.user.email, 'jane@example.com');
    assert.strictEqual(meData.data.user.password, undefined);
    console.log('  ✓ PASS: GET /api/auth/me returns authenticated user profile without password');

    // 8. Test GET /api/auth/me (Missing Token)
    console.log('\n[Test 8] GET /api/auth/me (Missing token)');
    const noTokenRes = await fetch(`${baseUrl}/api/auth/me`);
    const noTokenData = await noTokenRes.json();
    assert.strictEqual(noTokenRes.status, 401);
    assert.strictEqual(noTokenData.success, false);
    assert.strictEqual(noTokenData.message, 'Authentication required');
    console.log('  ✓ PASS: Missing token rejected with 401 Authentication required');

    // 9. Test GET /api/auth/me (Invalid Token)
    console.log('\n[Test 9] GET /api/auth/me (Malformed token)');
    const badTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer bad_token_xyz' }
    });
    const badTokenData = await badTokenRes.json();
    assert.strictEqual(badTokenRes.status, 401);
    assert.strictEqual(badTokenData.success, false);
    assert.strictEqual(badTokenData.message, 'Invalid or expired token');
    console.log('  ✓ PASS: Malformed token rejected with 401 Invalid or expired token');

    console.log('\nALL 9 END-TO-END HTTP ROUTE TESTS PASSED!\n');
  } finally {
    await stopTestServer();
  }
}

runE2ETests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
