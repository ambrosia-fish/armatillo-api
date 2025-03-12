const User = require('../models/User');
const { 
  verifyToken,
  extractTokenFromHeader,
  blacklistToken 
} = require('../utils/tokenUtils');

/**
 * Authentication middleware to protect routes
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from header
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Not authorized, no token provided',
        code: 'no_token'
      });
    }
    
    // Verify token including blacklist check
    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'invalid_token'
      });
    }
    
    // Get user from the token (excluding password)
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      // If user doesn't exist, blacklist this token
      await blacklistToken(token, 'access', { 
        reason: 'token_for_nonexistent_user',
        ipAddress: req.ip
      });
      
      return res.status(401).json({ 
        error: 'User not found',
        code: 'user_not_found'
      });
    }
    
    // Attach user to request
    req.user = user;
    
    // Add token to request for potential blacklisting
    req.token = token;
    
    next();
  } catch (error) {
    // Forward token errors to the error handler
    next(error);
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

/**
 * Middleware for handling security incident reports
 */
const securityIncidentHandler = async (req, res, next) => {
  try {
    const { reason, tokenFingerprint } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    // Log security incident
    console.warn(`Security incident reported: ${reason}`);
    console.warn(`IP: ${req.ip}`);
    
    // Store incident details in database (you could add a SecurityIncident model)
    // In a production environment, you would also trigger alerts
    
    // If token fingerprint is provided, add it to the blacklist
    if (tokenFingerprint) {
      // Note: This doesn't use blacklistToken function since we already have the fingerprint
      const BlacklistedToken = require('../models/BlacklistedToken');
      await BlacklistedToken.create({
        tokenFingerprint,
        tokenType: 'access',
        reason,
        ipAddress: req.ip
      });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling security incident:', error);
    res.status(500).json({ error: 'Failed to process security incident' });
  }
};

module.exports = { 
  authenticate, 
  authErrorHandler,
  securityIncidentHandler
};
