const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMongoConnected } = require('../config/db');
const memoryStore = require('../config/inMemoryStore');
const { sendError } = require('../utils/apiResponse');

/**
 * Authentication Middleware
 * Protects routes by validating JWT Bearer tokens and attaching the user object to req.user.
 */
const authMiddleware = async (req, res, next) => {
  let token;

  // 1. Read Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Reject missing token
  if (!token) {
    return sendError(res, 'Authentication required', null, 401);
  }

  try {
    // 3. Verify JWT with secret from environment (or default fallback for preview)
    const jwtSecret = process.env.JWT_SECRET || 'personal_budget_tracker_secure_jwt_secret_key_2026';

    const decoded = jwt.verify(token, jwtSecret);

    // 4. Extract userId & find user in DB or in-memory store
    let user = null;
    if (isMongoConnected()) {
      user = await User.findById(decoded.userId).select('-password');
    } else {
      user = await memoryStore.findUserById(decoded.userId);
    }

    if (!user) {
      return sendError(res, 'User not found or session invalid', null, 401);
    }

    // 5. Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return sendError(res, 'Invalid or expired token', null, 401);
    }
    return sendError(res, 'Authentication failed', error.message, 500);
  }
};

module.exports = authMiddleware;
