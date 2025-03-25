const jwt = require('jsonwebtoken');

/**
 * Verify JWT token 
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyToken = async (token) => {
  try {
    // Skip verification if token missing
    if (!token) return null;
    
    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
};

/**
 * Generate a JWT token
 * @param {Object} payload - Data to include in the token
 * @param {string} expiresIn - Expiration time (e.g. '1h', '7d')
 * @returns {string} Signed JWT token
 */
const generateToken = (payload, expiresIn = '1h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Extract a token from the Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} The extracted token or null
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

module.exports = {
  verifyToken,
  generateToken,
  extractTokenFromHeader
};