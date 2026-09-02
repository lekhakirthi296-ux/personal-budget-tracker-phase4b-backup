const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMongoConnected } = require('../config/db');
const memoryStore = require('../config/inMemoryStore');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { getOrCreateDemoAccount, DEMO_EMAIL } = require('../services/demoService');

// Email validation regex pattern
const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

/**
 * Helper to generate JWT token with userId payload
 * @param {string} userId
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'personal_budget_tracker_secure_jwt_secret_key_2026';
  return jwt.sign({ userId: String(userId) }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * @desc   Register a new user
 * @route  POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1. Request field validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(res, 'Please provide a name', null, 400);
    }

    if (name.trim().length > 100) {
      return sendError(res, 'Name cannot exceed 100 characters', null, 400);
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return sendError(res, 'Please provide an email address', null, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return sendError(res, 'Please provide a valid email address', null, 400);
    }

    if (!password || typeof password !== 'string') {
      return sendError(res, 'Please provide a password', null, 400);
    }

    if (password.length < 8) {
      return sendError(res, 'Password must be at least 8 characters', null, 400);
    }

    let user;

    if (isMongoConnected()) {
      // Check whether email already exists in MongoDB
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return sendError(res, 'User with this email already exists', null, 400);
      }

      // Create user (password is automatically hashed via pre-save hook)
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password
      });
    } else {
      // In-Memory Fallback
      const existingUser = await memoryStore.findUserByEmail(normalizedEmail);
      if (existingUser) {
        return sendError(res, 'User with this email already exists', null, 400);
      }

      user = await memoryStore.createUser({
        name: name.trim(),
        email: normalizedEmail,
        password
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    // Return safe user data and token
    return sendSuccess(
      res,
      'User registered successfully',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        token
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Authenticate user & obtain token
 * @route  POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate request fields
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return sendError(res, 'Please provide both email and password', null, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find user
    let user;
    if (isMongoConnected()) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      user = await memoryStore.findUserByEmail(normalizedEmail);
    }

    if (!user) {
      return sendError(res, 'Invalid email or password', null, 401);
    }

    // 3. Compare password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password', null, 401);
    }

    // 4. Generate JWT
    const token = generateToken(user._id);

    // 5. Return safe user information and token
    return sendSuccess(
      res,
      'Login successful',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        token
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get current authenticated user profile
 * @route  GET /api/auth/me
 * @access Private (Protected by authMiddleware)
 */
const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required', null, 401);
    }

    const isDemo = req.user.email === DEMO_EMAIL;

    return sendSuccess(
      res,
      'Authenticated user',
      {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          isDemo
        }
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Authenticate and log in to the dedicated public demo account
 * @route  POST /api/auth/demo
 * @access Public
 */
const loginDemo = async (req, res, next) => {
  try {
    const demoAccount = await getOrCreateDemoAccount();
    const token = generateToken(demoAccount.id);

    return sendSuccess(
      res,
      'Demo account login successful',
      {
        user: {
          id: demoAccount.id,
          name: demoAccount.name,
          email: demoAccount.email,
          isDemo: true
        },
        token
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  loginDemo
};

