const Application = require('../models/Application');
const Job = require('../models/Job');

// Apply for a job
exports.applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const applicantId = req.user._id;
    const { coverLetter, resume } = req.body;

    // Check if job exists and is active
    const job = await Job.findOne({ _id: jobId, status: 'open', isActive: true });
    if (!job) {
      return res.status(404).json({ error: 'Job not found or not available' });
    }

    // Check if user has already applied for this job
    const existingApplication = await Application.findOne({ job: jobId, applicant: applicantId });
    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    // Create new application
    const application = new Application({
      job: jobId,
      applicant: applicantId,
      coverLetter,
      resume
    });

    await application.save();

    res.status(201).json({ 
      message: 'Application submitted successfully',
      application 
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }
    res.status(500).json({ error: 'Failed to submit application', details: err.message });
  }
};

// Get user's applications
exports.getUserApplications = async (req, res) => {
  try {
    const applicantId = req.user._id;
    
    const applications = await Application.find({ applicant: applicantId })
      .populate('job', 'title company location employmentType salaryRange')
      .sort({ appliedAt: -1 });

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications', details: err.message });
  }
};

// Check if user has applied for a specific job
exports.checkApplicationStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const applicantId = req.user._id;

    const application = await Application.findOne({ job: jobId, applicant: applicantId });
    
    res.json({ 
      hasApplied: !!application,
      application: application || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check application status', details: err.message });
  }
};

// Withdraw application
exports.withdrawApplication = async (req, res) => {
  try {
    const { jobId } = req.params;
    const applicantId = req.user._id;

    const application = await Application.findOneAndDelete({ 
      job: jobId, 
      applicant: applicantId 
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application withdrawn successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to withdraw application', details: err.message });
  }
}; 