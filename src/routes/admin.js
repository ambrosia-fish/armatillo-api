const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');

// Admin dashboard
router.get('/dashboard', authenticate, adminOnly, async (req, res) => {
  try {
    res.json({
      message: 'Welcome to the admin dashboard',
      user: {
        id: req.user._id,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Error accessing admin dashboard:', error);
    res.status(500).json({ error: 'Failed to load admin dashboard' });
  }
});

module.exports = router;
