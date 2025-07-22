const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect, restrictTo, isEnrolled } = require('../middleware/auth');
const upload = require('../utils/fileUpload');

// Public routes
router.get('/', courseController.getAllCourses);
router.get('/featured', courseController.getFeaturedCourses);
router.get('/category/:category', courseController.getCoursesByCategory);
router.get('/:id', courseController.getCourseById);

// Protected routes (must be logged in)
router.post('/', protect, restrictTo('admin', 'manager', 'instructor'), courseController.createCourse);
router.patch('/:id', protect, restrictTo('admin', 'manager', 'instructor'), courseController.updateCourse);
router.delete('/:id', protect, restrictTo('admin', 'manager', 'instructor'), courseController.deleteCourse);

// Enrollment
router.post('/:id/enroll', protect, restrictTo('student', 'jobseeker'), courseController.enrollInCourse);
router.post('/:id/unenroll', protect, restrictTo('student', 'jobseeker'), courseController.unenrollFromCourse);
router.get('/my/enrolled', protect, restrictTo('student', 'jobseeker'), courseController.getMyEnrolledCourses);

// Progress update (must be enrolled)
router.patch('/:id/progress', protect, restrictTo('student', 'jobseeker'), isEnrolled, courseController.updateProgress);

// File upload for course content
router.post('/:id/upload', protect, restrictTo('admin', 'manager', 'instructor'), upload.single('file'), courseController.uploadCourseFile);

module.exports = router; 