const User = require('../models/User');
const Course = require('../models/Course');
const { AppError, NotFoundError, ValidationError } = require('../utils/errors');
const { catchAsync } = require('../utils/errorHandler');
const fs = require('fs');
const path = require('path');

// List all users
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select('-password');
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

// Get user by ID
exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new NotFoundError('User');
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// Update user (role, status, etc.)
exports.updateUser = catchAsync(async (req, res, next) => {
  const allowedFields = ['firstName', 'lastName', 'role', 'isActive', 'isEmailVerified', 'phone', 'avatar'];
  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
  if (!user) throw new NotFoundError('User');
  res.status(200).json({
    status: 'success',
    message: 'User updated',
    data: { user }
  });
});

// Delete user
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new NotFoundError('User');
  res.status(200).json({
    status: 'success',
    message: 'User deleted'
  });
});

// List all courses (with optional filters)
exports.getAllCourses = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.instructor) filter.instructor = req.query.instructor;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.isPublished !== undefined) filter.isPublished = req.query.isPublished === 'true';
  const courses = await Course.find(filter).populate('instructor', 'firstName lastName email');
  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: { courses }
  });
});

// Approve/publish/unpublish a course
exports.updateCourseStatus = catchAsync(async (req, res, next) => {
  const { isPublished, isFeatured } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) throw new NotFoundError('Course');
  if (isPublished !== undefined) course.isPublished = isPublished;
  if (isFeatured !== undefined) course.isFeatured = isFeatured;
  await course.save();
  res.status(200).json({
    status: 'success',
    message: 'Course status updated',
    data: { course }
  });
});

// Delete any course
exports.deleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) throw new NotFoundError('Course');
  res.status(200).json({
    status: 'success',
    message: 'Course deleted'
  });
});

// Admin: Update any course by ID
exports.updateCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new NotFoundError('Course');
  Object.assign(course, req.body);
  await course.save();
  res.status(200).json({
    status: 'success',
    message: 'Course updated successfully',
    data: { course }
  });
});

// Admin: Upload a new course (CourseUploadWizard compatible)
exports.uploadCourse = catchAsync(async (req, res, next) => {
  /*
    Expects CourseFormData structure:
    - title, description, instructor (name or email), category, level, duration, tags, price, thumbnail (file or url), modules[]
    - modules[].chapters[].content[] (type, title, file/url, duration, description)
  */
  const data = req.body;
  // Validate required fields
  if (!data.title || !data.description || !data.instructor || !data.category || !data.level || !data.duration || !data.modules) {
    throw new ValidationError('Missing required fields', []);
  }

  // Prepare course document
  const courseDoc = {
    title: data.title,
    description: data.description,
    shortDescription: data.shortDescription || '',
    instructor: data.instructor, // now a string (name or email)
    category: data.category,
    level: data.level.toLowerCase(),
    duration: Number(data.duration),
    tags: data.tags || [],
    price: data.price || 0,
    thumbnail: data.thumbnailUrl || data.thumbnail || null,
    modules: (data.modules || []).map((mod, modIdx) => ({
      title: mod.title,
      description: mod.description,
      content: undefined, // not used at module level
      chapters: (mod.chapters || []).map((ch, chIdx) => ({
        title: ch.title,
        description: ch.description,
        content: (ch.content || []).map((c, cIdx) => ({
          type: c.type,
          title: c.title,
          url: c.url || '',
          duration: c.duration,
          description: c.description,
        })),
      })),
    })),
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save course
  const course = await Course.create(courseDoc);
  res.status(201).json({
    status: 'success',
    message: 'Course uploaded successfully',
    data: { course }
  });
});

// Admin: Delete a file from uploads directory
exports.deleteFile = catchAsync(async (req, res, next) => {
  const { filename } = req.params;
  if (!filename) {
    return res.status(400).json({ status: 'error', message: 'Filename is required' });
  }
  const filePath = path.join(__dirname, '../uploads', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ status: 'error', message: 'File not found' });
  }
  fs.unlinkSync(filePath);
  res.status(200).json({ status: 'success', message: 'File deleted successfully' });
});

// Admin dashboard stats
exports.getStats = catchAsync(async (req, res, next) => {
  const userCount = await User.countDocuments();
  const courseCount = await Course.countDocuments();
  const enrolledCount = await Course.aggregate([
    { $unwind: '$enrolledStudents' },
    { $count: 'total' }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      userCount,
      courseCount,
      enrolledCount: enrolledCount[0] ? enrolledCount[0].total : 0
    }
  });
}); 