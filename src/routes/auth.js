const express = require('express');
const router = express.Router();
const { 
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  initiateOAuth,
  handleOAuthCallback,
  devLogin,
  checkTestUser
} = require('../controllers/authController');
const { 
  authenticate,
  authErrorHandler
} = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Test user check endpoint
router.post('/check-test-user', checkTestUser);

// OAuth routes
router.get('/google-mobile', initiateOAuth);
router.get('/google-callback', handleOAuthCallback);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

// Development-only routes
if (process.env.NODE_ENV === 'development') {
  router.get('/dev-login', devLogin);
}

module.exports = router;