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

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError('User already exists', 400));
    }

    const userData = {
      email,
      password,
      displayName,
      approved: false // Set approved to false by default for new users
    };

    const user = await User.create(userData);

    // Return a specific message for unapproved users
    res.status(201).json({
      success: true,
      message: "Thank you for registering! Your account is pending approval. You will be notified when your account is approved.",
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        approved: user.approved
      }
    });
  } catch (error) {
    next(new AppError('Registration failed', 500));
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Check if the user is approved
    if (!user.approved) {
      return next(new AppError('Thank You for your interest in Armatillo! It is currently in pre-alpha and testing is only available to certain users. Please contact josef@feztech.io if you would like to participate in testing', 403));
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
        displayName: user.displayName,
        approved: user.approved
      }
    });
  } catch (error) {
    next(new AppError('Login failed', 500));
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: requestToken } = req.body;
    
    if (!requestToken) {
      return next(new AppError('Refresh token is required', 400));
    }
    
    const decoded = await verifyToken(requestToken);
    if (!decoded) {
      return next(new AppError('Invalid refresh token', 401));
    }
    
    if (decoded.type !== 'refresh') {
      return next(new AppError('Invalid token type', 401));
    }
    
    const tokenDoc = await RefreshToken.findOne({ token: requestToken });
    if (!tokenDoc) {
      return next(new AppError('Refresh token not found', 401));
    }
    
    // Check if the user is still approved
    const user = await User.findById(decoded.userId);
    if (!user || !user.approved) {
      await RefreshToken.findByIdAndDelete(tokenDoc._id);
      return next(new AppError('Your account is no longer approved. Please contact josef@feztech.io for assistance.', 403));
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
    next(new AppError('Token refresh failed', 500));
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(new AppError('Logout failed', 500));
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Check if user is still approved
    if (!user.approved) {
      return next(new AppError('Your account is no longer approved. Please contact josef@feztech.io for assistance.', 403));
    }
    
    res.json({
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      approved: user.approved
    });
  } catch (error) {
    next(new AppError('Failed to get user info', 500));
  }
};

/**
 * @desc    Handle OAuth initiation
 * @route   GET /api/auth/google-mobile
 */
const initiateOAuth = (req, res, next) => {
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
      return next(new AppError('OAuth configuration error', 500));
    }
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', callbackUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'profile email');
    
    if (state) {
      authUrl.searchParams.append('state', state);
    }
    
    ['force_login', 'prompt', 'login_hint', 'authuser', 'nonce'].forEach(param => {
      if (req.query[param]) {
        authUrl.searchParams.append(param, req.query[param]);
      }
    });
    
    res.redirect(authUrl.toString());
  } catch (error) {
    next(new AppError('Failed to initiate OAuth flow', 500));
  }
};

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
          password: jwt.sign({ random: Math.random() }, process.env.JWT_SECRET),
          approved: false // Set approved to false by default for new OAuth users
        });
        
        // If the user is not approved, redirect to error page
        if (!user.approved) {
          return res.redirect(
            `armatillo://auth-error?error=not_approved&message=${encodeURIComponent('Thank You for your interest in Armatillo! It is currently in pre-alpha and testing is only available to certain users. Please contact josef@feztech.io if you would like to participate in testing')}`
          );
        }
      }
    }
    
    // Check if the user is approved
    if (!user.approved) {
      return res.redirect(
        `armatillo://auth-error?error=not_approved&message=${encodeURIComponent('Thank You for your interest in Armatillo! It is currently in pre-alpha and testing is only available to certain users. Please contact josef@feztech.io if you would like to participate in testing')}`
      );
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

// Add admin endpoints for approving users and managing approval status
const approveUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (!req.user.isAdmin) {
      return next(new AppError('Unauthorized', 403));
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    user.approved = true;
    await user.save();
    
    res.json({
      success: true,
      message: 'User approved successfully',
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        approved: user.approved
      }
    });
  } catch (error) {
    next(new AppError('Failed to approve user', 500));
  }
};

// Get all pending (unapproved) users
const getPendingUsers = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return next(new AppError('Unauthorized', 403));
    }
    
    const pendingUsers = await User.find({ approved: false }).select('-password');
    
    res.json({
      success: true,
      count: pendingUsers.length,
      users: pendingUsers
    });
  } catch (error) {
    next(new AppError('Failed to get pending users', 500));
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
  getApiUrl,
  approveUser,
  getPendingUsers
};