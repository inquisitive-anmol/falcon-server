const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Get current user info
router.get('/me', protect, userController.getMe);

// Get user profile
router.get('/profile', protect, userController.getProfile);

// Update user profile
router.patch('/profile', protect, userController.updateProfile);

// Delete user account
router.delete('/delete', protect, userController.deleteUser);

// Get student dashboard data
router.get('/dashboard', protect, userController.getDashboard);

module.exports = router; 