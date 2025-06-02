const express = require('express');
const {
  getMovieStreamingData,
  getStreamingServices,
  searchStreamingByTitle,
  getPopularStreamingContent,
  clearStreamingCache,
  getStreamingStats
} = require('../controllers/streamingController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/movie/:movieId', getMovieStreamingData);
router.get('/services', getStreamingServices);
router.get('/search', searchStreamingByTitle);
router.get('/popular', getPopularStreamingContent);
router.get('/stats', getStreamingStats);

// Protected routes (Admin only)
router.delete('/cache', protect, authorize('admin'), clearStreamingCache);

module.exports = router;