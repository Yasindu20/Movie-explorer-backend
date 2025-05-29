const express = require('express');
const {
  getMovieDiscussions,
  getDiscussion,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  addComment,
  toggleLike
} = require('../controllers/discussionController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/movie/:movieId', getMovieDiscussions);
router.get('/:id', getDiscussion);

// Protected routes
router.use(protect); // All routes below this will require authentication

router.post('/', createDiscussion);
router.put('/:id', updateDiscussion);
router.delete('/:id', deleteDiscussion);
router.post('/:id/comments', addComment);
router.put('/:id/like', toggleLike);

module.exports = router;