const mongoose = require('mongoose');

// CRITICAL: Disable command buffering so operations fail fast / use fallback rather than hanging indefinitely if Mongo is offline
mongoose.set('bufferCommands', false);

let _forceConnected = null;
const setMongoConnected = (val) => { _forceConnected = val; };
const isMongoConnected = () => (_forceConnected !== null ? _forceConnected : mongoose.connection.readyState === 1);

/**
 * Connect to MongoDB database.
 * Gracefully logs warnings if database connection fails, allowing the server
 * to seamlessly fall back to in-memory store for development/preview.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[Database] No MONGODB_URI provided. Active in-memory store fallback enabled.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500 // Quick timeout to prevent server hang if Mongo is offline
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database Warning] MongoDB connection failed: ${error.message}`);
    console.warn('[Database Warning] In-memory store fallback is active.');
  }
};

module.exports = { connectDB, isMongoConnected, setMongoConnected };

