const UserReview = require('../models/UserReview');
const AIReviewAssistant = require('../utils/aiReviewAssistant');
const ErrorResponse = require('../utils/errorResponse');
const { fetchMovieDetails } = require('../api/tmdbApi');

const aiAssistant = new AIReviewAssistant();

// @desc    Get all reviews for a movie
// @route   GET /api/user-reviews/movie/:movieId
// @access  Public
exports.getMovieReviews = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const reviews = await UserReview.find({ 
      movieId: Number(movieId), 
      status: 'published' 
    })
      .populate('author', 'username name avatar')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await UserReview.countDocuments({ 
      movieId: Number(movieId), 
      status: 'published' 
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single review
// @route   GET /api/user-reviews/:id
// @access  Public
exports.getReview = async (req, res, next) => {
  try {
    const review = await UserReview.findById(req.params.id)
      .populate('author', 'username name avatar bio')
      .populate('comments.user', 'username name avatar');

    if (!review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Increment view count
    review.views += 1;
    await review.save();

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new review
// @route   POST /api/user-reviews
// @access  Private
exports.createReview = async (req, res, next) => {
  try {
    // Check if user already reviewed this movie
    const existingReview = await UserReview.findOne({
      movieId: req.body.movieId,
      author: req.user.id
    });

    if (existingReview) {
      return next(new ErrorResponse('You have already reviewed this movie', 400));
    }

    // Get movie details for enrichment
    const movieDetails = await fetchMovieDetails(req.body.movieId);
    if (!movieDetails) {
      return next(new ErrorResponse('Movie not found', 404));
    }

    // Enrich review data
    req.body.author = req.user.id;
    req.body.movieTitle = movieDetails.title;
    req.body.moviePoster = movieDetails.poster_path;
    req.body.movieYear = movieDetails.release_date ? 
      new Date(movieDetails.release_date).getFullYear() : null;

    // Generate tags if not provided
    if (!req.body.tags || req.body.tags.length === 0) {
      const movieGenres = movieDetails.genres?.map(g => g.name) || [];
      req.body.tags = aiAssistant.generateTags(req.body.content, movieGenres);
    }

    const review = await UserReview.create(req.body);

    // Populate author info for response
    await review.populate('author', 'username name avatar');

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update review
// @route   PUT /api/user-reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    let review = await UserReview.findById(req.params.id);

    if (!review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Make sure user owns the review
    if (review.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this review', 401));
    }

    review = await UserReview.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('author', 'username name avatar');

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete review
// @route   DELETE /api/user-reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await UserReview.findById(req.params.id);

    if (!review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Make sure user owns the review or is admin
    if (review.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this review', 401));
    }

    await review.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Like/Unlike review
// @route   PUT /api/user-reviews/:id/like
// @access  Private
exports.toggleReviewLike = async (req, res, next) => {
  try {
    const review = await UserReview.findById(req.params.id);

    if (!review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    const index = review.likes.indexOf(req.user.id);

    if (index === -1) {
      review.likes.push(req.user.id);
    } else {
      review.likes.splice(index, 1);
    }

    await review.save();

    res.status(200).json({
      success: true,
      data: {
        likes: review.likes.length,
        isLiked: index === -1
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add comment to review
// @route   POST /api/user-reviews/:id/comments
// @access  Private
exports.addReviewComment = async (req, res, next) => {
  try {
    const review = await UserReview.findById(req.params.id);

    if (!review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    const comment = {
      user: req.user.id,
      content: req.body.content
    };

    review.comments.push(comment);
    await review.save();

    // Populate the new comment
    await review.populate('comments.user', 'username name avatar');

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's reviews
// @route   GET /api/user-reviews/my-reviews
// @access  Private
exports.getMyReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = 'published' } = req.query;

    const reviews = await UserReview.find({ 
      author: req.user.id,
      ...(status !== 'all' && { status })
    })
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await UserReview.countDocuments({ 
      author: req.user.id,
      ...(status !== 'all' && { status })
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: Number(page),
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};

// ============================================
// AI ASSISTANCE ENDPOINTS
// ============================================

// @desc    Get review templates
// @route   GET /api/user-reviews/ai/templates
// @access  Private
exports.getReviewTemplates = async (req, res, next) => {
  try {
    const templates = aiAssistant.getReviewTemplates();

    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Generate review outline
// @route   POST /api/user-reviews/ai/outline
// @access  Private
exports.generateReviewOutline = async (req, res, next) => {
  try {
    const { templateType, movieTitle, userPreferences = {} } = req.body;

    if (!templateType || !movieTitle) {
      return next(new ErrorResponse('Template type and movie title are required', 400));
    }

    const outline = aiAssistant.generateReviewOutline(templateType, movieTitle, userPreferences);

    if (!outline) {
      return next(new ErrorResponse('Invalid template type', 400));
    }

    res.status(200).json({
      success: true,
      data: outline
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get writing suggestions
// @route   POST /api/user-reviews/ai/suggestions
// @access  Private
exports.getWritingSuggestions = async (req, res, next) => {
  try {
    const { userInput, movieTitle, aspectFocus } = req.body;

    if (!movieTitle) {
      return next(new ErrorResponse('Movie title is required', 400));
    }

    const suggestions = await aiAssistant.generateWritingSuggestions(
      userInput, 
      movieTitle, 
      aspectFocus
    );

    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Improve review text
// @route   POST /api/user-reviews/ai/improve
// @access  Private
exports.improveReviewText = async (req, res, next) => {
  try {
    const { text, improvementType = 'clarity' } = req.body;

    if (!text) {
      return next(new ErrorResponse('Text is required', 400));
    }

    const improvedText = await aiAssistant.improveReviewText(text, improvementType);

    res.status(200).json({
      success: true,
      data: {
        original: text,
        improved: improvedText,
        improvementType
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Generate tags for review
// @route   POST /api/user-reviews/ai/tags
// @access  Private
exports.generateReviewTags = async (req, res, next) => {
  try {
    const { reviewContent, movieId } = req.body;

    if (!reviewContent) {
      return next(new ErrorResponse('Review content is required', 400));
    }

    let movieGenres = [];
    if (movieId) {
      try {
        const movieDetails = await fetchMovieDetails(movieId);
        movieGenres = movieDetails?.genres?.map(g => g.name) || [];
      } catch (error) {
        console.error('Error fetching movie details for tags:', error);
      }
    }

    const tags = aiAssistant.generateTags(reviewContent, movieGenres);

    res.status(200).json({
      success: true,
      data: tags
    });
  } catch (err) {
    next(err);
  }
};