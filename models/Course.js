const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Course title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true,
    maxlength: [1000, 'Course description cannot exceed 1000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Course category is required'],
    enum: ['programming', 'design', 'business', 'marketing', 'data-science', 'cybersecurity', 'other']
  },
  level: {
    type: String,
    required: [true, 'Course level is required'],
    enum: ['beginner', 'intermediate', 'advanced']
  },
  duration: {
    type: Number, // in hours
    required: [true, 'Course duration is required'],
    min: [1, 'Duration must be at least 1 hour']
  },
  price: {
    type: Number,
    required: [true, 'Course price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  instructor: {
    type: String, // Accepts name or email
    required: [true, 'Instructor is required']
  },
  thumbnail: {
    type: String,
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  materials: [{
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'document'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    description: String
  }],
  modules: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    duration: Number, // in minutes
    order: Number,
    chapters: [{
      title: { type: String, required: true },
      description: String,
      order: Number,
      isCompleted: { type: Boolean, default: false },
      content: [{
        id: { type: String },
        title: String,
        type: { type: String, enum: ['video', 'pdf', 'zoom_link'], required: true },
        url: String,
        duration: String,
        fileSize: String,
        description: String,
        order: Number
      }]
    }]
  }],
  tags: [{
    type: String,
    trim: true
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0
    }
  },
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100%']
    },
    completedModules: [{
      type: mongoose.Schema.Types.ObjectId
    }],
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    default: 'English'
  },
  certificate: {
    type: Boolean,
    default: true
  },
  requirements: [{
    type: String,
    trim: true
  }],
  learningOutcomes: [{
    type: String,
    trim: true
  }],
  maxStudents: {
    type: Number,
    default: null // null means unlimited
  },
  startDate: Date,
  endDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for enrollment count
courseSchema.virtual('enrollmentCount').get(function() {
  return this.enrolledStudents.length;
});

// Virtual for isEnrollmentFull
courseSchema.virtual('isEnrollmentFull').get(function() {
  if (!this.maxStudents) return false;
  return this.enrolledStudents.length >= this.maxStudents;
});

// Virtual for discounted price
courseSchema.virtual('discountedPrice').get(function() {
  if (!this.discount || this.discount === 0) return this.price;
  return this.price - (this.price * this.discount / 100);
});

// Indexes for better query performance
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ category: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ isFeatured: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ 'rating.average': -1 });
courseSchema.index({ createdAt: -1 });

// Pre-save middleware to update original price if not set
courseSchema.pre('save', function(next) {
  if (!this.originalPrice) {
    this.originalPrice = this.price;
  }
  next();
});

// Static method to get featured courses
courseSchema.statics.getFeatured = function() {
  return this.find({ 
    isPublished: true, 
    isFeatured: true 
  }).populate('instructor', 'firstName lastName avatar');
};

// Static method to get courses by category
courseSchema.statics.getByCategory = function(category) {
  return this.find({ 
    category, 
    isPublished: true 
  }).populate('instructor', 'firstName lastName avatar');
};

// Instance method to enroll a student
courseSchema.methods.enrollStudent = function(studentId) {
  // Check if student is already enrolled
  const existingEnrollment = this.enrolledStudents.find(
    enrollment => enrollment.student.toString() === studentId.toString()
  );
  
  if (existingEnrollment) {
    throw new Error('Student is already enrolled in this course');
  }
  
  // Check if course is full
  if (this.isEnrollmentFull) {
    throw new Error('Course enrollment is full');
  }
  
  this.enrolledStudents.push({
    student: studentId,
    enrolledAt: new Date()
  });
  
  return this.save();
};

// Instance method to update student progress
courseSchema.methods.updateProgress = function(studentId, moduleId, progress) {
  const enrollment = this.enrolledStudents.find(
    enrollment => enrollment.student.toString() === studentId.toString()
  );
  
  if (!enrollment) {
    throw new Error('Student is not enrolled in this course');
  }
  
  enrollment.progress = progress;
  enrollment.lastAccessed = new Date();
  
  if (!enrollment.completedModules.includes(moduleId)) {
    enrollment.completedModules.push(moduleId);
  }
  
  return this.save();
};

module.exports = mongoose.model('Course', courseSchema); 