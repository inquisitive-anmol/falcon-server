const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/server');
const { AuthenticationError } = require('./errors');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { 
      id: userId, 
      role,
      iat: Date.now() 
    },
    config.jwt.secret,
    { 
      expiresIn: config.jwt.expiresIn 
    }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      id: userId,
      type: 'refresh',
      iat: Date.now() 
    },
    config.jwt.secret,
    { 
      expiresIn: config.jwt.refreshExpiresIn 
    }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Token verification failed');
  }
};

// Generate random token for email verification and password reset
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash token for storage
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate email verification token
const generateEmailVerificationToken = () => {
  const token = generateRandomToken();
  const hashedToken = hashToken(token);
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return {
    token,
    hashedToken,
    expires: new Date(expires)
  };
};

// Generate password reset token
const generatePasswordResetToken = () => {
  const token = generateRandomToken();
  const hashedToken = hashToken(token);
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return {
    token,
    hashedToken,
    expires: new Date(expires)
  };
};

// Verify email verification token
const verifyEmailToken = (token, hashedToken) => {
  const hashedInputToken = hashToken(token);
  return hashedInputToken === hashedToken;
};

// Verify password reset token
const verifyPasswordResetToken = (token, hashedToken, expires) => {
  const hashedInputToken = hashToken(token);
  const isValid = hashedInputToken === hashedToken;
  const isExpired = Date.now() > expires;
  
  return { isValid, isExpired };
};

// Extract token from authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('No token provided');
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

// Check if user has required role
const hasRole = (userRole, requiredRoles) => {
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(userRole);
  }
  return userRole === requiredRoles;
};

// Check if user has required permission
const hasPermission = (userRole, requiredPermission) => {
  const permissions = {
    admin: ['read', 'write', 'delete', 'manage_users', 'manage_courses', 'manage_content'],
    manager: ['read', 'write', 'manage_courses', 'manage_content'],
    instructor: ['read', 'write', 'manage_own_courses'],
    student: ['read'],
    jobseeker: ['read']
  };
  
  const userPermissions = permissions[userRole] || [];
  return userPermissions.includes(requiredPermission);
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  generateRandomToken,
  hashToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyEmailToken,
  verifyPasswordResetToken,
  extractTokenFromHeader,
  hasRole,
  hasPermission
}; 