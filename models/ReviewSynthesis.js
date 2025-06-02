const mongoose = require('mongoose');

const ReviewSynthesisSchema = new mongoose.Schema({
  movieId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  movieTitle: {
    type: String,
    required: true
  },
  movieYear: {
    type: Number
  },
  
  // AI-generated summary
  summary: {
    type: String,
    required: true
  },
  
  // Overall sentiment analysis
  sentiment: {
    overall: {
      type: String,
      enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
    },
    score: Number, // -1 to 1
    breakdown: {
      very_positive: { type: Number, default: 0 },
      positive: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      very_negative: { type: Number, default: 0 }
    }
  },
  
  // Aspect-based analysis
  aspects: {
    plot: {
      mentions: { type: Number, default: 0 },
      averageSentiment: { type: Number, default: 0 },
      positiveCount: { type: Number, default: 0 },
      negativeCount: { type: Number, default: 0 },
      keywords: [String]
    },
    acting: {
      mentions: { type: Number, default: 0 },
      averageSentiment: { type: Number, default: 0 },
      positiveCount: { type: Number, default: 0 },
      negativeCount: { type: Number, default: 0 },
      keywords: [String]
    },
    direction: {
      mentions: { type: Number, default: 0 },
      averageSentiment: { type: Number, default: 0 },
      positiveCount: { type: Number, default: 0 },
      negativeCount: { type: Number, default: 0 },
      keywords: [String]
    },
    visuals: {
      mentions: { type: Number, default: 0 },
      averageSentiment: { type: Number, default: 0 },
      positiveCount: { type: Number, default: 0 },
      negativeCount: { type: Number, default: 0 },
      keywords: [String]
    },
    audio: {
      mentions: { type: Number, default: 0 },
      averageSentiment: { type: Number, default: 0 },
      positiveCount: { type: Number, default: 0 },
      negativeCount: { type: Number, default: 0 },
      keywords: [String]
    },
    pacing: {
      mentions: { type: Number, default: 0 },
      averageSentiment: { type: Number, default: 0 },
      positiveCount: { type: Number, default: 0 },
      negativeCount: { type: Number, default: 0 },
      keywords: [String]
    },
    overall: {
      mentions: { type: Number, default: 0 },
      averageSentiment: { type: Number, default: 0 },
      positiveCount: { type: Number, default: 0 },
      negativeCount: { type: Number, default: 0 },
      keywords: [String]
    }
  },
  
  // Key themes mentioned
  themes: [{
    theme: String,
    count: Number
  }],
  
  // Rating analysis
  ratings: {
    average: Number,
    distribution: {
      '9-10': { type: Number, default: 0 },
      '7-8': { type: Number, default: 0 },
      '5-6': { type: Number, default: 0 },
      '3-4': { type: Number, default: 0 },
      '1-2': { type: Number, default: 0 }
    },
    totalRatings: { type: Number, default: 0 }
  },
  
  // Meta information
  reviewCount: {
    type: Number,
    default: 0
  },
  sources: {
    tmdb: { type: Number, default: 0 },
    reddit: { type: Number, default: 0 },
    letterboxd: { type: Number, default: 0 },
    internal: { type: Number, default: 0 }
  },
  
  // Sample reviews for display
  featuredReviews: [{
    source: String,
    author: String,
    content: String,
    sentiment: String,
    rating: Number,
    helpful_votes: Number
  }],
  
  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  processingLog: [{
    step: String,
    status: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Cache control
  needsUpdate: {
    type: Boolean,
    default: false
  },
  
  popularityScore: {
    type: Number,
    default: 0 // For prioritizing which movies to update
  }
}, {
  timestamps: true
});

// Indexes for performance
ReviewSynthesisSchema.index({ movieId: 1 });
ReviewSynthesisSchema.index({ status: 1 });
ReviewSynthesisSchema.index({ needsUpdate: 1 });
ReviewSynthesisSchema.index({ popularityScore: -1 });
ReviewSynthesisSchema.index({ lastUpdated: 1 });

// Virtual for getting sentiment percentage
ReviewSynthesisSchema.virtual('positivePercentage').get(function() {
  const total = Object.values(this.sentiment.breakdown).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  
  const positive = this.sentiment.breakdown.very_positive + this.sentiment.breakdown.positive;
  return Math.round((positive / total) * 100);
});

// Method to check if needs update (older than 7 days or marked for update)
ReviewSynthesisSchema.methods.needsRefresh = function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.needsUpdate || this.lastUpdated < sevenDaysAgo;
};

// Static method to find movies needing update
ReviewSynthesisSchema.statics.findMoviesNeedingUpdate = function(limit = 10) {
  return this.find({
    $or: [
      { needsUpdate: true },
      { lastUpdated: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    ]
  }).sort({ popularityScore: -1 }).limit(limit);
};

ReviewSynthesisSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('ReviewSynthesis', ReviewSynthesisSchema);