const app = require('./index');
const logger = require('./utils/logger');
const config = require('./config/server');
const database = require('./config/database');

// Initialize server
const initializeServer = async () => {
  try {
    // Connect to database
    if (config.database.uri) {
      await database.connect();
    }

    // Create HTTP server
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`🚀 Server is running on http://${config.server.host}:${config.server.port}`, {
        environment: config.server.environment,
        port: config.server.port,
        host: config.server.host,
        database: database.isConnected ? 'connected' : 'not configured',
        timestamp: new Date().toISOString()
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`📡 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async (err) => {
        if (err) {
          logger.error('Error during server shutdown:', { error: err.message });
          process.exit(1);
        }
        
        // Disconnect database
        try {
          await database.disconnect();
        } catch (dbError) {
          logger.error('Error disconnecting database:', { error: dbError.message });
        }
        
        logger.info('✅ Server closed successfully');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', async (err) => {
      logger.error('💥 UNCAUGHT EXCEPTION! Shutting down...', {
        error: err.message,
        stack: err.stack
      });
      
      server.close(async () => {
        try {
          await database.disconnect();
        } catch (dbError) {
          logger.error('Error disconnecting database during exception:', { error: dbError.message });
        }
        
        logger.info('✅ Server closed due to uncaught exception');
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (err) => {
      logger.error('💥 UNHANDLED REJECTION! Shutting down...', {
        error: err.message,
        stack: err.stack
      });
      
      server.close(async () => {
        try {
          await database.disconnect();
        } catch (dbError) {
          logger.error('Error disconnecting database during rejection:', { error: dbError.message });
        }
        
        logger.info('✅ Server closed due to unhandled rejection');
        process.exit(1);
      });
    });

    return server;

  } catch (error) {
    logger.error('Failed to initialize server:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Start the server
const server = initializeServer();

// Export server for testing purposes
module.exports = server; 