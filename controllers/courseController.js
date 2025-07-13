const Course = require('../models/Course');
const User = require('../models/User');
const { AppError, ValidationError, NotFoundError, AuthorizationError } = require('../utils/errors');
const { catchAsync } = require('../utils/errorHandler');

// Create a new course (admin/manager/instructor only)
exports.createCourse = catchAsync(async (req, res, next) => {
  const {
    title, description, shortDescription, category, level, duration, price, discount, thumbnail, videoUrl,
    materials, modules, tags, isPublished, isFeatured, language, certificate, requirements, learningOutcomes,
    maxStudents, startDate, endDate
  } = req.body;

  if (!title || !description || !category || !level || !duration || !price) {
    throw new ValidationError('Missing required fields', []);
  }

  const course = await Course.create({
    title,
    description,
    shortDescription,
    category,
    level,
    duration,
    price,
    discount,
    thumbnail,
    videoUrl,
    materials,
    modules,
    tags,
    isPublished,
    isFeatured,
    language,
    certificate,
    requirements,
    learningOutcomes,
    maxStudents,
    startDate,
    endDate,
    instructor: req.user._id
  });

  res.status(201).json({
    status: 'success',
    message: 'Course created successfully',
    data: { course }
  });
});

// Get all courses (public)
exports.getAllCourses = catchAsync(async (req, res, next) => {
  const courses = await Course.find().populate('instructor', 'firstName lastName avatar');
  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: { courses }
  });
});

// Get a course by ID (public)
exports.getCourseById = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id).populate('instructor', 'firstName lastName avatar');
  if (!course) throw new NotFoundError('Course');
  res.status(200).json({
    status: 'success',
    data: { course }
  });
});

// Update a course (admin/manager/instructor only, must be owner or admin/manager)
exports.updateCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new NotFoundError('Course');

  // Only owner, admin, or manager can update
  if (
    course.instructor.toString() !== req.user._id.toString() &&
    !['admin', 'manager'].includes(req.user.role)
  ) {
    throw new AuthorizationError('You do not have permission to update this course');
  }

  Object.assign(course, req.body);
  await course.save();
  res.status(200).json({
    status: 'success',
    message: 'Course updated successfully',
    data: { course }
  });
});

// Delete a course (admin/manager/instructor only, must be owner or admin/manager)
exports.deleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new NotFoundError('Course');

  if (
    course.instructor.toString() !== req.user._id.toString() &&
    !['admin', 'manager'].includes(req.user.role)
  ) {
    throw new AuthorizationError('You do not have permission to delete this course');
  }

  await course.deleteOne();
  res.status(200).json({
    status: 'success',
    message: 'Course deleted successfully'
  });
});

// Enroll a student in a course
exports.enrollInCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new NotFoundError('Course');

  // Only students/jobseekers can enroll
  if (!['student', 'jobseeker'].includes(req.user.role)) {
    throw new AuthorizationError('Only students or jobseekers can enroll');
  }

  // Check if already enrolled
  const alreadyEnrolled = course.enrolledStudents.some(
    enrollment => enrollment.student.toString() === req.user._id.toString()
  );
  if (alreadyEnrolled) {
    throw new AppError('You are already enrolled in this course', 400);
  }

  // Check if course is full
  if (course.isEnrollmentFull) {
    throw new AppError('Course enrollment is full', 400);
  }

  course.enrolledStudents.push({ student: req.user._id });
  await course.save();

  res.status(200).json({
    status: 'success',
    message: 'Enrolled in course successfully',
    data: { courseId: course._id }
  });
});

// Unenroll from a course
exports.unenrollFromCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new NotFoundError('Course');

  const index = course.enrolledStudents.findIndex(
    enrollment => enrollment.student.toString() === req.user._id.toString()
  );
  if (index === -1) {
    throw new AppError('You are not enrolled in this course', 400);
  }

  course.enrolledStudents.splice(index, 1);
  await course.save();

  res.status(200).json({
    status: 'success',
    message: 'Unenrolled from course successfully',
    data: { courseId: course._id }
  });
});

// Get all courses a user is enrolled in
exports.getMyEnrolledCourses = catchAsync(async (req, res, next) => {
  const courses = await Course.find({
    'enrolledStudents.student': req.user._id
  }).populate('instructor', 'firstName lastName avatar');
  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: { courses }
  });
});

// Update progress in a course
exports.updateProgress = catchAsync(async (req, res, next) => {
  const { moduleId, progress } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) throw new NotFoundError('Course');

  const enrollment = course.enrolledStudents.find(
    enrollment => enrollment.student.toString() === req.user._id.toString()
  );
  if (!enrollment) {
    throw new AppError('You are not enrolled in this course', 400);
  }

  enrollment.progress = progress;
  enrollment.lastAccessed = new Date();
  if (moduleId && !enrollment.completedModules.includes(moduleId)) {
    enrollment.completedModules.push(moduleId);
  }
  await course.save();

  res.status(200).json({
    status: 'success',
    message: 'Progress updated',
    data: { courseId: course._id, progress: enrollment.progress }
  });
});

// Get featured courses (public)
exports.getFeaturedCourses = catchAsync(async (req, res, next) => {
  const courses = await Course.getFeatured();
  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: { courses }
  });
});

// Get courses by category (public)
exports.getCoursesByCategory = catchAsync(async (req, res, next) => {
  const { category } = req.params;
  const courses = await Course.getByCategory(category);
  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: { courses }
  });
}); 