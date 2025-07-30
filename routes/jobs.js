const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// Public endpoint to get all active jobs for job seekers
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find({ 
      status: 'open', 
      isActive: true 
    }).populate('postedBy', 'firstName lastName email role');
    
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs', details: err.message });
  }
});

// Public endpoint to get a single job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'firstName lastName email role');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job', details: err.message });
  }
});

module.exports = router; 