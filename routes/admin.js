const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../utils/fileUpload');
const path = require('path');

// All routes below are protected and restricted to admin/manager
router.use(protect, restrictTo('admin', 'manager'));

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Course management
router.get('/courses', adminController.getAllCourses);
router.patch('/courses/:id/status', adminController.updateCourseStatus);
// Edit (update) any course by ID
router.patch('/courses/:id', adminController.updateCourse);
// Delete any course by ID
router.delete('/courses/:id', adminController.deleteCourse);

// Admin upload course (CourseUploadWizard compatible)
router.post('/courses/upload', adminController.uploadCourse);

// File upload endpoint (PDF, video, image)
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  }
  // Return the file URL (assuming static serving from /uploads)
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({
    status: 'success',
    message: 'File uploaded successfully',
    data: { url: fileUrl, filename: req.file.filename }
  });
});

// Delete a file from uploads directory
router.delete('/upload/:filename', adminController.deleteFile);

// Dashboard stats
router.get('/stats', protect, restrictTo('admin', 'manager'), adminController.getStats);

module.exports = router; 