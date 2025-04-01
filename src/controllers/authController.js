const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateToken, verifyToken } = require('../utils/tokenUtils');

/**
 * User registration
 */
const register = async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = await User.create({ email, password, displayName });

    // Generate tokens
    const token = generateToken({ userId: user._id });
    const refreshToken = generateToken({ userId: user._id, type: 'refresh' }, '30d');

    // Save refresh token
    await RefreshToken.create({ userId: user._id, token: refreshToken });

    res.status(201).json({
      token,
      refreshToken,
      user: { id: user._id, email: user.email, displayName: user.displayName }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and check password
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const token = generateToken({ userId: user._id });
    const refreshToken = generateToken({ userId: user._id, type: 'refresh' }, '30d');

    // Save refresh token
    await RefreshToken.create({ userId: user._id, token: refreshToken });

    res.json({
      token,
      refreshToken,
      user: { id: user._id, email: user.email, displayName: user.displayName }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Token refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = await verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Find and validate stored refresh token
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    // Generate new tokens
    const newToken = generateToken({ userId: decoded.userId });
    const newRefreshToken = generateToken({ userId: decoded.userId, type: 'refresh' }, '30d');

    // Remove old refresh token and save new one
    await RefreshToken.deleteOne({ token: refreshToken });
    await RefreshToken.create({ userId: decoded.userId, token: newRefreshToken });

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};

/**
 * User logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await RefreshToken.deleteOne({ token: refreshToken });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshToken, logout };