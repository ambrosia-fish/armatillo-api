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
  exchangeCodeForToken,
  reportSecurityEvent,
  devLogin
} = require('../controllers/authController');
const { 
  authenticate, 
  authErrorHandler,
  securityIncidentHandler
} = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// PKCE token exchange endpoint
router.post('/token', exchangeCodeForToken);

// Security reporting endpoint
router.post('/report-security-event', securityIncidentHandler);

// OAuth routes
router.get('/google-mobile', initiateOAuth);
router.get('/google-callback', handleOAuthCallback);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

// Development-only routes (only available in development environment)
if (process.env.NODE_ENV === 'development') {
  router.get('/dev-login', devLogin);
}

module.exports = router;
