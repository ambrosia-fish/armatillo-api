const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware to protect routes
 */
const authenticate = async (req, res, next) => {
  let token;

  // Check if token exists in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (excluding password)
      req.user = await User.findById(decoded.userId).select('-password');

      next();
    } catch (error) {
      // Forward token errors to the error handler
      return next(error);
    }
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'Not authorized, no token provided',
      code: 'no_token'
    });
  }
};

/**
 * Error handler middleware for authentication errors
 */
const authErrorHandler = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token', 
      code: 'invalid_token' 
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'Token expired', 
      code: 'token_expired' 
    });
  }
  
  next(err);
};

module.exports = { authenticate, authErrorHandler };
