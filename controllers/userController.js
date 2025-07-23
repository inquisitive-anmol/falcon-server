const User = require('../models/User');
const { AuthenticationError, ValidationError } = require('../utils/errors');
const { catchAsync } = require('../utils/errorHandler');

// Get current user (for /me)
exports.getMe = catchAsync(async (req, res, next) => {
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

// Get user profile (for /profile)
exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AuthenticationError('User not found');
  }
  res.status(200).json({
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
  });
});

// Update user profile
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
    message: 'Profile updated successfully',
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
  });
});

// Delete user account
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.user._id);
  if (!user) {
    throw new AuthenticationError('User not found');
  }
  res.status(200).json({ message: 'User deleted successfully' });
});

// Get student dashboard data
exports.getDashboard = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: 'enrolledCourses.course',
      select: 'title instructor'
    })
    .populate({
      path: 'certificates.course',
      select: 'title'
    });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Stats
  const coursesEnrolled = user.enrolledCourses.length;
  const completed = user.enrolledCourses.filter(ec => ec.progress === 100).length;
  const hoursStudied = user.enrolledCourses.reduce((sum, ec) => sum + (ec.progress / 100 * ((ec.course && ec.course.duration) || 0)), 0);
  const certificatesCount = user.certificates.length;

  // Current courses
  const currentCourses = user.enrolledCourses.map(ec => ({
    title: ec.course?.title || 'Unknown',
    progress: ec.progress,
    instructor: ec.course?.instructor || 'Unknown',
    nextLesson: ec.nextLesson || 'Next Lesson'
  }));

  // Mock assignments (replace with real assignments if available)
  const upcomingAssignments = [
    { title: 'React Project Submission', course: 'Full Stack Development', dueDate: 'Tomorrow', priority: 'high' },
    { title: 'Data Analysis Report', course: 'Python Data Science', dueDate: '3 days', priority: 'medium' },
    { title: 'Marketing Campaign Design', course: 'Digital Marketing', dueDate: '1 week', priority: 'low' },
  ];

  // Certificates
  const certificates = user.certificates.map(cert => ({
    id: cert._id,
    title: cert.course?.title || 'Certificate',
    issued: cert.issued,
    fileUrl: cert.fileUrl
  }));

  res.json({
    stats: {
      coursesEnrolled,
      completed,
      hoursStudied,
      certificates: certificatesCount
    },
    currentCourses,
    upcomingAssignments,
    certificates
  });
}); 