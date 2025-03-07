const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const BlacklistedToken = require('../models/BlacklistedToken');

/**
 * Verify JWT token 
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object|null>} Decoded token payload or null if invalid
 */
const verifyToken = async (token) => {
  try {
    // Skip verification if token missing
    if (!token) return null;
    
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      console.log('Rejected blacklisted token');
      return null;
    }
    
    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid token signature');
    } else {
      console.error('Token verification error:', error.message);
    }
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
 * Create a token fingerprint (hash)
 * @param {string} token - Token to hash
 * @returns {string} SHA-256 hash of the token
 */
const createTokenFingerprint = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Check if a token is blacklisted
 * @param {string} token - Token to check
 * @returns {Promise<boolean>} True if token is blacklisted
 */
const isTokenBlacklisted = async (token) => {
  try {
    // Calculate token fingerprint
    const fingerprint = createTokenFingerprint(token);
    
    // Check database for blacklisted token
    const blacklistedToken = await BlacklistedToken.findOne({ tokenFingerprint: fingerprint });
    
    return !!blacklistedToken;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    // Fail closed - if we can't check, assume it might be blacklisted
    return true;
  }
};

/**
 * Add a token to the blacklist
 * @param {string} token - Token to blacklist
 * @param {string} tokenType - Type of token ('access', 'refresh', 'auth_code')
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} True if successfully blacklisted
 */
const blacklistToken = async (token, tokenType, options = {}) => {
  try {
    const { userId, reason = 'security_measure', ipAddress, deviceInfo, expiresAt } = options;
    
    // Calculate token fingerprint
    const fingerprint = createTokenFingerprint(token);
    
    // Get token payload to determine expiry if not provided
    let expiry = expiresAt;
    if (!expiry) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          expiry = new Date(decoded.exp * 1000);
        }
      } catch (e) {
        // If we can't decode, use default expiry
        console.log('Could not extract token expiry');
      }
    }
    
    // Create blacklist entry
    await BlacklistedToken.create({
      tokenFingerprint: fingerprint,
      tokenType,
      userId,
      reason,
      ipAddress,
      deviceInfo,
      expiresAt: expiry
    });
    
    console.log(`Token blacklisted: ${reason}`);
    return true;
  } catch (error) {
    // Handle duplicate token (already blacklisted)
    if (error.code === 11000) {
      console.log('Token already blacklisted');
      return true;
    }
    
    console.error('Error blacklisting token:', error);
    return false;
  }
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

/**
 * Cleanup expired blacklisted tokens
 * This should be run periodically via a scheduled job
 * @returns {Promise<number>} Number of tokens cleaned up
 */
const cleanupBlacklistedTokens = async () => {
  try {
    const now = new Date();
    const result = await BlacklistedToken.deleteMany({ expiresAt: { $lt: now } });
    console.log(`Cleaned up ${result.deletedCount} expired blacklisted tokens`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up blacklisted tokens:', error);
    return 0;
  }
};

/**
 * Extract token details for debugging/auditing (safe version)
 * @param {string} token - JWT token
 * @returns {Object} Safe subset of token data
 */
const getTokenMetadata = (token) => {
  try {
    if (!token) return { valid: false };
    
    // Decode without verification for inspection
    const decoded = jwt.decode(token);
    if (!decoded) return { valid: false };
    
    // Return safe subset of data (no sensitive payload)
    return {
      valid: true,
      issuedAt: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
      fingerprint: createTokenFingerprint(token).substring(0, 16) + '...',
      type: decoded.type || 'access'
    };
  } catch (error) {
    console.error('Error getting token metadata:', error);
    return { valid: false, error: 'Invalid token format' };
  }
};

module.exports = {
  verifyToken,
  generateToken,
  blacklistToken,
  isTokenBlacklisted,
  createTokenFingerprint,
  extractTokenFromHeader,
  cleanupBlacklistedTokens,
  getTokenMetadata
};
