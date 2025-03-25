const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');
const { AppError } = require('../utils/errorHandler');

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

module.exports = router;
