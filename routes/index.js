const express = require('express');
const router = express.Router();
const { catchAsync } = require('../utils/errorHandler');
const { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  AuthenticationError 
} = require('../utils/errors');

// Import auth routes
const authRoutes = require('./auth');
router.use('/auth', authRoutes);

// Import course routes
const courseRoutes = require('./course');
router.use('/courses', courseRoutes);

// Import admin routes
const adminRoutes = require('./admin');
router.use('/admin', adminRoutes);

// Import user routes
const userRoutes = require('./user');
router.use('/user', userRoutes);

// Example route that demonstrates error handling
router.get('/test', catchAsync(async (req, res, next) => {
  // Simulate a successful response
  res.status(200).json({
    status: 'success',
    message: 'Test route working correctly'
  });
}));

// Example route that throws a custom error
router.get('/error-example', catchAsync(async (req, res, next) => {
  // This will be caught by the global error handler
  throw new AppError('This is a test error', 400);
}));

// Example route that throws a validation error
router.post('/validation-example', catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new ValidationError('Email and password are required', [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is required' }
    ]);
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Validation passed'
  });
}));

// Example route that simulates a not found error
router.get('/not-found/:id', catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Simulate resource not found
  if (id === '999') {
    throw new NotFoundError('User');
  }
  
  res.status(200).json({
    status: 'success',
    data: { id, message: 'Resource found' }
  });
}));

// Example route that simulates authentication error
router.get('/protected', catchAsync(async (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    throw new AuthenticationError('No token provided');
  }
  
  // Simulate invalid token
  if (token === 'invalid-token') {
    throw new AuthenticationError('Invalid token');
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Access granted'
  });
}));

// Example route that demonstrates async error handling
router.get('/async-error', catchAsync(async (req, res, next) => {
  // Simulate an async operation that fails
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Async operation failed'));
    }, 100);
  });
  
  res.status(200).json({
    status: 'success',
    message: 'This should not be reached'
  });
}));

module.exports = router; 