const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const auth = require('../middleware/auth');

// GET /api/manager/dashboard
router.get('/dashboard', managerController.getDashboardData);

// Job CRUD APIs (all protected and restricted to admin/manager)
router.post('/jobs', auth.protect, auth.restrictTo('admin', 'manager'), managerController.createJob);
router.get('/jobs', auth.protect, auth.restrictTo('admin', 'manager'), managerController.listJobs);
router.get('/jobs/:id', auth.protect, auth.restrictTo('admin', 'manager'), managerController.getJob);
router.patch('/jobs/:id', auth.protect, auth.restrictTo('admin', 'manager'), managerController.updateJob);
router.delete('/jobs/:id', auth.protect, auth.restrictTo('admin', 'manager'), managerController.deleteJob);

module.exports = router; 