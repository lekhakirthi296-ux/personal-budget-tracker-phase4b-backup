const mongoose = require('mongoose');

/**
 * Connect to MongoDB database.
 * Gracefully logs warnings if database connection fails, allowing the server
 * to continue running for local API testing during development.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget_tracker';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000 // Quick timeout to prevent server hang if Mongo is offline
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database Warning] MongoDB connection failed: ${error.message}`);
    console.warn(`[Database Warning] Server will continue running, but database-dependent operations will be unavailable until MongoDB is running at ${uri}`);
  }
};

module.exports = connectDB;
