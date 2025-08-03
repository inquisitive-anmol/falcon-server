const User = require('../models/User');
const { AppError, ValidationError, AuthenticationError } = require('../utils/errors');
const { catchAsync } = require('../utils/errorHandler');
const {
  generateToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyEmailToken,
  verifyPasswordResetToken,
  hashToken
} = require('../utils/auth');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const emailUtil = require('../utils/email');
const config = require('../config/server');

// Register a new user
exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password) {
    throw new ValidationError('All fields are required', [
      { field: 'firstName', message: 'First name is required' },
      { field: 'lastName', message: 'Last name is required' },
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is required' }
    ]);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ValidationError('Email already in use', [
      { field: 'email', message: 'Email already in use' }
    ]);
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role
  });

  // Generate email verification token
  const { token, hashedToken, expires } = generateEmailVerificationToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = expires;
  await user.save();

  // Send verification email
  await emailUtil.sendVerificationEmail({
    to: user.email,
    token,
    firstName: user.firstName
  });

  // Send welcome email
  await emailUtil.sendWelcomeEmail({
    to: user.email,
    firstName: user.firstName
  });

  logger.info('Email verification token generated', { email, token });

  // Generate tokens
  const authToken = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Set cookies
  res.cookie('token', authToken, {
    httpOnly: true,
    secure: config.server.isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.server.isProduction,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully. Please verify your email.',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      emailVerificationToken: token // For dev/testing only
    }
  });
});

// Login user
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ValidationError('Email and password are required', [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is required' }
    ]);
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new AuthenticationError('Incorrect email or password');
  }

  if (!user.isActive) {
    throw new AuthenticationError('User account is deactivated');
  }

  // Optionally check if email is verified
  // if (!user.isEmailVerified) {
  //   throw new AuthenticationError('Please verify your email before logging in');
  // }

  // Generate tokens
  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.lastLogin = new Date();
  await user.save();

  // Set cookies
  res.cookie('token', token, {
    httpOnly: true,
    // secure: config.server.isProduction,
    secure: false,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    // secure: config.server.isProduction,
    secure: false,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  });
});

// Logout user
exports.logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: config.server.isProduction, sameSite: 'strict' });
  res.clearCookie('refreshToken', { httpOnly: true, secure: config.server.isProduction, sameSite: 'strict' });
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

// Email verification
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { email, token } = req.body;
  if (!email || !token) {
    throw new ValidationError('Email and token are required', [
      { field: 'email', message: 'Email is required' },
      { field: 'token', message: 'Token is required' }
    ]);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AuthenticationError('Invalid email or token');
  }

  if (!user.emailVerificationToken || !user.emailVerificationExpires) {
    throw new AuthenticationError('No verification token found');
  }

  if (user.emailVerificationExpires < Date.now()) {
    throw new AuthenticationError('Verification token has expired');
  }

  if (!verifyEmailToken(token, user.emailVerificationToken)) {
    throw new AuthenticationError('Invalid verification token');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully'
  });
});

// Request password reset
exports.requestPasswordReset = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    throw new ValidationError('Email is required', [
      { field: 'email', message: 'Email is required' }
    ]);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AuthenticationError('No user found with that email');
  }

  // Generate password reset token
  const { token, hashedToken, expires } = generatePasswordResetToken();
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expires;
  await user.save();

  // Send password reset email
  await emailUtil.sendPasswordResetEmail({
    to: user.email,
    token,
    firstName: user.firstName
  });

  logger.info('Password reset token generated', { email, token });

  res.status(200).json({
    status: 'success',
    message: 'Password reset token sent to email',
    data: {
      email,
      passwordResetToken: token // For dev/testing only
    }
  });
});

// Reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    throw new ValidationError('All fields are required', [
      { field: 'email', message: 'Email is required' },
      { field: 'token', message: 'Token is required' },
      { field: 'newPassword', message: 'New password is required' }
    ]);
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AuthenticationError('Invalid email or token');
  }

  if (!user.passwordResetToken || !user.passwordResetExpires) {
    throw new AuthenticationError('No password reset token found');
  }

  if (user.passwordResetExpires < Date.now()) {
    throw new AuthenticationError('Password reset token has expired');
  }

  const { isValid } = verifyPasswordResetToken(token, user.passwordResetToken, user.passwordResetExpires);
  if (!isValid) {
    throw new AuthenticationError('Invalid password reset token');
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful'
  });
});

// Get current user from cookie
exports.me = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  res.status(200).json({
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      isEmailVerified: req.user.isEmailVerified,
      avatar: req.user.avatar
    }
  });
});

// Update current user profile
exports.updateProfile = catchAsync(async (req, res, next) => {
  const updates = {};
  const allowedFields = ['firstName', 'lastName', 'phone', 'avatar'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  if (!user) {
    throw new AuthenticationError('User not found');
  }
  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar
      }
    }
  });
}); 