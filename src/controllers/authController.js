const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { getGoogleUserData } = require('../utils/googleOAuth');
const {
  generateToken,
  verifyToken,
  extractTokenFromHeader
} = require('../utils/tokenUtils');

/**
 * Get the API URL based on environment
 */
const getApiUrl = () => {
  return process.env.API_URL || 'http://localhost:3000';
};

/**
 * Generate access and refresh tokens
 */
const generateTokens = (userId) => {
  const token = generateToken({ userId }, '1h');
  const refreshToken = generateToken({ userId, type: 'refresh' }, '30d');
  const tokenInfo = jwt.decode(token);
  const expiresIn = tokenInfo.exp - Math.floor(Date.now() / 1000);
  
  return { token, refreshToken, expiresIn };
};

// [Rest of the existing code remains the same, just remove the devLogin function]

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  initiateOAuth,
  handleOAuthCallback,
  getApiUrl
};