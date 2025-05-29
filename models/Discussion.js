const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const DiscussionSchema = new mongoose.Schema({
  movieId: {
    type: Number,
    required: [true, 'Movie ID is required']
  },
  movieTitle: {
    type: String,
    required: [true, 'Movie title is required']
  },
  moviePoster: {
    type: String
  },
  title: {
    type: String,
    required: [true, 'Discussion title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Discussion content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'review', 'theory', 'spoiler', 'question'],
    default: 'general'
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  comments: [CommentSchema],
  views: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
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

// Update the updatedAt timestamp on save
DiscussionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for comment count
DiscussionSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for like count
DiscussionSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Ensure virtuals are included in JSON output
DiscussionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Discussion', DiscussionSchema);