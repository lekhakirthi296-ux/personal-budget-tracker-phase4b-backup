const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables (from root directory or server directory)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to current dir if root not found

const { connectDB } = require('./config/db');
const apiRoutes = require('./routes');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.SERVER_PORT || (isProduction ? (process.env.PORT || 3000) : 5000);

// Security & Utility Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve frontend static build files if available
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// API Routes
app.use('/api', apiRoutes);

// Root Index / SPA Routing Fallback
app.get('*', (req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(clientDistPath, 'index.html');
    return res.sendFile(indexPath, (err) => {
      if (err) {
        return res.json({
          success: true,
          message: 'Personal Budget Tracker API Server',
          version: '1.0.0',
          healthCheck: '/api/health'
        });
      }
    });
  }
  next();
});

// Centralized Error & 404 Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
const startServer = async () => {
  // Connect to Database
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[Server] Personal Budget Tracker API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`[Server] Health check available at: http://localhost:${PORT}/api/health`);
  });
};

// Auto-start when run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
