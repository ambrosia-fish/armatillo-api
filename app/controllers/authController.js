const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { getGoogleUserData } = require('../utils/googleOAuth');

/**
 * Generate access and refresh tokens
 * @param {string} userId - The user ID to encode in the token
 * @returns {Object} Object containing token, refreshToken and expiresIn
 */
const generateTokens = (userId) => {
  // Access token with 1-hour expiration
  const token = jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1h' }
  );
  
  // Refresh token with 30-day expiration
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  
  // Calculate exact expiration time in seconds
  const tokenInfo = jwt.decode(token);
  const expiresIn = tokenInfo.exp - Math.floor(Date.now() / 1000);
  
  return { token, refreshToken, expiresIn };
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      displayName
    });

    // Generate tokens
    const { token, refreshToken, expiresIn } = generateTokens(user._id);
    
    // Store refresh token in database
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken
    });

    // Success response with tokens
    res.status(201).json({
      success: true,
      token,
      refreshToken,
      expiresIn,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * @desc    Login user and get tokens
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const { token, refreshToken, expiresIn } = generateTokens(user._id);
    
    // Store refresh token in database
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken
    });

    // Success response with tokens
    res.json({
      success: true,
      token,
      refreshToken,
      expiresIn,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: requestToken } = req.body;
    
    if (!requestToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Verify the refresh token
    let payload;
    try {
      payload = jwt.verify(requestToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'invalid_token'
      });
    }
    
    // Check if it's actually a refresh token
    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // Check if token exists in database
    const tokenDoc = await RefreshToken.findOne({ token: requestToken });
    if (!tokenDoc) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }
    
    // Generate new tokens
    const { token, refreshToken: newRefreshToken, expiresIn } = generateTokens(payload.userId);
    
    // Delete old token and save new one
    await RefreshToken.findByIdAndDelete(tokenDoc._id);
    await RefreshToken.create({
      userId: payload.userId,
      token: newRefreshToken
    });
    
    // Return new tokens
    return res.json({
      success: true,
      token,
      refreshToken: newRefreshToken,
      expiresIn
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Server error during token refresh' });
  }
};

/**
 * @desc    Logout user (revoke refresh token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Remove refresh token from database if provided
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * @desc    Get current user info
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      id: user._id,
      email: user.email,
      displayName: user.displayName
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

/**
 * @desc    Handle OAuth initiation for mobile app
 * @route   GET /api/auth/google-mobile
 * @access  Public
 */
const initiateOAuth = (req, res) => {
  try {
    // Get state from request (CSRF protection)
    const state = req.query.state;
    const forceLogin = req.query.force_login === 'true';
    const promptType = req.query.prompt || (forceLogin ? 'select_account' : 'none');
    
    console.log(`OAuth initiated with state=${state}, force_login=${forceLogin}, prompt=${promptType}`);
    
    // Store state in session
    if (state) {
      req.session.oauthState = state;
    }
    
    // Build OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', `${process.env.API_URL}/api/auth/google-callback`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'profile email');
    
    // Add prompt parameter to control account selection behavior
    // - 'select_account': Always show account selection screen
    // - 'none': Don't show account selection if user is already logged in
    // - 'consent': Always show consent screen
    authUrl.searchParams.append('prompt', promptType);
    
    // Add state for CSRF protection
    if (state) {
      authUrl.searchParams.append('state', state);
    }
    
    console.log(`Redirecting to Google OAuth URL: ${authUrl.toString()}`);
    
    // Redirect to OAuth provider
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('OAuth initiation error:', error);
    // Return JSON error instead of redirecting to an error page
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
};

/**
 * @desc    Handle OAuth callback from provider
 * @route   GET /api/auth/google-callback
 * @access  Public
 */
const handleOAuthCallback = async (req, res) => {
  try {
    // Get authorization code and state
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`armatillo://auth-error?error=no_code`);
    }
    
    // Verify state parameter for CSRF protection
    if (state && req.session.oauthState) {
      if (state !== req.session.oauthState) {
        // Deep link back to the app with an error message
        return res.redirect(`armatillo://auth-error?error=invalid_state`);
      }
    }
    
    // Clear stored state
    req.session.oauthState = null;
    
    // Exchange code for tokens and get user data
    const userData = await getGoogleUserData(code);
    
    // Find or create user based on Google ID
    let user = await User.findOne({ googleId: userData.googleId });
    
    if (!user) {
      // If no user with this Google ID, check by email
      user = await User.findOne({ email: userData.email });
      
      if (user) {
        // Link Google ID to existing account
        user.googleId = userData.googleId;
        await user.save();
      } else {
        // Create new user from Google data
        user = await User.create({
          email: userData.email,
          displayName: userData.displayName,
          googleId: userData.googleId,
          // Random password for OAuth users
          password: jwt.sign({ random: Math.random() }, process.env.JWT_SECRET)
        });
      }
    }
    
    // Generate tokens
    const { token, refreshToken, expiresIn } = generateTokens(user._id);
    
    // Store refresh token
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken
    });
    
    // Redirect to app with tokens (deep link)
    return res.redirect(
      `armatillo://auth/callback?token=${token}&refresh_token=${refreshToken}&expires_in=${expiresIn}&state=${state}`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    // Deep link back to the app with an error
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
  handleOAuthCallback
};
