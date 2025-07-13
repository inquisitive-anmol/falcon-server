const { AppError } = require('./errors');

// Error handling utilities
const errorHandler = {
  // Send error response in development
  sendErrorDev: (err, req, res) => {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  },

  // Send error response in production
  sendErrorProd: (err, req, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  },

  // Handle specific error types
  handleCastErrorDB: (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
  },

  handleDuplicateFieldsDB: (err) => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
  },

  handleValidationErrorDB: (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
  },

  handleJWTError: () => new AppError('Invalid token. Please log in again!', 401),

  handleJWTExpiredError: () => new AppError('Your token has expired! Please log in again.', 401),

  handleMulterError: (err) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new AppError('File too large. Please upload a smaller file.', 400);
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return new AppError('Unexpected file field.', 400);
    }
    return new AppError('File upload error.', 400);
  }
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return errorHandler.sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Handle specific MongoDB errors
    if (error.name === 'CastError') error = errorHandler.handleCastErrorDB(error);
    if (error.code === 11000) error = errorHandler.handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = errorHandler.handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = errorHandler.handleJWTError();
    if (error.name === 'TokenExpiredError') error = errorHandler.handleJWTExpiredError();
    if (error.name === 'MulterError') error = errorHandler.handleMulterError(error);

    return errorHandler.sendErrorProd(error, req, res);
  }
};

// Async error wrapper to catch async errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  globalErrorHandler,
  catchAsync,
  notFoundHandler,
  errorHandler
}; 