const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');
const { AppError } = require('../utils/errorHandler');
const { 
  approveUser, 
  getPendingUsers 
} = require('../controllers/authController');

// Admin dashboard
router.get('/dashboard', authenticate, adminOnly, async (req, res, next) => {
  try {
    res.json({
      message: 'Welcome to the admin dashboard',
      user: {
        id: req.user._id,
        email: req.user.email
      }
    });
  } catch (error) {
    next(new AppError('Failed to load admin dashboard', 500));
  }
});

// User approval routes
router.get('/users/pending', authenticate, adminOnly, getPendingUsers);
router.post('/users/:userId/approve', authenticate, adminOnly, approveUser);

module.exports = router;
