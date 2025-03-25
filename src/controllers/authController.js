const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TestUser = require('../models/TestUser');
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
  if (process.env.RAILWAY_STATIC_URL) {
    return 'https://armatillo-api-production.up.railway.app';
  }
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

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
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

    const { token, refreshToken, expiresIn } = generateTokens(user._id);
    
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken
    });

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
 * @desc    Login user
 * @route   POST /api/auth/login
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

    const { token, refreshToken, expiresIn } = generateTokens(user._id);
    
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken
    });

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
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: requestToken } = req.body;
    
    if (!requestToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    const decoded = await verifyToken(requestToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    const tokenDoc = await RefreshToken.findOne({ token: requestToken });
    if (!tokenDoc) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }
    
    const { token, refreshToken: newRefreshToken, expiresIn } = generateTokens(decoded.userId);
    
    await RefreshToken.findByIdAndDelete(tokenDoc._id);
    await RefreshToken.create({
      userId: decoded.userId,
      token: newRefreshToken
    });
    
    return res.json({
      success: true,
      token,
      refreshToken: newRefreshToken,
      expiresIn
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
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
 * @desc    Handle OAuth initiation
 * @route   GET /api/auth/google-mobile
 */
const initiateOAuth = (req, res) => {
  try {
    const state = req.query.state;
    const redirectUri = req.query.redirect_uri || null;
    
    if (state) {
      req.session.oauthState = state;
    }
    
    if (redirectUri) {
      req.session.redirectUri = redirectUri;
    }
    
    const apiUrl = getApiUrl();
    const callbackUrl = `${apiUrl}/api/auth/google-callback`;
    
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'OAuth configuration error' });
    }
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', callbackUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'profile email');
    
    if (state) {
      authUrl.searchParams.append('state', state);
    }
    
    // Add additional parameters
    ['force_login', 'prompt', 'login_hint', 'authuser', 'nonce'].forEach(param => {
      if (req.query[param]) {
        authUrl.searchParams.append(param, req.query[param]);
      }
    });
    
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
};

/**
 * Check if a user is an approved test user
 */
const isApprovedTestUser = async (email) => {
  // In development, approve all users
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // For testing, approve specific test emails
  if (email === 'test@example.com' || email.endsWith('@gmail.com')) {
    return true;
  }
  
  // Check if this is an approved test user
  const testUser = await TestUser.findOne({ email });
  return testUser && testUser.status === 'approved';
};

/**
 * Record a pending test user request
 */
const recordPendingTestUser = async (email) => {
  const existingUser = await TestUser.findOne({ email });
  
  if (!existingUser) {
    await TestUser.create({
      email,
      status: 'pending',
      notes: 'Automatic registration request'
    });
  }
};

/**
 * @desc    Handle OAuth callback
 * @route   GET /api/auth/google-callback
 */
const handleOAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`armatillo://auth-error?error=no_code`);
    }
    
    if (state && req.session.oauthState && state !== req.session.oauthState) {
      return res.redirect(`armatillo://auth-error?error=invalid_state`);
    }
    
    const redirectUri = req.session.redirectUri || 'armatillo://auth/callback';
    req.session.oauthState = null;
    
    const userData = await getGoogleUserData(code);
    
    const isApproved = await isApprovedTestUser(userData.email);
    
    if (!isApproved) {
      await recordPendingTestUser(userData.email);
      
      const existingUser = await User.findOne({ 
        $or: [
          { googleId: userData.googleId },
          { email: userData.email }
        ]
      });
      
      const message = existingUser 
        ? "Thank you for your interest. Your access is pending approval."
        : "Thank you for registering. Your access request is pending approval.";
        
      return res.redirect(
        `armatillo://auth/pending?message=${encodeURIComponent(message)}`
      );
    }
    
    // Find or create user
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
    
    // Redirect with tokens directly
    return res.redirect(
      `${redirectUri.includes('://') ? redirectUri : 'armatillo://auth/callback'}?token=${token}&refresh_token=${refreshToken}&expires_in=${expiresIn}&state=${state}`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`armatillo://auth-error?error=server_error&message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * @desc    Development login
 * @route   GET /api/auth/dev-login
 */
const devLogin = async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    let user = await User.findOne({ email: 'dev@example.com' });
    
    if (!user) {
      user = await User.create({
        email: 'dev@example.com',
        displayName: 'Development User',
        password: jwt.sign({ random: Math.random() }, process.env.JWT_SECRET)
      });
    }
    
    const { token, refreshToken, expiresIn } = generateTokens(user._id);
    
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken
    });
    
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
    console.error('Development login error:', error);
    res.status(500).json({ error: 'Development login failed' });
  }
};

/**
 * @desc    Check if a test user is approved
 * @route   POST /api/auth/check-test-user
 */
const checkTestUser = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const isApproved = await isApprovedTestUser(email);
    
    res.json({ 
      approved: isApproved,
      message: isApproved ? null : "Your access request is pending approval." 
    });
  } catch (error) {
    console.error('Test user check error:', error);
    res.status(500).json({ error: 'Failed to check test user status' });
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
  devLogin,
  checkTestUser,
  getApiUrl
};