const mongoose = require('mongoose');

const UserReviewSchema = new mongoose.Schema({
  movieId: {
    type: Number,
    required: true,
    index: true
  },
  movieTitle: {
    type: String,
    required: true
  },
  moviePoster: String,
  movieYear: Number,
  
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Review content
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Review title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: true,
    minlength: [50, 'Review must be at least 50 characters'],
    maxlength: [5000, 'Review cannot exceed 5000 characters']
  },
  
  // Ratings (0-10 scale)
  ratings: {
    overall: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    plot: {
      type: Number,
      min: 0,
      max: 10
    },
    acting: {
      type: Number,
      min: 0,
      max: 10
    },
    direction: {
      type: Number,
      min: 0,
      max: 10
    },
    visuals: {
      type: Number,
      min: 0,
      max: 10
    },
    audio: {
      type: Number,
      min: 0,
      max: 10
    }
  },
  
  // Review metadata
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  spoilerWarning: {
    type: Boolean,
    default: false
  },
  
  recommendToFriends: {
    type: Boolean,
    default: true
  },
  
  watchedDate: {
    type: Date
  },
  
  // AI assistance tracking
  aiAssisted: {
    type: Boolean,
    default: false
  },
  
  helpfulnessScore: {
    type: Number,
    default: 0
  },
  
  // Social features
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Review status
  status: {
    type: String,
    enum: ['draft', 'published', 'flagged', 'archived'],
    default: 'published'
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
UserReviewSchema.index({ movieId: 1, author: 1 });
UserReviewSchema.index({ author: 1, status: 1 });
UserReviewSchema.index({ movieId: 1, status: 1, createdAt: -1 });
UserReviewSchema.index({ 'ratings.overall': -1 });

// Pre-save middleware
UserReviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtuals
UserReviewSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

UserReviewSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

UserReviewSchema.virtual('averageAspectRating').get(function() {
  const aspects = ['plot', 'acting', 'direction', 'visuals', 'audio'];
  const ratings = aspects
    .map(aspect => this.ratings[aspect])
    .filter(rating => rating !== null && rating !== undefined);
  
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

UserReviewSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('UserReview', UserReviewSchema);