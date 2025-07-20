const { catchAsync } = require('../utils/errorHandler');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { verifyToken, extractTokenFromHeader, hasRole, hasPermission } = require('../utils/auth');
const User = require('../models/User');

// Protect routes - require authentication
const protect = catchAsync(async (req, res, next) => {
  // 1) Get token from cookie or header
  let token = null;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = extractTokenFromHeader(authHeader);
    }
  }
  if (!token) {
    throw new AuthenticationError('No token provided');
  }

  // 2) Verify token
  const decoded = verifyToken(token);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id).select('+password');
  if (!currentUser) {
    throw new AuthenticationError('User no longer exists');
  }

  // 4) Check if user is active
  if (!currentUser.isActive) {
    throw new AuthenticationError('User account is deactivated');
  }

  // 5) Check if user changed password after token was issued
  if (currentUser.passwordChangedAt) {
    const changedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
    if (decoded.iat < changedTimestamp) {
      throw new AuthenticationError('User recently changed password! Please log in again');
    }
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('You must be logged in to access this resource');
    }

    if (!hasRole(req.user.role, roles)) {
      throw new AuthorizationError('You do not have permission to perform this action');
    }

    next();
  };
};

// Check specific permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('You must be logged in to access this resource');
    }

    if (!hasPermission(req.user.role, permission)) {
      throw new AuthorizationError('You do not have permission to perform this action');
    }

    next();
  };
};

// Optional authentication - doesn't throw error if no token
const optionalAuth = catchAsync(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = extractTokenFromHeader(authHeader);
    const decoded = verifyToken(token);
    
    const currentUser = await User.findById(decoded.id);
    if (currentUser && currentUser.isActive) {
      req.user = currentUser;
    }
  } catch (error) {
    // Silently ignore authentication errors for optional auth
  }
  
  next();
});

// Check if user is the owner of a resource
const isOwner = (resourceModel, resourceIdField = 'id') => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('You must be logged in to access this resource');
    }

    const resourceId = req.params[resourceIdField];
    const resource = await resourceModel.findById(resourceId);

    if (!resource) {
      throw new Error('Resource not found');
    }

    // Allow admins and managers to access any resource
    if (['admin', 'manager'].includes(req.user.role)) {
      return next();
    }

    // Check if user is the owner
    const ownerField = resource.owner || resource.user || resource.instructor;
    if (ownerField && ownerField.toString() !== req.user._id.toString()) {
      throw new AuthorizationError('You can only access your own resources');
    }

    next();
  });
};

// Check if user is enrolled in a course
const isEnrolled = catchAsync(async (req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError('You must be logged in to access this resource');
  }

  const courseId = req.params.courseId || req.params.id;
  const Course = require('../models/Course');
  const course = await Course.findById(courseId);

  if (!course) {
    throw new Error('Course not found');
  }

  // Allow admins, managers, and instructors to access
  if (['admin', 'manager'].includes(req.user.role) || 
      course.instructor.toString() === req.user._id.toString()) {
    return next();
  }

  // Check if user is enrolled
  const isEnrolled = course.enrolledStudents.some(
    enrollment => enrollment.student.toString() === req.user._id.toString()
  );

  if (!isEnrolled) {
    throw new AuthorizationError('You must be enrolled in this course to access this resource');
  }

  next();
});

// Rate limiting for authentication attempts
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    if (attempts.has(ip)) {
      attempts.set(ip, attempts.get(ip).filter(timestamp => timestamp > windowStart));
    }

    const currentAttempts = attempts.get(ip) || [];
    
    if (currentAttempts.length >= maxAttempts) {
      throw new AuthenticationError('Too many authentication attempts. Please try again later.');
    }

    // Add current attempt
    currentAttempts.push(now);
    attempts.set(ip, currentAttempts);

    next();
  };
};

module.exports = {
  protect,
  restrictTo,
  requirePermission,
  optionalAuth,
  isOwner,
  isEnrolled,
  authRateLimit
}; 