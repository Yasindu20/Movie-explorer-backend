const express = require('express');
const {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleBlogLike,
  addBlogComment
} = require('../controllers/blogController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getBlogs);
router.get('/:slug', getBlog);

// Protected routes
router.use(protect);

router.post('/', createBlog);
router.put('/:id', updateBlog);
router.delete('/:id', deleteBlog);
router.put('/:id/like', toggleBlogLike);
router.post('/:id/comments', addBlogComment);

module.exports = router;