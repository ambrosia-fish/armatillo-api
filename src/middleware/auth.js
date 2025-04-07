const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { extractTokenFromHeader, verifyToken } = require('../utils/tokenUtils');

const authenticate = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      return next(new AppError('No authentication token provided', 401));
    }
    
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return next(new AppError('Invalid token', 401));
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new AppError('User not found', 401));
    }
    
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    next(new AppError('Authentication failed', 401));
  }
};

// Middleware to check if user is approved
const approvedOnly = (req, res, next) => {
  if (!req.user.approved) {
    return next(new AppError('Thank You for your interest in Armatillo! It is currently in pre-alpha and testing is only available to certain users. Please contact josef@feztech.io if you would like to participate in testing', 403));
  }
  
  next();
};

const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return next(new AppError('Admin access required', 403));
  }
  
  next();
};

// Add authentication error handler
const authErrorHandler = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'invalid_token',
      message: 'Invalid authentication token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'token_expired',
      message: 'Authentication token has expired'
    });
  }
  
  next(err);
};

module.exports = {
  authenticate,
  approvedOnly,
  adminOnly,
  authErrorHandler
};
