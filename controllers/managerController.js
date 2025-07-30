const User = require('../models/User');
const Course = require('../models/Course');
const Job = require('../models/Job');

// Helper: get team members (all users with role 'manager' or 'employee')
async function getTeamMembers() {
  const members = await User.find({ role: { $in: ['manager', 'employee', 'developer', 'designer'] } })
    .select('firstName lastName role isActive lastLogin')
    .lean();
  return members.map(m => ({
    name: `${m.firstName} ${m.lastName}`,
    role: m.role,
    status: m.isActive ? 'Active' : 'Inactive',
    performance: 'Good',
    lastActive: m.lastLogin ? m.lastLogin.toLocaleString() : 'Unknown',
  }));
}

// Helper: get stats
async function getStats() {
  const teamCount = await User.countDocuments({ role: { $in: ['manager', 'employee', 'developer', 'designer'] } });
  const openPositions = await Job.countDocuments({ status: 'open' });
  const applications = 89; // Placeholder, replace with real application count if you have an Application model
  const interviewsToday = 3; // Placeholder, replace with real interview schedule if you have an Application/Interview model
  return [
    { title: 'Team Members', value: teamCount, change: '+2 this month' },
    { title: 'Open Positions', value: openPositions, change: '+1 this week' },
    { title: 'Applications', value: applications, change: '+23 this week' },
    { title: 'Interviews Today', value: interviewsToday, change: 'Scheduled' },
  ];
}

// Helper: get recent activities (mock for now)
async function getRecentActivities() {
  return [
    { action: 'New application received', candidate: 'John Doe', position: 'Frontend Developer', time: '10 minutes ago' },
    { action: 'Interview completed', candidate: 'Jane Smith', position: 'UI Designer', time: '2 hours ago' },
    { action: 'Offer sent', candidate: 'Mike Johnson', position: 'Backend Developer', time: '1 day ago' },
    { action: 'Team member promoted', candidate: 'Alice Johnson', position: 'Senior Developer', time: '2 days ago' },
  ];
}

exports.getDashboardData = async (req, res) => {
  try {
    const [stats, teamMembers, recentActivities] = await Promise.all([
      getStats(),
      getTeamMembers(),
      getRecentActivities(),
    ]);
    res.json({ stats, teamMembers, recentActivities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: err.message });
  }
};

// CRUD for jobs
exports.createJob = async (req, res) => {
  try {
    const managerId = req.user && req.user._id ? req.user._id : null;
    if (!managerId) {
      return res.status(401).json({ error: 'Unauthorized: No manager user found' });
    }
    const {
      title,
      company,
      description,
      department,
      location,
      employmentType,
      requirements,
      responsibilities,
      salaryRange
    } = req.body;
    if (!title || !company || !description || !employmentType) {
      return res.status(400).json({ error: 'Title, company, description, and employment type are required' });
    }
    const job = new Job({
      title,
      company,
      description,
      department,
      location,
      employmentType,
      requirements,
      responsibilities,
      salaryRange,
      postedBy: managerId
    });
    await job.save();
    res.status(201).json({ job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job', details: err.message });
  }
};

exports.listJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate('postedBy', 'firstName lastName email role');
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs', details: err.message });
  }
};

exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'firstName lastName email role');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job', details: err.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (req.user.role !== 'admin' && (!job.postedBy || job.postedBy.toString() !== req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized to update this job' });
    }
    const allowedFields = [
      'title', 'company', 'description', 'department', 'location', 'employmentType', 'requirements', 'responsibilities', 'salaryRange', 'status', 'isActive'
    ];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) job[field] = req.body[field];
    });
    job.updatedAt = new Date();
    await job.save();
    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job', details: err.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (req.user.role !== 'admin' && (!job.postedBy || job.postedBy.toString() !== req.user._id.toString())) {
      return res.status(403).json({ error: 'Not authorized to delete this job' });
    }
    await job.deleteOne();
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job', details: err.message });
  }
}; 