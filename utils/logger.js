const fs = require('fs');
const path = require('path');

// Simple logging utility for error tracking
class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: this.getTimestamp(),
      level,
      message,
      ...meta
    }) + '\n';
  }

  writeToFile(filename, content) {
    const filePath = path.join(this.logDir, filename);
    fs.appendFileSync(filePath, content);
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output
    console.log(formattedMessage);
    
    // File output
    const filename = `${level}.log`;
    this.writeToFile(filename, formattedMessage);
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      this.log('DEBUG', message, meta);
    }
  }

  // Log HTTP requests
  logRequest(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      };

      if (res.statusCode >= 400) {
        this.error(`HTTP ${res.statusCode}`, logData);
      } else {
        this.info(`HTTP ${res.statusCode}`, logData);
      }
    });

    next();
  }

  // Log errors with stack trace
  logError(error, req = null) {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
      isOperational: error.isOperational
    };

    if (req) {
      errorData.request = {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query
      };
    }

    this.error('Application Error', errorData);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger; 