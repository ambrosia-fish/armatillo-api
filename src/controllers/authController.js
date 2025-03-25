const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { getGoogleUserData } = require('../utils/googleOAuth');
const { AppError } = require('../utils/errorHandler');
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

// ... (previous functions remain the same)

/**
 * @desc    Handle OAuth callback
 * @route   GET /api/auth/google-callback
 */
const handleOAuthCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`armatillo://auth-error?error=no_code`);
    }
    
    // Optional state validation
    if (state && req.session.oauthState && state !== req.session.oauthState) {
      return res.redirect(`armatillo://auth-error?error=invalid_state`);
    }
    
    // Use environment-based or fallback redirect URI
    const redirectUri = process.env.OAUTH_REDIRECT_URI || 'armatillo://auth/callback';
    req.session.oauthState = null;
    
    const userData = await getGoogleUserData(code);
    
    let user = await User.findOne({ googleId: userData.googleId });
    
    if (!user) {
      user = await User.findOne({ email: userData.email });
      
      if (user) {
        user.googleId = userData.googleId;
        await user.save();
      } else {
        user = await User.create({
          email: userData.email,
          displayName: userData.displayName,
          googleId: userData.googleId,
          password: jwt.sign({ random: Math.random() }, process.env.JWT_SECRET)
        });
      }
    }
    
    const { token, refreshToken, expiresIn } = generateTokens(user._id);
    
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken
    });
    
    return res.redirect(
      `${redirectUri}?token=${token}&refresh_token=${refreshToken}&expires_in=${expiresIn}&state=${state || ''}`
    );
  } catch (error) {
    return res.redirect(`armatillo://auth-error?error=server_error&message=${encodeURIComponent(error.message)}`);
  }
};

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