const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true
  },
  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  excerpt: {
    type: String,
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  featuredImage: {
    type: String
  },
  category: {
    type: String,
    enum: ['review', 'news', 'analysis', 'list', 'opinion', 'interview'],
    default: 'review'
  },
  relatedMovies: [{
    movieId: Number,
    movieTitle: String,
    moviePoster: String
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
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
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
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

// Create slug from title
BlogPostSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    
    // Add timestamp to ensure uniqueness
    this.slug = `${this.slug}-${Date.now()}`;
  }
  
  // Update excerpt if not provided
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 297) + '...';
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  
  this.updatedAt = Date.now();
  next();
});

// Virtuals
BlogPostSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

BlogPostSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

BlogPostSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('BlogPost', BlogPostSchema);