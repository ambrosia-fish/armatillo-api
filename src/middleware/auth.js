const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { extractTokenFromHeader, verifyToken } = require('../utils/tokenUtils');

/**
 * Authentication middleware
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    // Verify token
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Check token type
    if (decoded.type === 'refresh') {
      return res.status(401).json({ 
        error: 'Invalid token type', 
        message: 'Refresh tokens cannot be used for API authentication' 
      });
    }
    
    // Get user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Set user and token info on request
    req.user = user;
    req.token = token;
    req.tokenData = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Error handler for authentication failures
 */
const authErrorHandler = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  next(err);
};

/**
 * Security incident handler middleware
 */
const securityIncidentHandler = (req, res, next) => {
  // Log the IP address for any security-related endpoints
  console.log(`Security endpoint accessed from ${req.ip}`);
  
  // Continue with request
  next();
};

/**
 * Admin check middleware - only allows admins to access certain routes
 */
const adminOnly = (req, res, next) => {
  // Check if user exists and is an admin
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check admin flag on user
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

module.exports = {
  authenticate,
  authErrorHandler,
  securityIncidentHandler,
  adminOnly
};
