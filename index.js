require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require('path');
const cookieParser = require('cookie-parser');

// Import configuration
const config = require('./config/server');

// Import error handling utilities
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');
const logger = require('./utils/logger');

// Import database
const database = require('./config/database');

// Import routes
const indexRoute = require('./routes/index');

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-ancestors": ["'self'", "http://localhost:5173"],
      },
    },
  })
);

// CORS configuration
app.use(cors(config.security.cors));

// Cookie parser middleware
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit(config.security.rateLimit);
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json(config.security.bodyParser.json));
app.use(express.urlencoded(config.security.bodyParser.urlencoded));

// Request logging middleware
app.use(logger.logRequest.bind(logger));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();

    const healthStatus = {
      status: 'success',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: config.server.environment,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
      services: {
        server: 'healthy',
        database: dbHealth.status === 'connected' ? 'healthy' : 'unhealthy'
      }
    };

    // Determine overall health status
    const isHealthy = dbHealth.status === 'connected' || !config.database.uri;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', { error: error.message });
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api', indexRoute);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler for undefined routes (must be before global error handler)
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Export the configured app
module.exports = app;
