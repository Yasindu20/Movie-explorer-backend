const ReviewSynthesisService = require('../services/reviewSynthesisService');
const ErrorResponse = require('../utils/errorResponse');

const reviewSynthesisService = new ReviewSynthesisService();

// @desc    Get AI-powered review synthesis for a movie
// @route   GET /api/reviews/synthesis/:movieId
// @access  Public
exports.getMovieReviewSynthesis = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { force } = req.query;

    if (!movieId || isNaN(movieId)) {
      return next(new ErrorResponse('Valid movie ID is required', 400));
    }

    console.log(`Getting review synthesis for movie ${movieId}`);

    const synthesis = await reviewSynthesisService.getSynthesis(
      parseInt(movieId), 
      force === 'true'
    );

    if (!synthesis) {
      return next(new ErrorResponse('Unable to generate review synthesis', 500));
    }

    res.status(200).json({
      success: true,
      data: synthesis
    });
  } catch (err) {
    console.error('Review synthesis error:', err);
    next(err);
  }
};

// @desc    Trigger synthesis generation for a movie
// @route   POST /api/reviews/synthesis/:movieId
// @access  Private (Admin only for manual triggers)
exports.generateMovieReviewSynthesis = async (req, res, next) => {
  try {
    const { movieId } = req.params;

    if (!movieId || isNaN(movieId)) {
      return next(new ErrorResponse('Valid movie ID is required', 400));
    }

    // Start synthesis process (don't wait for completion)
    reviewSynthesisService.generateSynthesis(parseInt(movieId), true)
      .catch(error => console.error('Background synthesis error:', error));

    res.status(202).json({
      success: true,
      message: 'Review synthesis started. Check back in a few minutes.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get synthesis status for a movie
// @route   GET /api/reviews/synthesis/:movieId/status
// @access  Public
exports.getSynthesisStatus = async (req, res, next) => {
  try {
    const { movieId } = req.params;

    const synthesis = await require('../models/ReviewSynthesis').findOne({ 
      movieId: parseInt(movieId) 
    }).select('status processingLog lastUpdated');

    if (!synthesis) {
      return res.status(200).json({
        success: true,
        data: { status: 'not_started' }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: synthesis.status,
        lastUpdated: synthesis.lastUpdated,
        processingLog: synthesis.processingLog.slice(-3) // Last 3 log entries
      }
    });
  } catch (err) {
    next(err);
  }
};