const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./server');

class Database {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    try {
      if (this.isConnected) {
        logger.info('Database already connected');
        return this.connection;
      }

      logger.info('Connecting to MongoDB...', {
        uri: config.database.uri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
        options: config.database.options
      });

      this.connection = await mongoose.connect(config.database.uri, config.database.options);
      
      this.isConnected = true;
      
      logger.info('✅ MongoDB connected successfully', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        name: this.connection.connection.name
      });

      // Handle connection events
      this.connection.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', { error: err.message });
        this.isConnected = false;
      });

      this.connection.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      this.connection.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      return this.connection;

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        this.connection = null;
        logger.info('✅ MongoDB disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', {
        error: error.message
      });
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnected() {
    return this.isConnected;
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          status: 'disconnected',
          message: 'Database not connected'
        };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'connected',
        message: 'Database is healthy',
        details: {
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name,
          readyState: mongoose.connection.readyState
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Database health check failed',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database; 