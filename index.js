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
const managerRoutes = require('./routes/manager');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');

const app = express();

// Trust proxy for rate limiting behind reverse proxies (Railway, Heroku, etc.)
// In production, trust the first proxy (Railway, Heroku, etc.)
// In development, don't trust any proxies
if (config.server.isProduction) {
  app.set('trust proxy', 1);
} else {
  app.set('trust proxy', false);
}

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-ancestors": ["'self'", config.client.url],
      },
    },
  })
);

// CORS configuration
app.use(cors(config.security.cors));

// Debug middleware for CORS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    logger.info('CORS preflight request', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      headers: req.headers
    });
  }
  next();
});

// Log proxy information for debugging
if (config.server.isProduction) {
  app.use((req, res, next) => {
    logger.info('Request details', {
      ip: req.ip,
      forwardedFor: req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      path: req.path
    });
    next();
  });
}

// Cookie parser middleware
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  ...config.security.rateLimit,
  // Use X-Forwarded-For header when behind a proxy
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy for accurate IP detection
  skip: (req) => {
    // Skip rate limiting for health checks and CORS preflight
    return req.path === '/health' || req.method === 'OPTIONS';
  },
  // Key generator that works with proxies
  keyGenerator: (req) => {
    // Use X-Forwarded-For if available, otherwise use IP
    const key = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    logger.debug('Rate limit key generated', { key, path: req.path });
    return key;
  },
  // Handle rate limit errors gracefully
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      forwardedFor: req.headers['x-forwarded-for'],
      path: req.path
    });
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later.'
    });
  }
});
// Apply rate limiting with error handling
try {
  app.use('/api/', limiter);
} catch (error) {
  logger.error('Rate limiter failed to initialize', { error: error.message });
  // Continue without rate limiting if it fails
}

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
      },
      // Add proxy information for debugging
      proxy: {
        trusted: app.get('trust proxy'),
        ip: req.ip,
        forwardedFor: req.headers['x-forwarded-for']
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
app.use('/api/manager', managerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test endpoint for rate limiter (remove in production)
if (config.server.isDevelopment) {
  app.get('/api/test-rate-limit', (req, res) => {
    res.json({
      message: 'Rate limit test endpoint',
      ip: req.ip,
      forwardedFor: req.headers['x-forwarded-for'],
      timestamp: new Date().toISOString()
    });
  });
}

// 404 handler for undefined routes (must be before global error handler)
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Export the configured app
module.exports = app;