const express = require('express');
const router = express.Router();
const { 
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  initiateOAuth,
  handleOAuthCallback
} = require('../controllers/authController');
const { 
  authenticate,
  approvedOnly,
  authErrorHandler
} = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// OAuth routes
router.get('/google-mobile', initiateOAuth);
router.get('/google-callback', handleOAuthCallback);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, approvedOnly, getCurrentUser);

// Apply auth error handler
router.use(authErrorHandler);

module.exports = router;