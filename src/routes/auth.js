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
  devLogin,
  getApiUrl
} = require('../controllers/authController');
const { 
  authenticate, 
  authErrorHandler,
  securityIncidentHandler
} = require