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
  exchangeCodeForToken
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// PKCE token exchange endpoint
router.post('/token', exchangeCodeForToken);

// OAuth routes
router.get('/google-mobile', initiateOAuth);
router.get('/google-callback', handleOAuthCallback);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

module.exports = router;
