const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  createDemoUsers
} = require('../controllers/authController');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);

// Development only - create demo users
if (process.env.NODE_ENV !== 'production') {
  router.post('/create-demo-users', createDemoUsers);
}

module.exports = router;