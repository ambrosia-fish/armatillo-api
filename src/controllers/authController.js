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

// ... (previous functions remain the same)

/**
 * @desc    Handle OAuth callback
 * @route   GET /api/auth/google-callback
 */
const handleOAuthCallback = async (req, res, next) => {
  try {
    console.log('Full OAuth Callback - Complete Request:', {
      query: req.query,
      headers: req.headers,
      method: req.method,
      url: req.originalUrl
    });

    const { code } = req.query;
    
    if (!code) {
      console.error('No authorization code received');
      return res.status(400).send('No authorization code');
    }
    
    // Use environment-based redirect URI
    const redirectUri = process.env.OAUTH_REDIRECT_URI;
    console.log('Using Redirect URI:', redirectUri);
    
    try {
      const userData = await getGoogleUserData(code);
      console.log('Retrieved User Data:', userData);
      
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
      
      // Construct full redirect URL with all parameters
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.append('token', token);
      redirectUrl.searchParams.append('refresh_token', refreshToken);
      redirectUrl.searchParams.append('expires_in', expiresIn);
      
      console.log('Final Redirect URL:', redirectUrl.toString());
      
      return res.redirect(redirectUrl.toString());
    } catch (processingError) {
      console.error('OAuth Processing Error:', processingError);
      return res.status(500).send('OAuth processing failed');
    }
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    return res.status(500).send('OAuth callback failed');
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