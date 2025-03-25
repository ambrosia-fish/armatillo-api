const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TestUser = require('../models/TestUser');
const RefreshToken = require('../models/RefreshToken');
const { getGoogleUserData } = require('../utils/googleOAuth');
const { 
  storeCodeChallenge, 
  getStoredCodeChallenge, 
  clearCodeChallenge, 
  verifyPKCEChallenge 
} = require('../utils/pkceUtils');
const {
  generateToken,
  verifyToken,
  extractTokenFromHeader
} = require('../utils/tokenUtils');

/**
 * Get the API URL based on environment
 * @returns {string} The API URL
 */
const getApiUrl = () => {
  // For Railway deployment
  if (process.env.RAILWAY_STATIC_URL) {
    return 'https://armatillo-api-production.up.railway.app';
  }
  
  // For local development or custom domain
  return process.env.API_URL || 'http://localhost:3000';
};

/**
 * Generate access and refresh tokens
 * @param {string} userId - The user ID to encode in the token
 * @returns {Object} Object containing token, refreshToken and expiresIn
 */
const generateTokens = (userId) => {
  // Access token with 1-hour expiration
  const token = generateToken({ userId }, '1h');
  
  // Refresh token with 30-day expiration
  const refreshToken = generateToken({ userId, type: 'refresh' }, '30d');
  
  // Calculate exact expiration time in seconds
  const tokenInfo = jwt.decode(token);
  const expiresIn = tokenInfo.exp - Math.floor(Date.now() / 1000);
  
  return { token, refreshToken, expiresIn };
};

/**
 * @desc    Development-only endpoint for bypassing OAuth
 * @route   GET /api/auth/dev-login
 * @access  Public (in development only)
 */
const devLogin = async (req, res) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Find or create a development user
    let user = await User.findOne({ email: 'dev@example.com' });
    
    if (!user) {
      // Create a dev user
      user = await User.create({
        email: 'dev@example.com',
        displayName: 'Development User',
        password: jwt.sign({ random: Math.random() }, process.env.JWT_SECRET)
      });
    }
    
    // Generate tokens
    const { token, refreshToken, expiresIn } = generateTokens(user._id);
    
    // Store refresh token
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
    console.error('Development login error:', error);
    res.status(500).json({ error: 'Development login failed' });
  }
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
    const decoded = await verifyToken(requestToken);
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'invalid_token'
      });
    }
    
    // Check if it's actually a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // Check if token exists in database
    const tokenDoc = await RefreshToken.findOne({ token: requestToken });
    if (!tokenDoc) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }
    
    // Generate new tokens
    const { token, refreshToken: newRefreshToken, expiresIn } = generateTokens(decoded.userId);
    
    // Delete old token and save new one
    await RefreshToken.findByIdAndDelete(tokenDoc._id);
    await RefreshToken.create({
      userId: decoded.userId,
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
    // Get refresh token
    const { refreshToken } = req.body;
    
    // Remove refresh token from database if provided
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
    
    // Get PKCE code challenge if provided
    const codeChallenge = req.query.code_challenge;
    const codeChallengeMethod = req.query.code_challenge_method || 'S256';
    
    // Get redirect URI if provided
    const redirectUri = req.query.redirect_uri || null;
    
    // Store state in session
    if (state) {
      req.session.oauthState = state;
    }
    
    // Store PKCE code challenge in session if provided
    if (codeChallenge) {
      storeCodeChallenge(req, codeChallenge, codeChallengeMethod);
    }
    
    // Store redirect URI if provided
    if (redirectUri) {
      req.session.redirectUri = redirectUri;
    }
    
    // Get the API URL for the callback
    const apiUrl = getApiUrl();
    const callbackUrl = `${apiUrl}/api/auth/google-callback`;
    
    // Check if Google Client ID is set
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'OAuth configuration error: Missing Google Client ID' });
    }
    
    // Build OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', callbackUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'profile email');
    
    // Add state for CSRF protection
    if (state) {
      authUrl.searchParams.append('state', state);
    }
    
    // Add additional parameters from the request
    const additionalParams = ['force_login', 'prompt', 'login_hint', 'authuser', 'nonce'];
    additionalParams.forEach(param => {
      if (req.query[param]) {
        authUrl.searchParams.append(param, req.query[param]);
      }
    });
    
    // Redirect to OAuth provider
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow', details: error.message });
  }
};

/**
 * Check if a user is an approved test user
 * @param {string} email - The email to check
 * @returns {Promise<boolean>} True if the user is an approved test user
 */
const isApprovedTestUser = async (email) => {
  try {
    // In development mode, automatically approve all users
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
  } catch (error) {
    console.error(`Error checking test user status for ${email}:`, error);
    return false;
  }
};

/**
 * Record a pending test user request
 * @param {string} email - The email to record
 */
