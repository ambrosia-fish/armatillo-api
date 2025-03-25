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

const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return next(new AppError('Admin access required', 403));
  }
  
  next();
};

module.exports = {
  authenticate,
  adminOnly
};
