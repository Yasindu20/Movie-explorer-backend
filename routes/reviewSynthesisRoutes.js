const express = require('express');
const {
  getMovieReviewSynthesis,
  generateMovieReviewSynthesis,
  getSynthesisStatus
} = require('../controllers/reviewSynthesisController');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/synthesis/:movieId', getMovieReviewSynthesis);
router.get('/synthesis/:movieId/status', getSynthesisStatus);

// Protected routes (Admin only)
router.post('/synthesis/:movieId', protect, authorize('admin'), generateMovieReviewSynthesis);

module.exports = router;