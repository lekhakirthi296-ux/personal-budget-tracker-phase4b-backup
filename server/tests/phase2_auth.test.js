/**
 * Phase 2 Automated Verification Suite
 * Tests User model, Bcrypt hashing, JWT auth, Auth middleware, and Controllers.
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
}

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const app = require('../server');
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
  console.log('\n=== RUNNING PHASE 2 BACKEND VERIFICATION TESTS ===\n');

  console.log('[1. USER MODEL & SCHEMA VALIDATION]');
  
  it('User model should require name', () => {
    const user = new User({ email: 'test@example.com', password: 'Password123' });
    const err = user.validateSync();
    assert.ok(err.errors.name, 'Expected name validation error');
  });

  it('User model should require email', () => {
    const user = new User({ name: 'Test User', password: 'Password123' });
    const err = user.validateSync();
    assert.ok(err.errors.email, 'Expected email validation error');
  });

  it('User model should reject invalid email format', () => {
    const user = new User({ name: 'Test User', email: 'invalid-email', password: 'Password123' });
    const err = user.validateSync();
    assert.ok(err.errors.email, 'Expected invalid email regex error');
  });

  it('User model should require password of minimum 8 characters', () => {
    const user = new User({ name: 'Test User', email: 'test@example.com', password: '123' });
    const err = user.validateSync();
    assert.ok(err.errors.password, 'Expected password minlength error');
    assert.strictEqual(err.errors.password.kind, 'minlength');
  });

  it('User model should accept valid user schema data', () => {
    const user = new User({ name: '  Test User  ', email: 'TEST@Example.COM', password: 'Password123' });
    const err = user.validateSync();
    assert.strictEqual(err, undefined, 'Expected no validation errors');
    assert.strictEqual(user.name, 'Test User', 'Expected trimmed name');
    assert.strictEqual(user.email, 'test@example.com', 'Expected lowercase email');
  });

  console.log('\n[2. BCRYPTJS PASSWORD HASHING & MATCHING]');

  await itAsync('User pre-save hook should hash password using bcryptjs', async () => {
    const rawPassword = 'SecurePassword123!';
    const user = new User({ name: 'Bcrypt User', email: 'bcrypt@test.com', password: rawPassword });
    
    // Trigger pre-save hook manually
    await new Promise((resolve, reject) => {
      user.schema.s.hooks.execPre('save', user, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    assert.notStrictEqual(user.password, rawPassword, 'Password must not remain plaintext');
    assert.ok(user.password.startsWith('$2'), 'Password must be valid bcrypt hash');

    // Test matchPassword method
    const isMatch = await user.matchPassword(rawPassword);
    assert.strictEqual(isMatch, true, 'matchPassword should return true for correct password');

    const isWrongMatch = await user.matchPassword('WrongPassword123');
    assert.strictEqual(isWrongMatch, false, 'matchPassword should return false for incorrect password');
  });

  it('User toJSON transform should never return password or __v', () => {
    const user = new User({ name: 'Safe User', email: 'safe@test.com', password: '$2a$10$hashedpasswordhere' });
    const json = user.toJSON();
    assert.strictEqual(json.password, undefined, 'toJSON must delete password');
    assert.strictEqual(json.__v, undefined, 'toJSON must delete __v');
    assert.strictEqual(json.name, 'Safe User');
  });

  console.log('\n[3. JWT TOKEN GENERATION & EXPIRATION]');

  it('JWT secret must come from environment and create verifiable token', () => {
    const userId = '64f1a2b3c4d5e6f7a8b9c0d1';
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    assert.ok(typeof token === 'string' && token.length > 20, 'Token must be valid string');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.userId, userId, 'Decoded token should match userId');
    assert.ok(decoded.exp > decoded.iat, 'Token should have expiration timestamp');
  });

  console.log('\n[4. AUTH MIDDLEWARE SECURITY]');

  await itAsync('Auth middleware should reject request with missing Authorization header (401)', async () => {
    const req = { headers: {} };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };
    const next = () => { throw new Error('next() should not be called'); };

    await authMiddleware(req, res, next);
    assert.strictEqual(statusSent, 401, 'Should return 401 status code');
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Authentication required');
  });

  await itAsync('Auth middleware should reject invalid JWT token (401)', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.payload' } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };
    const next = () => { throw new Error('next() should not be called'); };

    await authMiddleware(req, res, next);
    assert.strictEqual(statusSent, 401, 'Should return 401 status code');
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Invalid or expired token');
  });

  console.log('\n[5. AUTH CONTROLLER INPUT VALIDATION]');

  await itAsync('Register should reject empty name (400)', async () => {
    const req = { body: { name: '', email: 'test@example.com', password: 'Password123' } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await authController.register(req, res, () => {});
    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Please provide a name');
  });

  await itAsync('Register should reject invalid email format (400)', async () => {
    const req = { body: { name: 'Valid Name', email: 'not-an-email', password: 'Password123' } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await authController.register(req, res, () => {});
    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Please provide a valid email address');
  });

  await itAsync('Register should reject password below 8 characters (400)', async () => {
    const req = { body: { name: 'Valid Name', email: 'test@example.com', password: 'short' } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await authController.register(req, res, () => {});
    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Password must be at least 8 characters');
  });

  await itAsync('Login should reject missing credentials (400)', async () => {
    const req = { body: { email: '', password: '' } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await authController.login(req, res, () => {});
    assert.strictEqual(statusSent, 400);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, 'Please provide both email and password');
  });

  await itAsync('getCurrentUser should return authenticated user without password', async () => {
    const req = {
      user: {
        _id: '64f1a2b3c4d5e6f7a8b9c0d1',
        name: 'Test User',
        email: 'test@example.com'
      }
    };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    await authController.getCurrentUser(req, res, () => {});
    assert.strictEqual(statusSent, 200);
    assert.strictEqual(jsonSent.success, true);
    assert.strictEqual(jsonSent.data.user.name, 'Test User');
    assert.strictEqual(jsonSent.data.user.email, 'test@example.com');
    assert.strictEqual(jsonSent.data.user.password, undefined);
  });

  console.log('\n[6. API HEALTH CHECK VERIFICATION]');

  await itAsync('GET /api/health should return operational status', async () => {
    const { getHealthStatus } = require('../controllers/healthController');
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    getHealthStatus({}, res);
    assert.strictEqual(statusSent, 200);
    assert.strictEqual(jsonSent.success, true);
    assert.strictEqual(jsonSent.message, 'Personal Budget Tracker API is running');
  });

  console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
  if (passedTests === totalTests) {
    console.log('ALL PHASE 2 UNIT & LOGICAL VERIFICATION TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error('SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTests();
