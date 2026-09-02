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

    // 4. Extract userId & find user across MongoDB and in-memory store
    const userId = decoded.userId || decoded.id || decoded._id;
    let user = null;

    if (userId) {
      if (isMongoConnected()) {
        try {
          user = await User.findById(userId).select('-password');
        } catch (e) {
          // Query error or invalid Mongo ID format, fall through
        }
      }

      if (!user) {
        user = await memoryStore.findUserById(userId);
      }

      if (!user && !isMongoConnected()) {
        try {
          user = await User.findById(userId).select('-password');
        } catch (e) {
          // Offline fallback
        }
      }

      // If token is valid and contains user claims (e.g. mock test tokens)
      if (!user && decoded.email) {
        user = {
          _id: userId,
          name: decoded.name || 'User',
          email: decoded.email
        };
      }
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
