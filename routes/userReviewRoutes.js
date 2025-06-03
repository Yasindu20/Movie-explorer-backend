const express = require('express');
const {
  getMovieReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  toggleReviewLike,
  addReviewComment,
  getMyReviews,
  getReviewTemplates,
  generateReviewOutline,
  getWritingSuggestions,
  improveReviewText,
  generateReviewTags
} = require('../controllers/userReviewController');

const router = express.Router();
const { protect } = require('../middleware/auth');

// Public routes
router.get('/movie/:movieId', getMovieReviews);
router.get('/:id', getReview);

// Protected routes
router.use(protect);

// Review CRUD
router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.put('/:id/like', toggleReviewLike);
router.post('/:id/comments', addReviewComment);
router.get('/my-reviews', getMyReviews);

// AI Assistance routes
router.get('/ai/templates', getReviewTemplates);
router.post('/ai/outline', generateReviewOutline);
router.post('/ai/suggestions', getWritingSuggestions);
router.post('/ai/improve', improveReviewText);
router.post('/ai/tags', generateReviewTags);

module.exports = router;