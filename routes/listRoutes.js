const express = require('express');
const {
  getLists,
  getList,
  createList,
  updateList,
  deleteList,
  addMovieToList,
  removeMovieFromList,
  toggleFollowList
} = require('../controllers/listController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getLists);
router.get('/:id', getList);

// Protected routes
router.use(protect);

router.post('/', createList);
router.put('/:id', updateList);
router.delete('/:id', deleteList);
router.post('/:id/movies', addMovieToList);
router.delete('/:id/movies/:movieId', removeMovieFromList);
router.put('/:id/follow', toggleFollowList);

module.exports = router;