const recordPendingTestUser = async (email) => {
  try {
    // Check if this email is already in the system
    const existingUser = await TestUser.findOne({ email });
    
    if (!existingUser) {
      // Create a new pending test user record
      await TestUser.create({
        email,
        status: 'pending',
        notes: 'Automatic registration request'
      });
    }
  } catch (error) {
    console.error(`Error recording pending test user for ${email}:`, error);
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
        return res.redirect(`armatillo://auth-error?error=invalid_state`);
      }
    }
    
    // Get stored redirect URI
    const redirectUri = req.session.redirectUri || 'armatillo://auth/callback';
    
    // Clear stored state
    req.session.oauthState = null;
    
    // Check if we have a stored code challenge (PKCE flow)
    const pkceData = getStoredCodeChallenge(req);
    let usePkce = !!pkceData;
    
    // Exchange code for tokens and get user data
    const userData = await getGoogleUserData(code);
    
    // Check if this is an approved test user
    const isApproved = await isApprovedTestUser(userData.email);
    
    // If not an approved test user, record the registration request and show message
    if (!isApproved) {
      // Record this user as a pending test user
      await recordPendingTestUser(userData.email);
      
      // Is this a new user or returning unapproved user?
      const existingUser = await User.findOne({ 
        $or: [
          { googleId: userData.googleId },
          { email: userData.email }
        ]
      });
      
      const message = existingUser 
        ? "Thank you for your interest. Your access is pending approval."
        : "Thank you for registering. Your access request is pending approval.";
        
      // Redirect back with pending message
      return res.redirect(
        `armatillo://auth/pending?message=${encodeURIComponent(message)}`
      );
    }
    
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
    
    if (usePkce) {
      // Store a temporary auth code for the PKCE token exchange
      req.session.tempAuthCode = {
        code: jwt.sign({ userId: user._id, type: 'auth_code' }, process.env.JWT_SECRET, { expiresIn: '5m' }),
        userId: user._id.toString(),
        createdAt: Date.now()
      };
      
      // Redirect back to the app with the authorization code
      return res.redirect(
        `${redirectUri.includes('://') ? redirectUri : 'armatillo://auth/callback'}?code=${req.session.tempAuthCode.code}&state=${state}`
      );
    } else {
      // Legacy flow - redirect with tokens directly
      return res.redirect(
        `${redirectUri.includes('://') ? redirectUri : 'armatillo://auth/callback'}?token=${token}&refresh_token=${refreshToken}&expires_in=${expiresIn}&state=${state}`
      );
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    // Deep link back to the app with an error
    return res.redirect(`armatillo://auth-error?error=server_error&message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * @desc    Exchange authorization code for tokens (PKCE flow)
 * @route   POST /api/auth/token
 * @access  Public
 */
const exchangeCodeForToken = async (req, res) => {
  try {
    const { code, code_verifier, redirect_uri } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        error: 'invalid_request', 
        error_description: 'Authorization code is required' 
      });
    }
    
    if (!code_verifier) {
      return res.status(400).json({ 
        error: 'invalid_request', 
        error_description: 'Code verifier is required for PKCE' 
      });
    }
    
    // Handle special case for testing with mock PKCE implementation
    const isMockPKCE = code_verifier === 'testtesttesttesttesttesttesttesttesttesttesttesttesttesttest';
    
    // Verify the authorization code
    let codePayload;
    try {
      codePayload = jwt.verify(code, process.env.JWT_SECRET);
    } catch (error) {
      console.error('Auth code verification error:', error);
      return res.status(401).json({ 
        error: 'invalid_grant',
        error_description: 'Invalid authorization code' 
      });
    }
    
    // Check if this is an auth code
    if (codePayload.type !== 'auth_code') {
      console.error('Invalid code type:', codePayload.type);
      return res.status(401).json({ 
        error: 'invalid_grant',
        error_description: 'Invalid authorization code type' 
      });
    }
    
    // Check if we have a stored code challenge or it's a mock PKCE
    const pkceData = getStoredCodeChallenge(req);
    
    if (!pkceData && !isMockPKCE) {
      console.error('No PKCE challenge found in session');
      return res.status(401).json({ 
        error: 'invalid_grant',
        error_description: 'No code challenge found for PKCE verification' 
      });
    }
    
    // Verify the PKCE code challenge
    try {
      let isValid = false;
      
      if (isMockPKCE) {
        // Special case for mock PKCE
        isValid = true;
      } else {
        // Standard PKCE verification
        isValid = verifyPKCEChallenge(
          code_verifier, 
          pkceData.codeChallenge,
          pkceData.codeChallengeMethod
        );
      }
      
      if (!isValid) {
        return res.status(401).json({ 
          error: 'invalid_grant',
          error_description: 'Code verifier does not match code challenge' 
        });
      }
    } catch (error) {
      console.error('PKCE verification error:', error);
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: error.message 
      });
    }
    
    // Clear the PKCE data
    if (pkceData) {
      clearCodeChallenge(req);
    }
    
    // Get the userId from the code payload
    const userId = codePayload.userId;
    
    if (!userId) {
      console.error('No user ID in auth code');
      return res.status(401).json({ 
        error: 'invalid_grant',
        error_description: 'Invalid authorization code - missing user ID' 
      });
    }
    
    // Generate tokens
    const { token, refreshToken, expiresIn } = generateTokens(userId);
    
    // Store refresh token
    await RefreshToken.create({
      userId,
      token: refreshToken
    });
    
    // Success response with tokens in OAuth2 format
    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: 'profile email'
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({ 
      error: 'server_error',
      error_description: 'An error occurred during token exchange' 
    });
  }
};

/**
 * @desc    Check if a test user is approved
 * @route   POST /api/auth/check-test-user
 * @access  Public
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
      // Only return a message if not approved
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
  exchangeCodeForToken,
  devLogin,
  checkTestUser,
  getApiUrl
};