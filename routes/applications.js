const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth.protect);

// Apply for a job
router.post('/jobs/:jobId/apply', applicationController.applyForJob);

// Get user's applications
router.get('/my-applications', applicationController.getUserApplications);

// Check if user has applied for a specific job
router.get('/jobs/:jobId/status', applicationController.checkApplicationStatus);

// Withdraw application
router.delete('/jobs/:jobId/withdraw', applicationController.withdrawApplication);

module.exports = router; 