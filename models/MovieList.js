const mongoose = require('mongoose');

const MovieListSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'List name is required'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  creator: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  movies: [{
    movieId: {
      type: Number,
      required: true
    },
    movieTitle: {
      type: String,
      required: true
    },
    moviePoster: String,
    movieYear: Number,
    movieRating: Number,
    addedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      maxlength: [300, 'Note cannot exceed 300 characters']
    }
  }],
  followers: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isCollaborative: {
    type: Boolean,
    default: false
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'viewer'
    }
  }],
  category: {
    type: String,
    enum: ['watchlist', 'favorites', 'themed', 'ranking', 'custom'],
    default: 'custom'
  },
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

// Update timestamp
MovieListSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtuals
MovieListSchema.virtual('movieCount').get(function() {
  return this.movies.length;
});

MovieListSchema.virtual('followerCount').get(function() {
  return this.followers.length;
});

MovieListSchema.set('toJSON', { virtuals: true });

// Index for better query performance
MovieListSchema.index({ creator: 1, isPublic: 1 });
MovieListSchema.index({ tags: 1 });
MovieListSchema.index({ 'movies.movieId': 1 });

module.exports = mongoose.model('MovieList', MovieListSchema);